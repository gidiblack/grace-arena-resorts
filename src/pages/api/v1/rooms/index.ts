import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_ROOMS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { RoomTier, RoomTypeStatus } from "@/types/db";

const createRoomTypeSchema = z.object({
  building_id: z.string().uuid("Building ID must be a valid UUID").optional().nullable(),
  name: z.string().trim().min(2, "Room suite name is required").max(100),
  slug: z.string().trim().min(2).max(100).optional(),
  tier: z.enum(["budget", "standard", "deluxe", "premium", "executive", "presidential", "royal"]),
  description: z.string().trim().min(5, "Description is required"),
  base_price: z.number().min(0, "Base price must be >= 0"),
  max_guests: z.number().int().min(1, "Max guests must be >= 1").default(2),
  total_units: z.number().int().min(1, "Total units must be >= 1").default(1),
  status: z.enum(["available", "under_construction"]).default("available"),
  amenities: z.array(z.any()).default([]),
  images: z.array(z.any()).default([]),
});

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List rooms
    // ==========================================
    if (req.method === "GET") {
      const { campus, tier, isUnderConstruction } = req.query;

      // Try database first
      const { data: dbRooms } = await supabase
        .from("room_types")
        .select("*, buildings(*, resorts(*))");

      if (dbRooms && dbRooms.length > 0) {
        let filtered = dbRooms.map((r) => {
          const building = r.buildings as { name?: string; resorts?: { name?: string; slug?: string } } | null;
          const campusSlug = building?.resorts?.slug || (r.name.toLowerCase().includes("hut") ? "village" : "elysian");
          const campusName = building?.resorts?.name || (campusSlug === "village" ? "GAR Village" : "GAR Elysian");

          return {
            id: r.id,
            name: r.name,
            slug: r.slug,
            campus: campusSlug,
            resortCampus: campusName,
            tier: r.tier,
            status: r.status,
            basePrice: r.base_price,
            price: r.base_price,
            maxGuests: r.max_guests,
            totalUnits: r.total_units,
            isUnderConstruction: r.status === "under_construction",
            description: r.description,
            amenities: r.amenities,
            images: r.images,
            buildingId: r.building_id,
            buildingName: building?.name || "Main Complex",
          };
        });

        if (campus && typeof campus === "string" && campus.toLowerCase() !== "all") {
          filtered = filtered.filter((r) => r.campus.toLowerCase() === campus.toLowerCase());
        }

        if (tier && typeof tier === "string" && tier.toLowerCase() !== "all") {
          filtered = filtered.filter((r) => r.tier.toLowerCase() === tier.toLowerCase());
        }

        if (isUnderConstruction !== undefined && typeof isUnderConstruction === "string") {
          const isBool = isUnderConstruction.toLowerCase() === "true";
          filtered = filtered.filter((r) => r.isUnderConstruction === isBool);
        }

        return ok(res, filtered, 200, { total: filtered.length });
      }

      // Fallback to mock data
      let rooms = [...MOCK_ROOMS];

      if (campus && typeof campus === "string" && campus.toLowerCase() !== "all") {
        rooms = rooms.filter((r) => r.campus.toLowerCase() === campus.toLowerCase());
      }

      if (tier && typeof tier === "string" && tier.toLowerCase() !== "all") {
        rooms = rooms.filter((r) => r.tier.toLowerCase() === tier.toLowerCase());
      }

      if (isUnderConstruction !== undefined && typeof isUnderConstruction === "string") {
        const isBool = isUnderConstruction.toLowerCase() === "true";
        rooms = rooms.filter((r) => r.isUnderConstruction === isBool);
      }

      return ok(res, rooms, 200, { total: rooms.length });
    }

    // ==========================================
    // POST: Create room type (Resort Admin+)
    // ==========================================
    if (req.method === "POST") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only resort administrators can create room suites", 403);
      }

      const body = req.body as z.infer<typeof createRoomTypeSchema>;

      // Auto-assign building if not supplied
      let buildingId = body.building_id;
      if (!buildingId) {
        const { data: defaultBuilding } = await supabase
          .from("buildings")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (defaultBuilding) {
          buildingId = defaultBuilding.id;
        } else {
          return fail(res, "BUILDING_REQUIRED", "Please create a building first or provide a valid building_id", 400);
        }
      }

      const slug =
        body.slug ||
        body.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const { data: newRoom, error: insertErr } = await supabase
        .from("room_types")
        .insert({
          building_id: buildingId,
          name: body.name,
          slug,
          tier: body.tier as RoomTier,
          description: body.description,
          base_price: body.base_price,
          max_guests: body.max_guests,
          total_units: body.total_units,
          status: body.status as RoomTypeStatus,
          amenities: body.amenities,
          images: body.images,
        })
        .select()
        .single();

      if (insertErr || !newRoom) {
        return fail(res, "CREATE_FAILED", insertErr?.message || "Failed to create room type", 500);
      }

      // Also generate initial physical room units
      if (body.total_units > 0) {
        const unitsPayload = Array.from({ length: body.total_units }).map((_, idx) => ({
          room_type_id: newRoom.id,
          unit_number: `${slug.toUpperCase().slice(0, 3)}-${101 + idx}`,
          floor: "1",
          status: "available" as const,
        }));

        await supabase.from("rooms").insert(unitsPayload);
      }

      await recordAuditLog({
        userId: user.id,
        action: "CREATE_ROOM_TYPE",
        entity: "room_types",
        entityId: newRoom.id,
        previousData: null,
        newData: newRoom,
        req,
      });

      return ok(
        res,
        {
          room: newRoom,
          message: `Room suite '${newRoom.name}' successfully created.`,
        },
        201
      );
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: createRoomTypeSchema,
  }
);
