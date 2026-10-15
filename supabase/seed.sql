-- Grace Arena Resorts Seed Data for Local Development and Staging
-- Reference data (resorts, rooms, deals, settings) lives in migration 0004; this file only adds demo/QA data.

-- 1. Demo Staff & Guest Accounts
-- Created in auth.users (password for all: 'Password123!'); the on_auth_user_created trigger (migration 0007)
-- creates the matching public.users profile as a verified-email guest, and roles are elevated below.
DO $$
DECLARE
  demo RECORD;
BEGIN
  FOR demo IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0000-000000000001'::uuid, 'superadmin@gracearenaresorts.com', 'Chief Executive Officer', '+2348011112222', 'super_admin'),
      ('00000000-0000-0000-0000-000000000002'::uuid, 'admin@gracearenaresorts.com', 'Resort General Manager', '+2348033334444', 'resort_admin'),
      ('00000000-0000-0000-0000-000000000003'::uuid, 'content@gracearenaresorts.com', 'Media & Content Lead', '+2348055556666', 'content_manager'),
      ('00000000-0000-0000-0000-000000000004'::uuid, 'guest@example.com', 'Dr. Samuel Adebayo', '+2348077778888', 'guest')
    ) AS t(id, email, full_name, phone, role)
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', demo.id, 'authenticated', 'authenticated', demo.email,
      extensions.crypt('Password123!', extensions.gen_salt('bf', 12)), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', demo.full_name, 'phone', demo.phone),
      NOW(), NOW(), '', '', '', ''
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      demo.id, demo.id, demo.id::text,
      jsonb_build_object('sub', demo.id::text, 'email', demo.email, 'email_verified', true),
      'email', NOW(), NOW(), NOW()
    )
    ON CONFLICT DO NOTHING;

    UPDATE public.users
    SET role = demo.role, is_email_verified = true
    WHERE id = demo.id;
  END LOOP;
END;
$$;

-- 2. Seasonal Pricing (Christmas & New Year peak)
INSERT INTO public.seasonal_prices (room_type_id, start_date, end_date, price, label)
VALUES
  ('44444444-4444-4444-4444-444444444401', '2026-12-15', '2027-01-05', 70000, 'Christmas & New Year Peak'),
  ('44444444-4444-4444-4444-444444444402', '2026-12-15', '2027-01-05', 80000, 'Christmas & New Year Peak'),
  ('44444444-4444-4444-4444-444444444407', '2026-12-15', '2027-01-05', 115000, 'Christmas & New Year Peak')
ON CONFLICT DO NOTHING;
