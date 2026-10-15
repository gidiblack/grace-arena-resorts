-- Grace Arena Resorts v1.2 Schema Migration 0003: Functions and Triggers
-- Availability calculation, pricing helpers, booking reference generator, and updated_at triggers

-- 1. Updated_at trigger helper
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger across all applicable tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'resorts', 'buildings', 'room_types', 'rooms',
    'seasonal_prices', 'deals', 'bookings', 'booking_line_items',
    'payments', 'restaurants', 'menu_items', 'facilities', 'gems',
    'event_categories', 'event_inquiries', 'contact_submissions',
    'newsletter_subscribers', 'notify_me_registrations', 'amenities',
    'system_settings', 'media_assets', 'failed_emails'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_timestamp_%I ON public.%I;
      CREATE TRIGGER trg_update_timestamp_%I
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- 2. Alphanumeric 8-char booking reference generator prefixed with GAR-
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes easily confused chars (I, 1, O, 0)
  result TEXT := 'GAR-';
  i INT;
  is_unique BOOLEAN := false;
BEGIN
  WHILE NOT is_unique LOOP
    result := 'GAR-';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Ensure uniqueness in bookings table
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE reference = result) THEN
      is_unique := true;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

-- Trigger to auto-populate reference if null
CREATE OR REPLACE FUNCTION public.handle_booking_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference IS NULL OR trim(NEW.reference) = '' THEN
    NEW.reference := public.generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_reference ON public.bookings;
CREATE TRIGGER trg_booking_reference
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.handle_booking_reference();

-- 3. Calculate nightly price for a room type considering seasonal pricing overrides
CREATE OR REPLACE FUNCTION public.get_effective_nightly_price(
  p_room_type_id UUID,
  p_night DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_seasonal_price INTEGER;
  v_base_price INTEGER;
BEGIN
  -- Look for overlapping seasonal price, latest created_at takes precedence
  SELECT price INTO v_seasonal_price
  FROM public.seasonal_prices
  WHERE room_type_id = p_room_type_id
    AND p_night >= start_date
    AND p_night <= end_date
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_seasonal_price IS NOT NULL THEN
    RETURN v_seasonal_price;
  END IF;

  -- Fallback to base price
  SELECT base_price INTO v_base_price
  FROM public.room_types
  WHERE id = p_room_type_id;

  RETURN COALESCE(v_base_price, 0);
END;
$$;

-- 4. Check available units count for room type within date range
CREATE OR REPLACE FUNCTION public.check_room_availability(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_units INTEGER;
  v_maintenance_units INTEGER := 0;
  v_booked_units INTEGER := 0;
  v_status TEXT;
BEGIN
  -- Check room type status
  SELECT total_units, status INTO v_total_units, v_status
  FROM public.room_types
  WHERE id = p_room_type_id;

  IF v_status = 'under_construction' THEN
    RETURN 0;
  END IF;

  IF v_total_units IS NULL THEN
    RETURN 0;
  END IF;

  -- Count maintenance units
  SELECT COUNT(*) INTO v_maintenance_units
  FROM public.rooms
  WHERE room_type_id = p_room_type_id
    AND status = 'maintenance';

  -- Sum booked units for overlapping date range
  -- Considers confirmed, checked_in, and active pending (< 30 mins hold)
  SELECT COALESCE(SUM(bli.quantity), 0) INTO v_booked_units
  FROM public.booking_line_items bli
  JOIN public.bookings b ON b.id = bli.booking_id
  WHERE bli.room_type_id = p_room_type_id
    AND b.check_in_date < p_check_out
    AND b.check_out_date > p_check_in
    AND (
      b.status IN ('confirmed', 'checked_in')
      OR (b.status = 'pending' AND b.created_at >= (NOW() - INTERVAL '30 minutes'))
    );

  RETURN GREATEST(0, v_total_units - v_maintenance_units - v_booked_units);
END;
$$;
