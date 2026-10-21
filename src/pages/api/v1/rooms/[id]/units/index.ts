import { withApi } from "@/pages/api/v1/_shared/handler";
import { idOrSlugFilter } from "@/lib/supabase/filters";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";

export default withApi(
  async (req, res) => {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Room type ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // 1. Resolve room type ID (in case slug is passed)
    const { data: roomType } = await supabase
      .from("room_types")
      .select("id, name, slug")
      .or(idOrSlugFilter(id))
      .maybeSingle();

    const targetRoomTypeId = roomType?.id || id;

    // 2. Query units for this room type
    const { data: units, error: unitsError } = await supabase
      .from("rooms")
      .select("*")
      .eq("room_type_id", targetRoomTypeId)
      .order("unit_number", { ascending: true });

    if (unitsError) {
      return fail(res, "DB_ERROR", "Failed to retrieve room units", 500);
    }

    const unitList = units || [];
    const unitIds = unitList.map((u) => u.id);

    // 3. Query active assignments for these units
    let activeAssignments: Array<{
      id: string;
      room_id: string;
      assigned_at: string;
      bookings?: unknown;
    }> = [];
    if (unitIds.length > 0) {
      const { data: assignments } = await supabase
        .from("booking_room_assignments")
        .select(
          "id, room_id, assigned_at, bookings(reference, guest_name, check_in_date, check_out_date)"
        )
        .in("room_id", unitIds)
        .is("released_at", null);

      activeAssignments = (assignments as typeof activeAssignments) || [];
    }

    const enrichedUnits = unitList.map((unit) => {
      const active = activeAssignments.find((a) => a.room_id === unit.id);
      return {
        ...unit,
        activeAssignment: active || null,
      };
    });

    return ok(res, enrichedUnits);
  },
  {
    allowedMethods: ["GET"],
    requireAuth: true,
    requiredRoles: ["resort_admin", "super_admin"],
  }
);
