-- Grace Arena Resorts Migration 0008: Guest checkout, email retry queue, single-query availability
-- See plans/gar-srs-implementation/m2-followup-fix-plan.md (R1, T2, T4) and GAR-SRS v1.3

-- ============================================================================
-- 1. Booking channel and privacy consent (guest checkout)
-- ============================================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'online_account'
    CHECK (channel IN ('online_guest', 'online_account', 'walk_in'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS privacy_consent_at TIMESTAMPTZ;

-- Existing bookings without an owner were created by admins for walk-in guests
UPDATE public.bookings SET channel = 'walk_in' WHERE user_id IS NULL AND channel = 'online_account';

CREATE INDEX IF NOT EXISTS idx_bookings_unowned_guest_email
  ON public.bookings (lower(guest_email)) WHERE user_id IS NULL;

-- ============================================================================
-- 2. Booking access tokens ("Manage booking" links) reuse the hashed token table
-- ============================================================================
ALTER TABLE public.auth_tokens ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE public.auth_tokens ADD CONSTRAINT auth_tokens_purpose_check
  CHECK (purpose IN ('email_verification', 'password_reset', 'newsletter_confirm', 'newsletter_unsubscribe', 'booking_access'));
CREATE INDEX IF NOT EXISTS idx_auth_tokens_booking ON public.auth_tokens(booking_id) WHERE booking_id IS NOT NULL;

-- ============================================================================
-- 3. Failed email retry queue (T2)
-- ============================================================================
ALTER TABLE public.failed_emails ADD COLUMN IF NOT EXISTS retry_handler TEXT;
ALTER TABLE public.failed_emails ADD COLUMN IF NOT EXISTS retry_params JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.failed_emails ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;
ALTER TABLE public.failed_emails ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_failed_emails_due
  ON public.failed_emails(next_attempt_at) WHERE sent_at IS NULL;

-- ============================================================================
-- 4. Atomic booking creation: channel, consent, and live-hold cap per email
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_booking_with_lock(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, UUID, JSONB);

-- Raises 'INSUFFICIENT_AVAILABILITY' (DETAIL '<room_type_id>:<available>') or 'TOO_MANY_PENDING_HOLDS'.
CREATE OR REPLACE FUNCTION public.create_booking_with_lock(
  p_reference TEXT,
  p_user_id UUID,
  p_status TEXT,
  p_channel TEXT,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_check_in DATE,
  p_check_out DATE,
  p_nights INTEGER,
  p_adults INTEGER,
  p_children INTEGER,
  p_special_requests TEXT,
  p_subtotal INTEGER,
  p_deal_discount INTEGER,
  p_tax INTEGER,
  p_total INTEGER,
  p_deal_id UUID,
  p_privacy_consent_at TIMESTAMPTZ,
  p_line_items JSONB,
  p_max_pending_holds INTEGER DEFAULT 3
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_available INTEGER;
  v_live_holds INTEGER;
  v_booking public.bookings;
BEGIN
  IF p_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'INVALID_INITIAL_STATUS';
  END IF;

  IF jsonb_array_length(p_line_items) = 0 THEN
    RAISE EXCEPTION 'NO_LINE_ITEMS';
  END IF;

  -- Serialize concurrent bookings for the same room types (consistent lock order prevents deadlocks)
  PERFORM 1
  FROM public.room_types
  WHERE id IN (SELECT (li ->> 'room_type_id')::uuid FROM jsonb_array_elements(p_line_items) li)
  ORDER BY id
  FOR UPDATE;

  -- Anti-abuse: an email may hold at most p_max_pending_holds unpaid reservations at once
  IF p_status = 'pending' THEN
    SELECT COUNT(*) INTO v_live_holds
    FROM public.bookings
    WHERE lower(guest_email) = lower(p_guest_email)
      AND status = 'pending'
      AND hold_expires_at > NOW();

    IF v_live_holds >= p_max_pending_holds THEN
      RAISE EXCEPTION 'TOO_MANY_PENDING_HOLDS' USING DETAIL = v_live_holds::text;
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
  LOOP
    v_available := public.check_room_availability((v_item ->> 'room_type_id')::uuid, p_check_in, p_check_out);
    IF v_available < (v_item ->> 'quantity')::integer THEN
      RAISE EXCEPTION 'INSUFFICIENT_AVAILABILITY'
        USING DETAIL = (v_item ->> 'room_type_id') || ':' || v_available;
    END IF;
  END LOOP;

  INSERT INTO public.bookings (
    reference, user_id, guest_name, guest_email, guest_phone, check_in_date, check_out_date,
    nights, adults, children, special_requests, subtotal, deal_discount, tax, total, status,
    deal_id, hold_expires_at, channel, privacy_consent_at
  )
  VALUES (
    p_reference, p_user_id, p_guest_name, p_guest_email, p_guest_phone, p_check_in, p_check_out,
    p_nights, p_adults, p_children, p_special_requests, p_subtotal, p_deal_discount, p_tax, p_total, p_status,
    p_deal_id,
    CASE WHEN p_status = 'pending' THEN NOW() + make_interval(mins => public.booking_hold_minutes()) END,
    p_channel,
    p_privacy_consent_at
  )
  RETURNING * INTO v_booking;

  INSERT INTO public.booking_line_items (booking_id, room_type_id, quantity, unit_price, line_total)
  SELECT
    v_booking.id,
    (li ->> 'room_type_id')::uuid,
    (li ->> 'quantity')::integer,
    (li ->> 'unit_price')::integer,
    (li ->> 'line_total')::integer
  FROM jsonb_array_elements(p_line_items) li;

  RETURN v_booking;
END;
$$;

-- ============================================================================
-- 5. Link unowned guest bookings to a verified account with the same email
-- ============================================================================
CREATE OR REPLACE FUNCTION public.link_guest_bookings(p_user_id UUID, p_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linked INTEGER := 0;
BEGIN
  -- Only verified accounts may claim bookings by email
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND lower(email) = lower(p_email) AND is_email_verified = true
  ) THEN
    RETURN 0;
  END IF;

  UPDATE public.bookings
  SET user_id = p_user_id, updated_at = NOW()
  WHERE user_id IS NULL
    AND channel = 'online_guest'
    AND lower(guest_email) = lower(p_email);

  GET DIAGNOSTICS v_linked = ROW_COUNT;
  RETURN v_linked;
END;
$$;

-- ============================================================================
-- 6. Single-query stay availability (T4): one round-trip instead of five
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_stay_availability(
  p_check_in DATE,
  p_check_out DATE,
  p_resort TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  tier TEXT,
  base_price INTEGER,
  max_guests INTEGER,
  total_units INTEGER,
  status TEXT,
  images JSONB,
  building_name TEXT,
  resort_slug TEXT,
  resort_name TEXT,
  available_units INTEGER,
  seasonal_prices JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH booked AS (
    SELECT bli.room_type_id, SUM(bli.quantity)::int AS units
    FROM public.booking_line_items bli
    JOIN public.bookings b ON b.id = bli.booking_id
    WHERE b.check_in_date < p_check_out
      AND b.check_out_date > p_check_in
      AND (b.status IN ('confirmed', 'checked_in') OR (b.status = 'pending' AND b.hold_expires_at > NOW()))
    GROUP BY bli.room_type_id
  ),
  maintenance AS (
    SELECT room_type_id, COUNT(*)::int AS units
    FROM public.rooms
    WHERE status = 'maintenance'
    GROUP BY room_type_id
  )
  SELECT
    rt.id, rt.slug, rt.name, rt.tier, rt.base_price, rt.max_guests, rt.total_units, rt.status, rt.images,
    bd.name, rs.slug, rs.name,
    CASE WHEN rt.status = 'under_construction' THEN 0
         ELSE GREATEST(0, rt.total_units - COALESCE(bk.units, 0) - COALESCE(mt.units, 0)) END,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'start_date', sp.start_date, 'end_date', sp.end_date, 'price', sp.price, 'created_at', sp.created_at))
      FROM public.seasonal_prices sp
      WHERE sp.room_type_id = rt.id AND sp.start_date <= p_check_out AND sp.end_date >= p_check_in
    ), '[]'::jsonb)
  FROM public.room_types rt
  JOIN public.buildings bd ON bd.id = rt.building_id
  JOIN public.resorts rs ON rs.id = bd.resort_id
  LEFT JOIN booked bk ON bk.room_type_id = rt.id
  LEFT JOIN maintenance mt ON mt.room_type_id = rt.id
  WHERE p_resort IS NULL OR rs.slug = p_resort
  ORDER BY rt.base_price;
$$;

-- ============================================================================
-- 7. Grants: internal functions are service-role only
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.create_booking_with_lock(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, UUID, TIMESTAMPTZ, JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_guest_bookings(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_stay_availability(DATE, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_with_lock(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, UUID, TIMESTAMPTZ, JSONB, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_guest_bookings(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_stay_availability(DATE, DATE, TEXT) TO service_role;
