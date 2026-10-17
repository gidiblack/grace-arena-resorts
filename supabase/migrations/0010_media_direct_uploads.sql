-- Grace Arena Resorts Migration 0010: direct-to-storage media uploads
-- Media files now upload from the browser straight to Storage with a signed upload URL issued by
-- POST /api/v1/media/upload-url, instead of travelling through the API as base64 JSON.
--
-- media-public bucket:
--   * file_size_limit 10 MB -> 100 MB so MP4 videos fit (images stay capped at 10 MB by the API)
--   * allowed types match the API allow-list; SVG is removed (it can carry script and the admin
--     never accepted it)
-- Note: the project-wide Storage upload limit (Dashboard > Storage > Settings) must also be at
-- least 100 MB, or larger videos are rejected before this bucket limit applies.

UPDATE storage.buckets
SET
  file_size_limit = 104857600, -- 100 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4']
WHERE id = 'media-public';
