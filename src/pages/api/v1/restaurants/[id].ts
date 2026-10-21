import { z } from "zod";
import { idOrSlugFilter } from "@/lib/supabase/filters";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_RESTAURANTS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

const updateRestaurantSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  cuisine_type: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(5).optional(),
  operating_hours: z.any().optional(),
  images: z.array(z.any()).optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Restaurant ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: Single restaurant
    // ==========================================
    if (req.method === "GET") {
      const { data: dbRestaurant } = await supabase
        .from("restaurants")
        .select("*, menu_items(*)")
        .or(idOrSlugFilter(id))
        .maybeSingle();

      if (dbRestaurant) {
        return ok(res, dbRestaurant);
      }

      const mockRestaurant = MOCK_RESTAURANTS.find((r) => r.id === id);

      if (!mockRestaurant) {
        return fail(res, "NOT_FOUND", `Restaurant with id '${id}' not found`, 404);
      }

      return ok(res, mockRestaurant);
    }

    // ==========================================
    // PUT: Update restaurant (Content Manager+)
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
          "Only content managers and administrators can edit restaurants",
          403
        );
      }

      const updates = req.body as z.infer<typeof updateRestaurantSchema>;

      const { data: existing, error: fetchErr } = await supabase
        .from("restaurants")
        .select("*")
        .or(idOrSlugFilter(id))
        .maybeSingle();

      if (fetchErr || !existing) {
        return fail(res, "NOT_FOUND", `Restaurant '${id}' not found`, 404);
      }

      const { data: updated, error: updateErr } = await supabase
        .from("restaurants")
        .update({
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.cuisine_type ? { cuisine_type: updates.cuisine_type } : {}),
          ...(updates.description ? { description: updates.description } : {}),
          ...(updates.operating_hours ? { operating_hours: updates.operating_hours } : {}),
          ...(updates.images ? { images: updates.images } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateErr || !updated) {
        return fail(res, "UPDATE_FAILED", "Failed to update restaurant", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_RESTAURANT",
        entity: "restaurants",
        entityId: existing.id,
        previousData: existing,
        newData: updated,
        req,
      });

      return ok(res, updated);
    }

    // ==========================================
    // DELETE: Delete restaurant (Content Manager+)
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
          "Only content managers and administrators can delete restaurants",
          403
        );
      }

      const { data: existing } = await supabase
        .from("restaurants")
        .select("id, name")
        .or(idOrSlugFilter(id))
        .maybeSingle();

      if (!existing) {
        return fail(res, "NOT_FOUND", `Restaurant '${id}' not found`, 404);
      }

      // Delete menu items first
      await supabase.from("menu_items").delete().eq("restaurant_id", existing.id);

      const { error: deleteErr } = await supabase
        .from("restaurants")
        .delete()
        .eq("id", existing.id);

      if (deleteErr) {
        return fail(res, "DELETE_FAILED", "Failed to delete restaurant", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "DELETE_RESTAURANT",
        entity: "restaurants",
        entityId: existing.id,
        previousData: existing,
        newData: null,
        req,
      });

      return ok(res, { message: `Restaurant '${existing.name}' has been deleted.` });
    }
  },
  {
    allowedMethods: ["GET", "PUT", "DELETE"],
    bodySchema: updateRestaurantSchema,
  }
);
