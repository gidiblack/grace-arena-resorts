import { z } from "zod";
import { idOrSlugFilter } from "@/lib/supabase/filters";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_FACILITIES } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

const updateFacilitySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(5).optional(),
  operating_hours: z.any().optional(),
  images: z.array(z.any()).optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Facility ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: Single facility
    // ==========================================
    if (req.method === "GET") {
      const { data: dbFacility } = await supabase
        .from("facilities")
        .select("*")
        .or(idOrSlugFilter(id))
        .maybeSingle();

      if (dbFacility) {
        return ok(res, dbFacility);
      }

      const mockFacility = MOCK_FACILITIES.find((f) => f.id === id);
      if (!mockFacility) {
        return fail(res, "NOT_FOUND", `Facility with id '${id}' not found`, 404);
      }

      return ok(res, mockFacility);
    }

    // ==========================================
    // PUT: Update facility (Content Manager+)
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
          "Only content managers and administrators can edit facilities",
          403
        );
      }

      const updates = req.body as z.infer<typeof updateFacilitySchema>;

      const { data: existing, error: fetchErr } = await supabase
        .from("facilities")
        .select("*")
        .or(idOrSlugFilter(id))
        .maybeSingle();

      if (fetchErr || !existing) {
        return fail(res, "NOT_FOUND", `Facility '${id}' not found`, 404);
      }

      const { data: updated, error: updateErr } = await supabase
        .from("facilities")
        .update({
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.description ? { description: updates.description } : {}),
          ...(updates.operating_hours ? { operating_hours: updates.operating_hours } : {}),
          ...(updates.images ? { images: updates.images } : {}),
          ...(updates.is_featured !== undefined ? { is_featured: updates.is_featured } : {}),
          ...(updates.sort_order !== undefined ? { sort_order: updates.sort_order } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateErr || !updated) {
        return fail(res, "UPDATE_FAILED", "Failed to update facility", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_FACILITY",
        entity: "facilities",
        entityId: existing.id,
        previousData: existing,
        newData: updated,
        req,
      });

      return ok(res, updated);
    }

    // ==========================================
    // DELETE: Delete facility (Content Manager+)
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
          "Only content managers and administrators can delete facilities",
          403
        );
      }

      const { data: existing } = await supabase
        .from("facilities")
        .select("id, name")
        .or(idOrSlugFilter(id))
        .maybeSingle();

      if (!existing) {
        return fail(res, "NOT_FOUND", `Facility '${id}' not found`, 404);
      }

      const { error: deleteErr } = await supabase.from("facilities").delete().eq("id", existing.id);

      if (deleteErr) {
        return fail(res, "DELETE_FAILED", "Failed to delete facility", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "DELETE_FACILITY",
        entity: "facilities",
        entityId: existing.id,
        previousData: existing,
        newData: null,
        req,
      });

      return ok(res, { message: `Facility '${existing.name}' has been deleted.` });
    }
  },
  {
    allowedMethods: ["GET", "PUT", "DELETE"],
    bodySchema: updateFacilitySchema,
  }
);
