import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { logger } from "@/lib/logger";
import { MEDIA_BUCKET, mediaPathFromPublicUrl } from "@/services/media/uploads";
import type { MediaCategory } from "@/types/db";

const updateMediaSchema = z.object({
  altText: z.string().trim().min(1).max(300).optional(),
  category: z.enum(["gallery", "room", "facility", "restaurant", "event", "deal"]).optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Media ID is required", 400);
    }

    const user = ctx.user;
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }
    if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
      return fail(
        res,
        "FORBIDDEN",
        "Only content managers and administrators can manage media",
        403
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("media_assets")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return fail(res, "NOT_FOUND", `Media asset '${id}' not found`, 404);
    }

    // ==========================================
    // PUT: Update media metadata
    // ==========================================
    if (req.method === "PUT") {
      const updates = req.body as z.infer<typeof updateMediaSchema>;

      const { data: updated, error: updateErr } = await supabase
        .from("media_assets")
        .update({
          ...(updates.altText ? { alt_text: updates.altText } : {}),
          ...(updates.category ? { category: updates.category as MediaCategory } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateErr || !updated) {
        return fail(res, "UPDATE_FAILED", "Failed to update media asset", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_MEDIA_ASSET",
        entity: "media_assets",
        entityId: id,
        previousData: existing,
        newData: updated,
        req,
      });

      return ok(res, updated);
    }

    // ==========================================
    // DELETE: Delete media asset
    // ==========================================
    if (req.method === "DELETE") {
      const force = req.query.force === "true";

      if (!force) {
        // Reference check: check if asset url is used in room_types
        const { data: roomsReferencing } = await supabase
          .from("room_types")
          .select("id, name")
          .contains("images", [existing.url])
          .limit(1);

        if (roomsReferencing && roomsReferencing.length > 0) {
          return fail(
            res,
            "ASSET_IN_USE",
            `Media asset is currently in use by room suite '${roomsReferencing[0].name}'. Provide ?force=true to delete anyway.`,
            409
          );
        }
      }

      const { error: deleteErr } = await supabase.from("media_assets").delete().eq("id", id);

      if (deleteErr) {
        return fail(res, "DELETE_FAILED", "Failed to delete media asset", 500);
      }

      // Remove the stored file too (row first, so the library never lists a missing file)
      const storagePath = mediaPathFromPublicUrl(supabase, existing.url);
      if (storagePath) {
        const { error: removeErr } = await supabase.storage
          .from(MEDIA_BUCKET)
          .remove([storagePath]);
        if (removeErr) {
          logger.error("Media row deleted but storage object remains", {
            path: storagePath,
            error: removeErr.message,
          });
        }
      }

      await recordAuditLog({
        userId: user.id,
        action: "DELETE_MEDIA_ASSET",
        entity: "media_assets",
        entityId: id,
        previousData: existing,
        newData: null,
        req,
      });

      return ok(res, { message: `Media asset '${existing.file_name}' deleted successfully.` });
    }
  },
  {
    allowedMethods: ["PUT", "DELETE"],
    bodySchema: updateMediaSchema,
  }
);
