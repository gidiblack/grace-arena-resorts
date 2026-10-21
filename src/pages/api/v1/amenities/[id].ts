import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { AmenityCategory } from "@/types/db";

const updateAmenitySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  icon: z.string().trim().max(100).optional().nullable(),
  category: z.enum(["general", "bathroom", "entertainment", "outdoor"]).optional(),
  sort_order: z.number().int().optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Amenity ID is required", 400);
    }

    const user = ctx.user;
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }

    const supabase = getSupabaseAdminClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("amenities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return fail(res, "NOT_FOUND", `Amenity '${id}' not found`, 404);
    }

    // ==========================================
    // PUT: Update amenity (Content Manager+)
    // ==========================================
    if (req.method === "PUT") {
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only content managers and administrators can edit amenities", 403);
      }

      const updates = req.body as z.infer<typeof updateAmenitySchema>;

      const { data: updated, error: updateErr } = await supabase
        .from("amenities")
        .update({
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.icon !== undefined ? { icon: updates.icon } : {}),
          ...(updates.category ? { category: updates.category as AmenityCategory } : {}),
          ...(updates.sort_order !== undefined ? { sort_order: updates.sort_order } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateErr || !updated) {
        return fail(res, "UPDATE_FAILED", "Failed to update amenity", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_AMENITY",
        entity: "amenities",
        entityId: id,
        previousData: existing,
        newData: updated,
        req,
      });

      return ok(res, updated);
    }

    // ==========================================
    // DELETE: Delete amenity (Resort Admin+ only per SRS)
    // ==========================================
    if (req.method === "DELETE") {
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only resort administrators can delete amenities", 403);
      }

      const { error: deleteErr } = await supabase
        .from("amenities")
        .delete()
        .eq("id", id);

      if (deleteErr) {
        return fail(res, "DELETE_FAILED", "Failed to delete amenity", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "DELETE_AMENITY",
        entity: "amenities",
        entityId: id,
        previousData: existing,
        newData: null,
        req,
      });

      return ok(res, { message: `Amenity '${existing.name}' has been deleted.` });
    }
  },
  {
    allowedMethods: ["PUT", "DELETE"],
    bodySchema: updateAmenitySchema,
  }
);
