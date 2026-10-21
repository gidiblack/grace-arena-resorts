import { z } from "zod";
import { idOrSlugFilter } from "@/lib/supabase/filters";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_GEMS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { GemCategory } from "@/types/db";

const updateGemSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(5).optional(),
  category: z.enum(["nature", "culture", "adventure", "spiritual"]).optional(),
  distance: z.string().trim().min(1).max(50).optional(),
  duration: z.string().trim().min(1).max(50).optional(),
  images: z.array(z.any()).optional(),
  is_featured: z.boolean().optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Gem ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: Single gem
    // ==========================================
    if (req.method === "GET") {
      const { data: dbGem } = await supabase
        .from("gems")
        .select("*")
        .or(idOrSlugFilter(id))
        .maybeSingle();

      if (dbGem) {
        return ok(res, dbGem);
      }

      const mockGem = MOCK_GEMS.find((g) => g.id === id);
      if (!mockGem) {
        return fail(res, "NOT_FOUND", `Gem with id '${id}' not found`, 404);
      }

      return ok(res, mockGem);
    }

    // ==========================================
    // PUT: Update gem (Content Manager+)
    // ==========================================
    if (req.method === "PUT") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(
          res,
          "FORBIDDEN",
          "Only content managers and administrators can edit gems",
          403
        );
      }

      const updates = req.body as z.infer<typeof updateGemSchema>;

      const { data: existing, error: fetchErr } = await supabase
        .from("gems")
        .select("*")
        .or(idOrSlugFilter(id))
        .maybeSingle();

      if (fetchErr || !existing) {
        return fail(res, "NOT_FOUND", `Gem '${id}' not found`, 404);
      }

      const { data: updated, error: updateErr } = await supabase
        .from("gems")
        .update({
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.description ? { description: updates.description } : {}),
          ...(updates.category ? { category: updates.category as GemCategory } : {}),
          ...(updates.distance ? { distance: updates.distance } : {}),
          ...(updates.duration ? { duration: updates.duration } : {}),
          ...(updates.images ? { images: updates.images } : {}),
          ...(updates.is_featured !== undefined ? { is_featured: updates.is_featured } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateErr || !updated) {
        return fail(res, "UPDATE_FAILED", "Failed to update gem", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_GEM",
        entity: "gems",
        entityId: existing.id,
        previousData: existing,
        newData: updated,
        req,
      });

      return ok(res, updated);
    }

    // ==========================================
    // DELETE: Delete gem (Content Manager+)
    // ==========================================
    if (req.method === "DELETE") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(
          res,
          "FORBIDDEN",
          "Only content managers and administrators can delete gems",
          403
        );
      }

      const { data: existing } = await supabase
        .from("gems")
        .select("id, name")
        .or(idOrSlugFilter(id))
        .maybeSingle();

      if (!existing) {
        return fail(res, "NOT_FOUND", `Gem '${id}' not found`, 404);
      }

      const { error: deleteErr } = await supabase.from("gems").delete().eq("id", existing.id);

      if (deleteErr) {
        return fail(res, "DELETE_FAILED", "Failed to delete gem", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "DELETE_GEM",
        entity: "gems",
        entityId: existing.id,
        previousData: existing,
        newData: null,
        req,
      });

      return ok(res, { message: `Gem '${existing.name}' has been deleted.` });
    }
  },
  {
    allowedMethods: ["GET", "PUT", "DELETE"],
    bodySchema: updateGemSchema,
  }
);
