import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_BUILDINGS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

const createBuildingSchema = z.object({
  name: z.string().trim().min(2, "Building name is required").max(100),
  resort_id: z.string().uuid().optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
});

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List buildings
    // ==========================================
    if (req.method === "GET") {
      const { campus } = req.query;

      const { data: dbBuildings } = await supabase
        .from("buildings")
        .select("*, resorts(name, slug)");

      if (dbBuildings && dbBuildings.length > 0) {
        let list = dbBuildings.map((b) => {
          const resort = b.resorts as { name?: string; slug?: string } | null;
          return {
            id: b.id,
            name: b.name,
            description: b.description,
            resortId: b.resort_id,
            resortName: resort?.name || "Grace Arena Resorts",
            campus: resort?.slug || (b.name.toLowerCase().includes("hut") ? "village" : "elysian"),
          };
        });

        if (campus && typeof campus === "string") {
          list = list.filter((b) => b.campus.toLowerCase() === campus.toLowerCase());
        }

        return ok(res, list);
      }

      let buildings = [...MOCK_BUILDINGS];
      if (campus && typeof campus === "string") {
        buildings = buildings.filter((b) => b.campus.toLowerCase() === campus.toLowerCase());
      }

      return ok(res, buildings);
    }

    // ==========================================
    // POST: Create building (Resort Admin+)
    // ==========================================
    if (req.method === "POST") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only resort administrators can create buildings", 403);
      }

      const body = req.body as z.infer<typeof createBuildingSchema>;

      let resortId = body.resort_id;
      if (!resortId) {
        const { data: defaultResort } = await supabase
          .from("resorts")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (defaultResort) {
          resortId = defaultResort.id;
        } else {
          return fail(res, "RESORT_REQUIRED", "Please provide a valid resort_id", 400);
        }
      }

      const { data: newBuilding, error: insertErr } = await supabase
        .from("buildings")
        .insert({
          name: body.name,
          resort_id: resortId,
          description: body.description || null,
        })
        .select()
        .single();

      if (insertErr || !newBuilding) {
        return fail(res, "CREATE_FAILED", insertErr?.message || "Failed to create building", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "CREATE_BUILDING",
        entity: "buildings",
        entityId: newBuilding.id,
        previousData: null,
        newData: newBuilding,
        req,
      });

      return ok(res, newBuilding, 201);
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: createBuildingSchema,
  }
);
