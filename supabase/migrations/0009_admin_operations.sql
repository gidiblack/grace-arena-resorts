-- Grace Arena Resorts Migration 0009: Admin Operations, Unit Assignment, Offline Payments, and Manual Refunds
-- See plans/gar-srs-implementation/plan-v1.2-corrected.md (Step 12A) and GAR-SRS v1.4

-- ============================================================================
-- 1. Bookings: cancellation reasons, actors, and status auditing columns
-- ============================================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_cancellation_reason_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_cancellation_reason_check
  CHECK (cancellation_reason IN ('guest_request', 'admin_cancelled', 'payment_timeout', 'payment_after_expiry'));

-- Backfill existing payment-timeout rows
UPDATE public.bookings
SET cancellation_reason = 'payment_timeout',
    cancelled_at = COALESCE(cancelled_at, updated_at)
WHERE status = 'cancelled'
  AND special_requests LIKE '%[System: Cancelled due to payment timeout]%'
  AND cancellation_reason IS NULL;

-- Update expire_stale_pending_bookings to set cancellation_reason cleanly
CREATE OR REPLACE FUNCTION public.expire_stale_pending_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE public.bookings
  SET status = 'cancelled',
      cancellation_reason = 'payment_timeout',
      cancelled_at = NOW(),
      status_changed_by = NULL,
      updated_at = NOW()
  WHERE status = 'pending'
    AND COALESCE(hold_expires_at, created_at + INTERVAL '30 minutes') < NOW();

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- ============================================================================
-- 2. Booking Status History and Trigger
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking
  ON public.booking_status_history(booking_id, created_at ASC);

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view booking status history" ON public.booking_status_history;
CREATE POLICY "Staff view booking status history"
  ON public.booking_status_history FOR SELECT
  USING (
    public.is_content_manager() OR EXISTS (
      SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note, created_at)
    VALUES (NEW.id, NULL, NEW.status, NEW.status_changed_by, NEW.cancellation_reason, NOW());
  ELSIF (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
    INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note, created_at)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.status_changed_by, NEW.cancellation_reason, NOW());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_status_history ON public.bookings;
CREATE TRIGGER trg_booking_status_history
AFTER INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();

-- Backfill initial history for existing bookings
INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_by, note, created_at)
SELECT b.id, NULL, b.status, b.status_changed_by, b.cancellation_reason, b.created_at
FROM public.bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_status_history h WHERE h.booking_id = b.id
);

-- ============================================================================
-- 3. Room Assignments: Track individual unit occupancy per stay
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.booking_room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_line_item_id UUID NOT NULL REFERENCES public.booking_line_items(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_room_assignment
  ON public.booking_room_assignments(room_id) WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_booking_room_assignments_booking
  ON public.booking_room_assignments(booking_id);

ALTER TABLE public.booking_room_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage booking room assignments" ON public.booking_room_assignments;
CREATE POLICY "Admins manage booking room assignments"
  ON public.booking_room_assignments FOR ALL
  USING (public.is_resort_admin());

DROP POLICY IF EXISTS "Staff read booking room assignments" ON public.booking_room_assignments;
CREATE POLICY "Staff read booking room assignments"
  ON public.booking_room_assignments FOR SELECT
  USING (public.is_content_manager());

-- ============================================================================
-- 4. Payments: offline gateways, refund_failed status, and manual refund tracking
-- ============================================================================
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'success', 'failed', 'refund_pending', 'refunded', 'partially_refunded', 'refund_failed'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_gateway_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_gateway_check
  CHECK (gateway IN ('paystack', 'cash', 'pos', 'bank_transfer'));

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_method TEXT CHECK (refund_method IN ('paystack', 'bank_transfer', 'cash', 'pos_reversal')),
  ADD COLUMN IF NOT EXISTS refund_reference TEXT,
  ADD COLUMN IF NOT EXISTS refund_processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refund_note TEXT;

-- ============================================================================
-- 5. RPCs: Check-in, Check-out, and Offline Payment
-- ============================================================================

-- Check in booking atomically assigning units and updating room statuses
CREATE OR REPLACE FUNCTION public.check_in_booking(
  p_booking_id UUID,
  p_assignments JSONB,
  p_actor UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_item JSONB;
  v_room_id UUID;
  v_line_item_id UUID;
  v_room_status TEXT;
  v_room_type_id UUID;
  v_line_item_room_type_id UUID;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.status != 'confirmed' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION' USING DETAIL = 'Booking must be in confirmed status to check in';
  END IF;

  IF p_assignments IS NULL OR jsonb_array_length(p_assignments) = 0 THEN
    RAISE EXCEPTION 'MISSING_ASSIGNMENTS' USING DETAIL = 'At least one room unit assignment is required';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    v_room_id := (v_item ->> 'room_id')::uuid;
    v_line_item_id := (v_item ->> 'booking_line_item_id')::uuid;

    SELECT room_type_id INTO v_line_item_room_type_id
    FROM public.booking_line_items
    WHERE id = v_line_item_id AND booking_id = p_booking_id;

    IF v_line_item_room_type_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_LINE_ITEM' USING DETAIL = v_line_item_id::text;
    END IF;

    SELECT status, room_type_id INTO v_room_status, v_room_type_id
    FROM public.rooms
    WHERE id = v_room_id
    FOR UPDATE;

    IF v_room_status IS NULL THEN
      RAISE EXCEPTION 'ROOM_NOT_FOUND' USING DETAIL = v_room_id::text;
    END IF;

    IF v_room_type_id != v_line_item_room_type_id THEN
      RAISE EXCEPTION 'ROOM_TYPE_MISMATCH' USING DETAIL = v_room_id::text;
    END IF;

    IF v_room_status != 'available' THEN
      RAISE EXCEPTION 'ROOM_NOT_AVAILABLE' USING DETAIL = v_room_id::text;
    END IF;

    INSERT INTO public.booking_room_assignments (
      booking_id, booking_line_item_id, room_id, assigned_by, assigned_at
    )
    VALUES (
      p_booking_id, v_line_item_id, v_room_id, p_actor, NOW()
    );

    UPDATE public.rooms
    SET status = 'occupied', updated_at = NOW()
    WHERE id = v_room_id;
  END LOOP;

  UPDATE public.bookings
  SET status = 'checked_in',
      status_changed_by = p_actor,
      updated_at = NOW()
  WHERE id = p_booking_id;
END;
$$;

-- Check out booking atomically releasing unit assignments and updating room statuses
CREATE OR REPLACE FUNCTION public.check_out_booking(
  p_booking_id UUID,
  p_actor UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_assignment RECORD;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.status != 'checked_in' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION' USING DETAIL = 'Booking must be in checked_in status to check out';
  END IF;

  FOR v_assignment IN
    SELECT bra.id, bra.room_id
    FROM public.booking_room_assignments bra
    WHERE bra.booking_id = p_booking_id
      AND bra.released_at IS NULL
  LOOP
    UPDATE public.booking_room_assignments
    SET released_at = NOW()
    WHERE id = v_assignment.id;

    UPDATE public.rooms
    SET status = 'available', updated_at = NOW()
    WHERE id = v_assignment.room_id
      AND status = 'occupied';
  END LOOP;

  UPDATE public.bookings
  SET status = 'checked_out',
      status_changed_by = p_actor,
      updated_at = NOW()
  WHERE id = p_booking_id;
END;
$$;

-- Record offline payment (bank transfer, cash, POS) and confirm booking atomically
CREATE OR REPLACE FUNCTION public.record_offline_payment(
  p_booking_id UUID,
  p_method TEXT,
  p_amount INTEGER,
  p_reference TEXT,
  p_paid_at TIMESTAMPTZ,
  p_note TEXT,
  p_actor UUID
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings;
  v_payment public.payments;
BEGIN
  IF p_method NOT IN ('bank_transfer', 'cash', 'pos') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD' USING DETAIL = p_method;
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.status != 'pending' THEN
    RAISE EXCEPTION 'INVALID_BOOKING_STATUS' USING DETAIL = v_booking.status;
  END IF;

  IF COALESCE(v_booking.hold_expires_at, v_booking.created_at + INTERVAL '30 minutes') < NOW() THEN
    RAISE EXCEPTION 'BOOKING_HOLD_EXPIRED';
  END IF;

  IF v_booking.total != p_amount THEN
    RAISE EXCEPTION 'AMOUNT_MISMATCH' USING DETAIL = 'Booking total does not match payment amount';
  END IF;

  INSERT INTO public.payments (
    booking_id,
    gateway,
    gateway_reference,
    amount,
    currency,
    status,
    paid_at,
    metadata
  )
  VALUES (
    p_booking_id,
    p_method,
    p_reference,
    p_amount,
    'NGN',
    'success',
    COALESCE(p_paid_at, NOW()),
    jsonb_build_object('recorded_by', p_actor, 'note', p_note)
  )
  RETURNING * INTO v_payment;

  UPDATE public.bookings
  SET status = 'confirmed',
      hold_expires_at = NULL,
      status_changed_by = p_actor,
      updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN v_payment;
END;
$$;

-- Revoke execute from public/anon and grant to service_role and authenticated
REVOKE EXECUTE ON FUNCTION public.check_in_booking(UUID, JSONB, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_out_booking(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_offline_payment(UUID, TEXT, INTEGER, TEXT, TIMESTAMPTZ, TEXT, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.check_in_booking(UUID, JSONB, UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.check_out_booking(UUID, UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.record_offline_payment(UUID, TEXT, INTEGER, TEXT, TIMESTAMPTZ, TEXT, UUID) TO service_role, authenticated;

-- ============================================================================
-- 5. Analytics & Dashboard Functions
-- ============================================================================

-- Daily occupancy rates excluding under_construction room types and maintenance units
CREATE OR REPLACE FUNCTION public.get_daily_occupancy_rates(p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  stay_date DATE,
  occupied_units INTEGER,
  total_bookable_units INTEGER,
  occupancy_rate NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bookable INTEGER;
BEGIN
  -- Count total bookable units: room types must be 'available' and room unit must not be 'maintenance'
  SELECT COUNT(*)::INTEGER INTO v_bookable
  FROM public.rooms r
  JOIN public.room_types rt ON r.room_type_id = rt.id
  WHERE rt.status = 'available'
    AND r.status != 'maintenance';

  RETURN QUERY
  WITH dates AS (
    SELECT d::DATE AS cur_date
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d
  ),
  daily_counts AS (
    SELECT
      dt.cur_date,
      COALESCE(SUM(bli.quantity), 0)::INTEGER AS occupied
    FROM dates dt
    LEFT JOIN public.bookings b
      ON b.status IN ('confirmed', 'checked_in', 'checked_out')
     AND b.check_in_date <= dt.cur_date
     AND b.check_out_date > dt.cur_date
    LEFT JOIN public.booking_line_items bli
      ON bli.booking_id = b.id
    GROUP BY dt.cur_date
  )
  SELECT
    dc.cur_date,
    dc.occupied,
    v_bookable,
    CASE 
      WHEN v_bookable > 0 THEN ROUND((dc.occupied::NUMERIC / v_bookable::NUMERIC) * 100, 1)
      ELSE 0::NUMERIC
    END
  FROM daily_counts dc
  ORDER BY dc.cur_date ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_daily_occupancy_rates(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_occupancy_rates(DATE, DATE) TO service_role, authenticated;

