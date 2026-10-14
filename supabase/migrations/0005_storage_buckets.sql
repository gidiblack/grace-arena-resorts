-- Grace Arena Resorts v1.2 Schema Migration 0005: Storage Buckets Setup
-- Setup storage buckets 'media-public' and 'confirmations' with access policies per SRS Section 5.3 & GAP-FIX #16

-- Insert buckets into storage.buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'media-public',
    'media-public',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'video/mp4']
  ),
  (
    'confirmations',
    'confirmations',
    false,
    5242880, -- 5MB limit
    ARRAY['application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 1. media-public policies
DROP POLICY IF EXISTS "Public can view media-public objects" ON storage.objects;
CREATE POLICY "Public can view media-public objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-public');

DROP POLICY IF EXISTS "Staff can upload to media-public" ON storage.objects;
CREATE POLICY "Staff can upload to media-public"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media-public'
    AND (public.is_content_manager())
  );

DROP POLICY IF EXISTS "Staff can update media-public objects" ON storage.objects;
CREATE POLICY "Staff can update media-public objects"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'media-public'
    AND (public.is_content_manager())
  );

DROP POLICY IF EXISTS "Staff can delete media-public objects" ON storage.objects;
CREATE POLICY "Staff can delete media-public objects"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media-public'
    AND (public.is_content_manager())
  );

-- 2. confirmations bucket policies (PDF confirmations and receipts)
DROP POLICY IF EXISTS "Guests read own booking confirmations or admins read all" ON storage.objects;
CREATE POLICY "Guests read own booking confirmations or admins read all"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'confirmations'
    AND (
      public.is_resort_admin()
      OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.user_id = auth.uid()
            AND storage.objects.name LIKE (b.reference || '%')
        )
      )
    )
  );

DROP POLICY IF EXISTS "System and admins insert confirmations" ON storage.objects;
CREATE POLICY "System and admins insert confirmations"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'confirmations'
    AND (public.is_resort_admin() OR auth.role() = 'service_role')
  );
