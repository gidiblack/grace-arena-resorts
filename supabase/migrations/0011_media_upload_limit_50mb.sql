-- Grace Arena Resorts Migration 0011: cap media uploads at 50 MB
-- Supabase's Free plan limits every upload to 50 MB project-wide, so the 100 MB media-public limit
-- set in 0010 could never be reached. Match the bucket to the plan; the API enforces the same cap
-- for MP4 videos (images stay at 10 MB). Raise both together if the project moves to a paid plan.

UPDATE storage.buckets
SET file_size_limit = 52428800 -- 50 MB
WHERE id = 'media-public';
