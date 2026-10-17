import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_RESTAURANTS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Restaurant name is required").max(100),
  slug: z.string().trim().min(2).max(100).optional(),
  cuisine_type: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5),
  operating_hours: z.any().optional(),
  images: z.array(z.any()).default([]),
  resort_id: z.guid().optional().nullable(),
});

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List restaurants
    // ==========================================
    if (req.method === "GET") {
      const { campus } = req.query;

      const { data: dbRestaurants } = await supabase
        .from("restaurants")
        .select("*, resorts(name, slug)");

      if (dbRestaurants && dbRestaurants.length > 0) {
        let list = dbRestaurants.map((r) => {
          const resort = r.resorts as { name?: string; slug?: string } | null;
          return {
            id: r.id,
            name: r.name,
            slug: r.slug,
            description: r.description,
            cuisineType: r.cuisine_type,
            operatingHours: r.operating_hours,
            images: r.images,
            resortId: r.resort_id,
            campus:
              resort?.slug || (r.name.toLowerCase().includes("village") ? "village" : "elysian"),
          };
        });

        if (campus && typeof campus === "string") {
          list = list.filter((r) => r.campus === campus || r.campus === "central");
        }

        return ok(res, list, 200, { total: list.length });
      }

      let restaurants = [...MOCK_RESTAURANTS];
      if (campus && typeof campus === "string") {
        restaurants = restaurants.filter((r) => r.campus === campus || r.campus === "central");
      }

      return ok(res, restaurants, 200, { total: restaurants.length });
    }

    // ==========================================
    // POST: Create restaurant (Content Manager+)
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
          "Only content managers and administrators can create restaurants",
          403
        );
      }

      const body = req.body as z.infer<typeof createRestaurantSchema>;
      const slug =
        body.slug ||
        body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const { data: newRestaurant, error: insertErr } = await supabase
        .from("restaurants")
        .insert({
          name: body.name,
          slug,
          cuisine_type: body.cuisine_type,
          description: body.description,
          operating_hours: body.operating_hours || {
            monday_sunday: "07:00 - 22:00",
          },
          images: body.images,
          resort_id: body.resort_id || null,
        })
        .select()
        .single();

      if (insertErr || !newRestaurant) {
        return fail(res, "CREATE_FAILED", insertErr?.message || "Failed to create restaurant", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "CREATE_RESTAURANT",
        entity: "restaurants",
        entityId: newRestaurant.id,
        previousData: null,
        newData: newRestaurant,
        req,
      });

      return ok(res, newRestaurant, 201);
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: createRestaurantSchema,
  }
);
