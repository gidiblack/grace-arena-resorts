import { z } from "zod";
import { idOrSlugFilter } from "@/lib/supabase/filters";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_RESTAURANTS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { MenuCategory } from "@/types/db";

const menuItemSchema = z.object({
  id: z.guid().optional(),
  name: z.string().trim().min(2, "Item name is required").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  price: z.number().min(0, "Price must be >= 0"),
  category: z.enum(["starter", "main", "dessert", "beverage"]),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export default withApi(
  async (req, res, ctx) => {
    const { id, category } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Restaurant ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // Check restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, name")
      .or(idOrSlugFilter(id))
      .maybeSingle();

    // ==========================================
    // GET: List menu items
    // ==========================================
    if (req.method === "GET") {
      if (restaurant) {
        let query = supabase.from("menu_items").select("*").eq("restaurant_id", restaurant.id);

        if (category && typeof category === "string") {
          query = query.eq("category", category as MenuCategory);
        }

        const { data: items } = await query.order("sort_order", { ascending: true });
        if (items && items.length > 0) {
          return ok(res, items, 200, { total: items.length });
        }
      }

      // Fallback to mock restaurant menu
      const mockRestaurant = MOCK_RESTAURANTS.find((r) => r.id === id);
      if (!mockRestaurant) {
        return fail(res, "NOT_FOUND", `Restaurant with id '${id}' not found`, 404);
      }

      let menu = mockRestaurant.menu;
      if (category && typeof category === "string") {
        menu = menu.filter((item) => item.category === category);
      }

      return ok(res, menu, 200, { total: menu.length });
    }

    // Mutating actions require Content Manager+
    const user = ctx.user;
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }
    if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
      return fail(
        res,
        "FORBIDDEN",
        "Only content managers and administrators can manage menus",
        403
      );
    }

    if (!restaurant) {
      return fail(res, "NOT_FOUND", `Restaurant '${id}' not found in database`, 404);
    }

    // ==========================================
    // POST: Create menu item
    // ==========================================
    if (req.method === "POST") {
      const parse = menuItemSchema.safeParse(req.body);
      if (!parse.success) {
        return fail(
          res,
          "VALIDATION_ERROR",
          parse.error.issues[0]?.message || "Invalid input",
          400
        );
      }
      const body = parse.data;

      const { data: newItem, error: insertErr } = await supabase
        .from("menu_items")
        .insert({
          restaurant_id: restaurant.id,
          name: body.name,
          description: body.description || null,
          price: body.price,
          category: body.category as MenuCategory,
          is_available: body.is_available,
          sort_order: body.sort_order,
        })
        .select()
        .single();

      if (insertErr || !newItem) {
        return fail(res, "CREATE_FAILED", insertErr?.message || "Failed to create menu item", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "CREATE_MENU_ITEM",
        entity: "menu_items",
        entityId: newItem.id,
        previousData: null,
        newData: newItem,
        req,
      });

      return ok(res, newItem, 201);
    }

    // ==========================================
    // PUT: Update menu item
    // ==========================================
    if (req.method === "PUT") {
      const body = req.body as z.infer<typeof menuItemSchema>;
      const menuItemId = body.id || (req.query.menuItemId as string);

      if (!menuItemId) {
        return fail(res, "BAD_REQUEST", "Menu item ID is required for update", 400);
      }

      const { data: updatedItem, error: updateErr } = await supabase
        .from("menu_items")
        .update({
          name: body.name,
          description: body.description || null,
          price: body.price,
          category: body.category as MenuCategory,
          is_available: body.is_available,
          sort_order: body.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", menuItemId)
        .eq("restaurant_id", restaurant.id)
        .select()
        .single();

      if (updateErr || !updatedItem) {
        return fail(res, "UPDATE_FAILED", "Failed to update menu item", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_MENU_ITEM",
        entity: "menu_items",
        entityId: menuItemId,
        previousData: null,
        newData: updatedItem,
        req,
      });

      return ok(res, updatedItem);
    }

    // ==========================================
    // DELETE: Delete menu item
    // ==========================================
    if (req.method === "DELETE") {
      const menuItemId = req.query.menuItemId as string;
      if (!menuItemId) {
        return fail(res, "BAD_REQUEST", "menuItemId query parameter is required", 400);
      }

      const { error: deleteErr } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", menuItemId)
        .eq("restaurant_id", restaurant.id);

      if (deleteErr) {
        return fail(res, "DELETE_FAILED", "Failed to delete menu item", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "DELETE_MENU_ITEM",
        entity: "menu_items",
        entityId: menuItemId,
        previousData: null,
        newData: null,
        req,
      });

      return ok(res, { message: "Menu item deleted successfully." });
    }
  },
  {
    allowedMethods: ["GET", "POST", "PUT", "DELETE"],
  }
);
