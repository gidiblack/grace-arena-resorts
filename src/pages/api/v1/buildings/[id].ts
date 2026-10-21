import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

const updateBuildingSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Building ID is required", 400);
    }

    const user = ctx.user;
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }
    if (!["resort_admin", "super_admin"].includes(user.role)) {
      return fail(res, "FORBIDDEN", "Only resort administrators can manage buildings", 403);
    }

    const supabase = getSupabaseAdminClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return fail(res, "NOT_FOUND", `Building '${id}' not found`, 404);
    }

    // ==========================================
    // PUT: Update building
    // ==========================================
    if (req.method === "PUT") {
      const updates = req.body as z.infer<typeof updateBuildingSchema>;

      const { data: updated, error: updateErr } = await supabase
        .from("buildings")
        .update({
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.description !== undefined ? { description: updates.description } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateErr || !updated) {
        return fail(res, "UPDATE_FAILED", "Failed to update building", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_BUILDING",
        entity: "buildings",
        entityId: id,
        previousData: existing,
        newData: updated,
        req,
      });

      return ok(res, updated);
    }

    // ==========================================
    // DELETE: Delete building
    // ==========================================
    if (req.method === "DELETE") {
      // Check if room_types exist in this building
      const { data: rooms } = await supabase
        .from("room_types")
        .select("id")
        .eq("building_id", id)
        .limit(1);

      if (rooms && rooms.length > 0) {
        return fail(
          res,
          "BUILDING_NOT_EMPTY",
          "Cannot delete building that has associated room suites. Please reassign or delete the suites first.",
          409
        );
      }

      const { error: deleteErr } = await supabase
        .from("buildings")
        .delete()
        .eq("id", id);

      if (deleteErr) {
        return fail(res, "DELETE_FAILED", "Failed to delete building", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "DELETE_BUILDING",
        entity: "buildings",
        entityId: id,
        previousData: existing,
        newData: null,
        req,
      });

      return ok(res, { message: `Building '${existing.name}' has been deleted.` });
    }
  },
  {
    allowedMethods: ["PUT", "DELETE"],
    bodySchema: updateBuildingSchema,
  }
);
