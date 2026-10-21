import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_MEDIA } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { logger } from "@/lib/logger";
import {
  MEDIA_CATEGORIES,
  formatLimit,
  isAllowedMediaMimeType,
  isIssuedMediaPath,
  maxBytesFor,
  verifyStoredUpload,
} from "@/services/media/uploads";
import type { MediaCategory } from "@/types/db";

/**
 * Registers a media asset. Files are uploaded straight to Storage first (POST
 * /api/v1/media/upload-url) and registered here by `storagePath`; an asset hosted elsewhere can be
 * registered by `url` with its size.
 */
const registerMediaSchema = z
  .object({
    fileName: z.string().trim().min(1, "File name is required").max(255),
    mimeType: z.string().refine((value) => isAllowedMediaMimeType(value.toLowerCase()), {
      message: "Invalid file type. Only JPEG, PNG, WebP, AVIF and MP4 are allowed.",
    }),
    category: z.enum(MEDIA_CATEGORIES),
    altText: z.string().trim().min(1, "Alt text is required for accessibility").max(300),
    storagePath: z.string().trim().min(1).optional(),
    url: z.string().url().optional(),
    sizeBytes: z.number().int().positive("File size must be greater than 0").optional(),
  })
  .refine((body) => Boolean(body.storagePath) !== Boolean(body.url), {
    message: "Provide either storagePath (uploaded file) or url (externally hosted file)",
    path: ["storagePath"],
  })
  .refine((body) => !body.url || body.sizeBytes !== undefined, {
    message: "sizeBytes is required when registering a url",
    path: ["sizeBytes"],
  });

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List media assets
    // ==========================================
    if (req.method === "GET") {
      const { category, page, limit = "50" } = req.query;

      const isNumericPage = typeof page === "string" && /^\d+$/.test(page);
      const pageNum = isNumericPage ? Math.max(1, parseInt(page, 10)) : 1;
      const pageFilter = !isNumericPage && typeof page === "string" ? page : undefined;
      const limitNum = Math.min(
        100,
        Math.max(1, parseInt(typeof limit === "string" ? limit : "50", 10) || 50)
      );
      const offset = (pageNum - 1) * limitNum;

      let query = supabase.from("media_assets").select("*", { count: "exact" });

      if (category && typeof category === "string" && category !== "all") {
        query = query.eq("category", category as MediaCategory);
      }

      const {
        data: dbMedia,
        count,
        error,
      } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (!error && dbMedia && dbMedia.length > 0) {
        return ok(res, dbMedia, 200, {
          total: count ?? dbMedia.length,
          page: pageNum,
          limit: limitNum,
        });
      }

      // Fallback to mock media
      let items = [...MOCK_MEDIA];
      if (category && typeof category === "string" && category !== "all") {
        items = items.filter((m) => m.category === category);
      }
      if (pageFilter) {
        items = items.filter((m) => m.page === pageFilter);
      }

      const formattedMock = items.map((m, idx) => ({
        id: `mock-${idx + 1}`,
        file_name: m.altText || `asset-${idx + 1}.webp`,
        mime_type: "image/webp",
        size_bytes: 512000,
        url: m.url,
        cdn_url: m.url,
        alt_text: m.altText || "Resort asset",
        category: (m.category as MediaCategory) || "gallery",
        page: m.page,
        created_at: new Date().toISOString(),
      }));

      return ok(res, formattedMock, 200, { total: formattedMock.length });
    }

    // ==========================================
    // POST: Upload / Register media asset (Content Manager+)
    // ==========================================
    if (req.method === "POST") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(
          res,
          "FORBIDDEN",
          "Only content managers and administrators can upload media",
          403
        );
      }

      const body = req.body as z.infer<typeof registerMediaSchema>;
      const declaredMimeType = body.mimeType.toLowerCase();
      let mimeType = declaredMimeType;
      let sizeBytes = body.sizeBytes ?? 0;
      let assetUrl = body.url ?? "";

      if (body.storagePath) {
        if (!isIssuedMediaPath(body.storagePath, body.category)) {
          return fail(res, "INVALID_STORAGE_PATH", "Unknown upload path for this category", 400);
        }
        // Trust the stored bytes, not the client: declared type and size are only hints
        const check = await verifyStoredUpload(supabase, body.storagePath, declaredMimeType);
        if (!check.ok) {
          logger.warn("Rejected media upload", { path: body.storagePath, code: check.code });
          return fail(res, check.code, check.message, check.status);
        }
        mimeType = check.mimeType;
        sizeBytes = check.sizeBytes;
        assetUrl = check.publicUrl;

        const { data: existing } = await supabase
          .from("media_assets")
          .select("id")
          .eq("url", assetUrl)
          .maybeSingle();
        if (existing) {
          return fail(
            res,
            "ALREADY_REGISTERED",
            "This upload is already in the media library",
            409
          );
        }
      } else if (sizeBytes > maxBytesFor(mimeType)) {
        return fail(
          res,
          "FILE_TOO_LARGE",
          `File exceeds maximum permitted size (${formatLimit(mimeType)}).`,
          400
        );
      }

      const { data: newAsset, error: insertErr } = await supabase
        .from("media_assets")
        .insert({
          file_name: body.fileName,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          url: assetUrl,
          cdn_url: assetUrl,
          alt_text: body.altText,
          category: body.category,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertErr || !newAsset) {
        return fail(
          res,
          "INSERT_FAILED",
          insertErr?.message || "Failed to register media asset",
          500
        );
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPLOAD_MEDIA_ASSET",
        entity: "media_assets",
        entityId: newAsset.id,
        previousData: null,
        newData: newAsset,
        req,
      });

      return ok(res, newAsset, 201);
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: registerMediaSchema,
  }
);
