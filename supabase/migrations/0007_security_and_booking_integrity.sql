-- Grace Arena Resorts Migration 0007: Security & Booking Integrity Fixes (M1/M2 audit, 2026-10-15)
-- See plans/gar-srs-implementation/m1-m2-audit-fix-plan.md (findings A1, A6, B1–B7, C2–C5, D1–D3)

-- ============================================================================
-- 1. Supabase Auth is the single password store (A6)
-- ============================================================================
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- Profile rows are created by trigger from auth.users so the two can never drift (A1).
-- Role is ALWAYS 'guest' here: user metadata is user-controlled and must never grant privileges.
-- is_email_verified starts false: public.users.is_email_verified (set by POST /api/v1/auth/verify-email) is the
-- source of truth; Supabase Auth users are created pre-confirmed so unverified guests can sign in but not book.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role, is_email_verified)
  VALUES (
    NEW.id,
    lower(NEW.email),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    'guest',
    false
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill profiles for any auth users created before this trigger existed (orphans from failed registrations)
INSERT INTO public.users (id, email, full_name, phone, role, is_email_verified)
SELECT
  au.id,
  lower(au.email),
  COALESCE(NULLIF(au.raw_user_meta_data ->> 'full_name', ''), split_part(au.email, '@', 1)),
  NULLIF(au.raw_user_meta_data ->> 'phone', ''),
  'guest',
  false
FROM auth.users au
WHERE au.email IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. Role resolution reads public.users, not the JWT Postgres role claim (B1)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid() AND is_locked = false),
    'anon'
  );
$$;

-- ============================================================================
-- 3. Users: no self-insert, and guests may only edit name/phone (B2)
-- ============================================================================
DROP POLICY IF EXISTS "Allow user registration or super admin creation" ON public.users;
DROP POLICY IF EXISTS "Super admin creates users" ON public.users;
CREATE POLICY "Super admin creates users"
  ON public.users FOR INSERT
  WITH CHECK (public.is_super_admin());

REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon;
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (full_name, phone) ON public.users TO authenticated;

-- ============================================================================
-- 4. Bookings / line items / payments are written only by the API (service role) or admins (B3, B4)
-- ============================================================================
DROP POLICY IF EXISTS "Guests insert own pending booking or admins insert any" ON public.bookings;
DROP POLICY IF EXISTS "Guests cancel own booking or admins manage booking status" ON public.bookings;
DROP POLICY IF EXISTS "Admins insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins update bookings" ON public.bookings;
CREATE POLICY "Admins insert bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (public.is_resort_admin());
CREATE POLICY "Admins update bookings"
  ON public.bookings FOR UPDATE
  USING (public.is_resort_admin());

DROP POLICY IF EXISTS "Insert booking line items" ON public.booking_line_items;

DROP POLICY IF EXISTS "Create payments for bookings" ON public.payments;
DROP POLICY IF EXISTS "Admins insert payments" ON public.payments;
CREATE POLICY "Admins insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (public.is_resort_admin());

-- ============================================================================
-- 5. Newsletter list is not publicly readable/writable (B5)
-- ============================================================================
DROP POLICY IF EXISTS "Public subscribe and unsubscribe newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Content managers view newsletter subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Super admin manages newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Content managers view newsletter subscribers"
  ON public.newsletter_subscribers FOR SELECT
  USING (public.is_content_manager());
CREATE POLICY "Super admin manages newsletter subscribers"
  ON public.newsletter_subscribers FOR ALL
  USING (public.is_super_admin());

-- ============================================================================
-- 6. Single-use hashed tokens for email verification, password reset, newsletter (A2, A5, F2)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('email_verification', 'password_reset', 'newsletter_confirm', 'newsletter_unsubscribe')),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_lookup ON public.auth_tokens(purpose, email);
ALTER TABLE public.auth_tokens ENABLE ROW LEVEL SECURITY; -- no policies: service role only

-- ============================================================================
-- 7. Webhook idempotency ledger (C4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_key)
);
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view webhook events" ON public.webhook_events;
CREATE POLICY "Admins view webhook events"
  ON public.webhook_events FOR SELECT
  USING (public.is_resort_admin());
DROP TRIGGER IF EXISTS trg_update_timestamp_webhook_events ON public.webhook_events;
CREATE TRIGGER trg_update_timestamp_webhook_events
BEFORE UPDATE ON public.webhook_events
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 8. Payments: refund_pending status, exact gateway reference matching (C1, C3)
-- ============================================================================
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'success', 'failed', 'refund_pending', 'refunded', 'partially_refunded'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_gateway_reference
  ON public.payments(gateway, gateway_reference) WHERE gateway_reference IS NOT NULL;

-- ============================================================================
-- 9. Per-booking inventory hold (B6, D3): one source of truth for hold expiry
-- ============================================================================
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;
UPDATE public.bookings
SET hold_expires_at = created_at + INTERVAL '30 minutes'
WHERE status = 'pending' AND hold_expires_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_pending_hold ON public.bookings(hold_expires_at) WHERE status = 'pending';

-- Hold length for NEW bookings: 120 min while payment-gateway downtime mode is on, else the configured expiry.
CREATE OR REPLACE FUNCTION public.booking_hold_minutes()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE((SELECT value FROM public.system_settings WHERE key = 'paystack_downtime'), 'false')
         IN ('true', '1', 'active') THEN 120
    ELSE COALESCE(
      (SELECT NULLIF(value, '')::integer FROM public.system_settings WHERE key = 'pending_booking_expiry_minutes'),
      30
    )
  END;
$$;

-- Availability: excludes maintenance units and only counts pending bookings whose hold is still live
CREATE OR REPLACE FUNCTION public.check_room_availability(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_units INTEGER;
  v_maintenance_units INTEGER := 0;
  v_booked_units INTEGER := 0;
  v_status TEXT;
BEGIN
  SELECT total_units, status INTO v_total_units, v_status
  FROM public.room_types
  WHERE id = p_room_type_id;

  IF v_total_units IS NULL OR v_status = 'under_construction' THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_maintenance_units
  FROM public.rooms
  WHERE room_type_id = p_room_type_id
    AND status = 'maintenance';

  SELECT COALESCE(SUM(bli.quantity), 0) INTO v_booked_units
  FROM public.booking_line_items bli
  JOIN public.bookings b ON b.id = bli.booking_id
  WHERE bli.room_type_id = p_room_type_id
    AND b.check_in_date < p_check_out
    AND b.check_out_date > p_check_in
    AND (
      b.status IN ('confirmed', 'checked_in')
      OR (b.status = 'pending' AND b.hold_expires_at > NOW())
    );

  RETURN GREATEST(0, v_total_units - v_maintenance_units - v_booked_units);
END;
$$;

-- ============================================================================
-- 10. Atomic booking creation with inventory lock (D1, D2)
-- ============================================================================
-- p_line_items: [{"room_type_id": uuid, "quantity": int, "unit_price": int, "line_total": int}, ...]
-- Raises 'INSUFFICIENT_AVAILABILITY' (SQLSTATE P0001) with DETAIL '<room_type_id>:<available>' on conflict.
CREATE OR REPLACE FUNCTION public.create_booking_with_lock(
  p_reference TEXT,
  p_user_id UUID,
  p_status TEXT,
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
  p_line_items JSONB
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_available INTEGER;
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
    deal_id, hold_expires_at
  )
  VALUES (
    p_reference, p_user_id, p_guest_name, p_guest_email, p_guest_phone, p_check_in, p_check_out,
    p_nights, p_adults, p_children, p_special_requests, p_subtotal, p_deal_discount, p_tax, p_total, p_status,
    p_deal_id,
    CASE WHEN p_status = 'pending' THEN NOW() + make_interval(mins => public.booking_hold_minutes()) END
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
-- 11. Pending-booking expiry uses each booking's own hold (B6)
-- ============================================================================
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
      special_requests = COALESCE(special_requests || ' ', '') || '[System: Cancelled due to payment timeout]',
      updated_at = NOW()
  WHERE status = 'pending'
    AND COALESCE(hold_expires_at, created_at + INTERVAL '30 minutes') < NOW();

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- ============================================================================
-- 12. Internal functions are not callable through PostgREST by anon/authenticated users
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.create_booking_with_lock(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_pending_bookings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deactivate_expired_deals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_with_lock(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_stale_pending_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION public.deactivate_expired_deals() TO service_role;

-- ============================================================================
-- 13. Notify-me duplicate suppression is case-insensitive (F3)
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_notify_me_room_email_ci
  ON public.notify_me_registrations(room_type_id, lower(email));

-- ============================================================================
-- 14. Event inquiries: date and headcount are optional on the public form (F1)
-- ============================================================================
ALTER TABLE public.event_inquiries ALTER COLUMN preferred_date DROP NOT NULL;
ALTER TABLE public.event_inquiries ALTER COLUMN estimated_guests DROP NOT NULL;
