-- Grace Arena Resorts v1.2 Schema Migration 0006: pg_cron Background Job Schedules
-- Setup pg_cron extension and baseline automated scheduled tasks per SRS & GAP-FIX #17

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Helper function: expire pending bookings older than configured expiry minutes (default 30 mins)
CREATE OR REPLACE FUNCTION public.expire_stale_pending_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expiry_mins INTEGER := 30;
  v_updated_count INTEGER := 0;
BEGIN
  -- Read configured expiry minutes from system settings if present
  SELECT COALESCE(value::integer, 30) INTO v_expiry_mins
  FROM public.system_settings
  WHERE key = 'pending_booking_expiry_minutes';

  UPDATE public.bookings
  SET status = 'cancelled',
      special_requests = COALESCE(special_requests || ' [System: Cancelled due to payment timeout]', '[System: Cancelled due to payment timeout]'),
      updated_at = NOW()
  WHERE status = 'pending'
    AND created_at < (NOW() - (v_expiry_mins || ' minutes')::interval);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- 2. Helper function: deactivate expired deals
CREATE OR REPLACE FUNCTION public.deactivate_expired_deals()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE public.deals
  SET is_active = false,
      updated_at = NOW()
  WHERE is_active = true
    AND end_date < CURRENT_DATE;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- Register schedules in cron.job table if cron is available in environment
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unsched existing jobs to prevent duplicate entries
    PERFORM cron.unschedule('expire-pending-bookings') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-pending-bookings');
    PERFORM cron.unschedule('retry-failed-emails') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retry-failed-emails');
    PERFORM cron.unschedule('deactivate-expired-deals') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'deactivate-expired-deals');

    -- Expire stale pending bookings every 5 minutes
    PERFORM cron.schedule(
      'expire-pending-bookings',
      '*/5 * * * *',
      'SELECT public.expire_stale_pending_bookings();'
    );

    -- Deactivate expired deals daily at midnight UTC
    PERFORM cron.schedule(
      'deactivate-expired-deals',
      '0 0 * * *',
      'SELECT public.deactivate_expired_deals();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Allow migration to proceed gracefully in environments where pg_cron cannot be scheduled locally
    RAISE NOTICE 'pg_cron schedule setup deferred or unavailable: %', SQLERRM;
END;
$$;
