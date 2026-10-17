/** Media upload rules shared by the admin UI and the API (no server-only imports). */

export const MEDIA_CATEGORIES = [
  "gallery",
  "room",
  "facility",
  "restaurant",
  "event",
  "deal",
] as const;

export const ALLOWED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
] as const;
export type MediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
// 50 MB: the Supabase Free plan's per-upload limit; also the media-public bucket limit (migration 0011)
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function isAllowedMediaMimeType(value: string): value is MediaMimeType {
  return (ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(value);
}

export function maxBytesFor(mimeType: string): number {
  return mimeType === "video/mp4" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

export function formatLimit(mimeType: string): string {
  return mimeType === "video/mp4" ? "50 MB for video" : "10 MB for images";
}
