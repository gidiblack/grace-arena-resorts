import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import {
  MEDIA_BUCKET,
  MEDIA_CATEGORIES,
  buildMediaStoragePath,
  formatLimit,
  isAllowedMediaMimeType,
  maxBytesFor,
} from "@/services/media/uploads";

const uploadUrlSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required").max(255),
  mimeType: z.string().refine((value) => isAllowedMediaMimeType(value.toLowerCase()), {
    message: "Invalid file type. Only JPEG, PNG, WebP, AVIF and MP4 are allowed.",
  }),
  sizeBytes: z.number().int().positive("File size must be greater than 0"),
  category: z.enum(MEDIA_CATEGORIES),
});

/**
 * Issues a signed URL the browser uses to upload one media file straight to Storage (Content
 * Manager+). The declared type and size are checked here and re-checked against the stored bytes
 * when the asset is registered with POST /api/v1/media.
 */
export default withApi(
  async (req, res) => {
    const body = req.body as z.infer<typeof uploadUrlSchema>;
    const mimeType = body.mimeType.toLowerCase();

    if (body.sizeBytes > maxBytesFor(mimeType)) {
      return fail(
        res,
        "FILE_TOO_LARGE",
        `File exceeds maximum permitted size (${formatLimit(mimeType)}).`,
        400
      );
    }

    const path = buildMediaStoragePath(body.category, body.fileName);
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(MEDIA_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      logger.error("Failed to create signed media upload URL", { error: error?.message, path });
      return fail(res, "UPLOAD_URL_FAILED", "Could not start the upload. Try again.", 502);
    }

    return ok(res, {
      path: data.path,
      signedUrl: data.signedUrl,
      mimeType,
      maxBytes: maxBytesFor(mimeType),
    });
  },
  {
    allowedMethods: ["POST"],
    requireAuth: true,
    requiredRoles: ["content_manager", "resort_admin", "super_admin"],
    bodySchema: uploadUrlSchema,
  }
);
