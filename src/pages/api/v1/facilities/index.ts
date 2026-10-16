import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_FACILITIES } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

const createFacilitySchema = z.object({
  name: z.string().trim().min(2, "Facility name is required").max(100),
  slug: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(5),
  operating_hours: z.any().optional(),
  images: z.array(z.any()).default([]),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  resort_id: z.string().uuid().optional().nullable(),
});

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List facilities
    // ==========================================
    if (req.method === "GET") {
      const { campus } = req.query;

      const { data: dbFacilities } = await supabase
        .from("facilities")
        .select("*, resorts(name, slug)");

      if (dbFacilities && dbFacilities.length > 0) {
        let list = dbFacilities.map((f) => {
          const resort = f.resorts as { name?: string; slug?: string } | null;
          return {
            id: f.id,
            name: f.name,
            slug: f.slug,
            description: f.description,
            operatingHours: f.operating_hours,
            images: f.images,
            isFeatured: f.is_featured,
            sortOrder: f.sort_order,
            resortId: f.resort_id,
            campus: resort?.slug || (f.name.toLowerCase().includes("village") ? "village" : "elysian"),
          };
        });

        if (campus && typeof campus === "string") {
          list = list.filter((f) => f.campus === campus || f.campus === "central");
        }

        return ok(res, list, 200, { total: list.length });
      }

      let facilities = [...MOCK_FACILITIES];
      if (campus && typeof campus === "string") {
        facilities = facilities.filter((f) => f.campus === campus || f.campus === "central");
      }

      return ok(res, facilities, 200, { total: facilities.length });
    }

    // ==========================================
    // POST: Create facility (Content Manager+)
    // ==========================================
    if (req.method === "POST") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only content managers and administrators can create facilities", 403);
      }

      const body = req.body as z.infer<typeof createFacilitySchema>;
      const slug =
        body.slug ||
        body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const { data: newFacility, error: insertErr } = await supabase
        .from("facilities")
        .insert({
          name: body.name,
          slug,
          description: body.description,
          operating_hours: body.operating_hours || { daily: "08:00 - 20:00" },
          images: body.images,
          is_featured: body.is_featured,
          sort_order: body.sort_order,
          resort_id: body.resort_id || null,
        })
        .select()
        .single();

      if (insertErr || !newFacility) {
        return fail(res, "CREATE_FAILED", insertErr?.message || "Failed to create facility", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "CREATE_FACILITY",
        entity: "facilities",
        entityId: newFacility.id,
        previousData: null,
        newData: newFacility,
        req,
      });

      return ok(res, newFacility, 201);
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: createFacilitySchema,
  }
);
