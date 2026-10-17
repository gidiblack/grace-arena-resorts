import crypto from "node:crypto";
import { sniffMimeType } from "@/lib/security/file-signature";
import type { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { MediaCategory } from "@/types/db";
import { MEDIA_CATEGORIES, formatLimit, maxBytesFor, type MediaMimeType } from "./media-rules";

/**
 * Media uploads go straight from the browser to Supabase Storage with a signed upload URL
 * (POST /api/v1/media/upload-url), then are registered with POST /api/v1/media, which checks the
 * stored bytes before creating the media_assets row.
 */

export const MEDIA_BUCKET = "media-public";

export {
  MEDIA_CATEGORIES,
  ALLOWED_MEDIA_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  isAllowedMediaMimeType,
  maxBytesFor,
  formatLimit,
} from "./media-rules";
export type { MediaMimeType } from "./media-rules";

const SAFE_NAME_MAX = 80;

/** Server-chosen object path: `<category>/<timestamp>-<random>-<sanitised file name>` */
export function buildMediaStoragePath(category: MediaCategory, fileName: string): string {
  const safeName =
    fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/\.{2,}/g, ".")
      .replace(/^[._]+/, "")
      .slice(-SAFE_NAME_MAX) || "file";
  return `${category}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName}`;
}

const STORAGE_PATH_PATTERN = new RegExp(
  `^(${MEDIA_CATEGORIES.join("|")})/\\d{13}-[0-9a-f]{12}-[A-Za-z0-9._-]{1,${SAFE_NAME_MAX}}$`
);

/** True only for paths issued by buildMediaStoragePath in the given category */
export function isIssuedMediaPath(path: string, category: MediaCategory): boolean {
  return STORAGE_PATH_PATTERN.test(path) && path.startsWith(`${category}/`) && !path.includes("..");
}

/** Object path for a public URL in the media bucket, or null for files hosted elsewhere */
export function mediaPathFromPublicUrl(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  url: string
): string | null {
  const base = supabase.storage.from(MEDIA_BUCKET).getPublicUrl("").data.publicUrl;
  const prefix = base.endsWith("/") ? base : `${base}/`;
  if (!url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
  return path && !path.includes("..") ? path : null;
}

const HEAD_BYTES = 64;

/** Reads the first bytes of a public object without downloading the whole file. */
async function readObjectHead(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { Range: `bytes=0-${HEAD_BYTES - 1}` } });
  if (!res.ok || !res.body) throw new Error(`Failed to read stored object (${res.status})`);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < HEAD_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    received += value.length;
  }
  await reader.cancel().catch(() => {});
  const head = new Uint8Array(Math.min(received, HEAD_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, head.length - offset);
    head.set(slice, offset);
    offset += slice.length;
    if (offset >= head.length) break;
  }
  return head;
}

export type StoredUploadCheck =
  | { ok: true; mimeType: MediaMimeType; sizeBytes: number; publicUrl: string }
  | { ok: false; status: number; code: string; message: string };

/**
 * Confirms an uploaded object is what it claims to be: it exists, its first bytes match an allowed
 * type equal to the declared one, and its real size is within the limit for that type.
 * Rejected objects are deleted so they cannot be served from the public bucket.
 */
export async function verifyStoredUpload(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  path: string,
  declaredMimeType: string
): Promise<StoredUploadCheck> {
  const bucket = supabase.storage.from(MEDIA_BUCKET);

  const { data: info, error: infoError } = await bucket.info(path);
  if (infoError || !info) {
    return {
      ok: false,
      status: 400,
      code: "UPLOAD_NOT_FOUND",
      message: "The uploaded file was not found. Upload it again.",
    };
  }

  const reject = async (
    status: number,
    code: string,
    message: string
  ): Promise<StoredUploadCheck> => {
    await bucket.remove([path]);
    return { ok: false, status, code, message };
  };

  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
  let sniffed: MediaMimeType | null;
  try {
    // Read through a one-off signed URL, not the public one: fetching the public URL would put an
    // unverified file into the shared CDN cache, where a rejected upload could stay reachable.
    const { data: signed, error: signError } = await bucket.createSignedUrl(path, 60);
    if (signError || !signed) throw signError ?? new Error("No signed URL");
    sniffed = sniffMimeType(await readObjectHead(signed.signedUrl));
  } catch {
    return {
      ok: false,
      status: 502,
      code: "STORAGE_READ_FAILED",
      message: "Could not verify the uploaded file. Try again.",
    };
  }

  if (!sniffed) {
    return reject(
      400,
      "INVALID_FILE_CONTENT",
      "File content is not a JPEG, PNG, WebP, AVIF or MP4 file."
    );
  }
  if (sniffed !== declaredMimeType) {
    return reject(
      400,
      "MIME_TYPE_MISMATCH",
      `File content is ${sniffed} but was declared as ${declaredMimeType}.`
    );
  }

  const sizeBytes = Number(info.size ?? 0);
  if (sizeBytes <= 0) {
    return reject(400, "EMPTY_FILE", "The uploaded file is empty.");
  }
  if (sizeBytes > maxBytesFor(sniffed)) {
    return reject(
      400,
      "FILE_TOO_LARGE",
      `File exceeds maximum permitted size (${formatLimit(sniffed)}).`
    );
  }

  return { ok: true, mimeType: sniffed, sizeBytes, publicUrl };
}
