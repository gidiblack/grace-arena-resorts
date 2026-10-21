import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_AMENITIES } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { AmenityCategory } from "@/types/db";

const createAmenitySchema = z.object({
  name: z.string().trim().min(2, "Amenity name is required").max(100),
  icon: z.string().trim().max(100).optional().nullable(),
  category: z.enum(["general", "bathroom", "entertainment", "outdoor"]),
  sort_order: z.number().int().default(0),
});

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List amenities
    // ==========================================
    if (req.method === "GET") {
      const { data: dbAmenities } = await supabase
        .from("amenities")
        .select("*")
        .order("sort_order", { ascending: true });

      if (dbAmenities && dbAmenities.length > 0) {
        return ok(res, dbAmenities);
      }

      const sorted = [...MOCK_AMENITIES].sort((a, b) => a.sortOrder - b.sortOrder);
      return ok(res, sorted);
    }

    // ==========================================
    // POST: Create amenity (Content Manager+)
    // ==========================================
    if (req.method === "POST") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only content managers and administrators can create amenities", 403);
      }

      const body = req.body as z.infer<typeof createAmenitySchema>;

      const { data: newAmenity, error: insertErr } = await supabase
        .from("amenities")
        .insert({
          name: body.name,
          icon: body.icon || null,
          category: body.category as AmenityCategory,
          sort_order: body.sort_order,
        })
        .select()
        .single();

      if (insertErr || !newAmenity) {
        return fail(res, "CREATE_FAILED", insertErr?.message || "Failed to create amenity", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "CREATE_AMENITY",
        entity: "amenities",
        entityId: newAmenity.id,
        previousData: null,
        newData: newAmenity,
        req,
      });

      return ok(res, newAmenity, 201);
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: createAmenitySchema,
  }
);
