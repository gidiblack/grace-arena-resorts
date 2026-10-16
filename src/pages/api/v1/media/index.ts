import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_MEDIA } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { MediaCategory } from "@/types/db";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

const uploadMediaSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required"),
  mimeType: z.string().refine((val) => ALLOWED_MIME_TYPES.includes(val.toLowerCase()), {
    message: "Invalid file type. Only JPEG, PNG, WebP, and MP4 are allowed.",
  }),
  sizeBytes: z.number().positive("File size must be greater than 0"),
  category: z.enum(["gallery", "room", "facility", "restaurant", "event", "deal"]),
  altText: z.string().trim().min(1, "Alt text is required for accessibility").max(300),
  url: z.string().url().optional(),
  base64Data: z.string().optional(),
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
      const limitNum = Math.min(100, Math.max(1, parseInt(typeof limit === "string" ? limit : "50", 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      let query = supabase.from("media_assets").select("*", { count: "exact" });

      if (category && typeof category === "string" && category !== "all") {
        query = query.eq("category", category as MediaCategory);
      }

      const { data: dbMedia, count, error } = await query
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
        return fail(res, "FORBIDDEN", "Only content managers and administrators can upload media", 403);
      }

      const body = req.body as z.infer<typeof uploadMediaSchema>;

      // Size validation
      const isVideo = body.mimeType.toLowerCase() === "video/mp4";
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (body.sizeBytes > maxSize) {
        return fail(
          res,
          "FILE_TOO_LARGE",
          `File exceeds maximum permitted size (${isVideo ? "100 MB for video" : "10 MB for images"}).`,
          400
        );
      }

      let assetUrl = body.url || "";

      // If base64 payload is provided, attempt Supabase Storage upload
      if (body.base64Data) {
        try {
          const buffer = Buffer.from(body.base64Data.replace(/^data:.*,/, ""), "base64");
          const safeName = `${Date.now()}-${body.fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
          const filePath = `${body.category}/${safeName}`;

          const { error: uploadError } = await supabase.storage
            .from("media-public")
            .upload(filePath, buffer, {
              contentType: body.mimeType,
              upsert: true,
            });

          if (!uploadError) {
            const { data: pubData } = supabase.storage.from("media-public").getPublicUrl(filePath);
            if (pubData?.publicUrl) {
              assetUrl = pubData.publicUrl;
            }
          }
        } catch {
          // If storage upload fails, fallback to direct url if provided
        }
      }

      if (!assetUrl) {
        assetUrl = `/assets/images/${body.category}/${body.fileName}`;
      }

      const { data: newAsset, error: insertErr } = await supabase
        .from("media_assets")
        .insert({
          file_name: body.fileName,
          mime_type: body.mimeType,
          size_bytes: body.sizeBytes,
          url: assetUrl,
          cdn_url: assetUrl,
          alt_text: body.altText,
          category: body.category,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (insertErr || !newAsset) {
        return fail(res, "INSERT_FAILED", insertErr?.message || "Failed to register media asset", 500);
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
    bodySchema: uploadMediaSchema,
  }
);
