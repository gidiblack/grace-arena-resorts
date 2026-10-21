import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { ok, fail } from "@/lib/http/response";

const updateUnitStatusSchema = z.object({
  status: z.enum(["available", "maintenance"]),
});

export default withApi(
  async (req, res, ctx) => {
    const { unitId } = req.query;
    const { status: newStatus } = req.body as z.infer<typeof updateUnitStatusSchema>;
    const user = ctx.user!;

    if (!unitId || typeof unitId !== "string") {
      return fail(res, "BAD_REQUEST", "Unit ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // 1. Fetch current unit
    const { data: unit, error: fetchErr } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", unitId)
      .maybeSingle();

    if (fetchErr || !unit) {
      return fail(res, "NOT_FOUND", "Unit not found", 404);
    }

    // 2. Guard: if setting to maintenance, verify no active assignment
    if (newStatus === "maintenance") {
      const { data: activeAssignment } = await supabase
        .from("booking_room_assignments")
        .select("id, booking_id")
        .eq("room_id", unit.id)
        .is("released_at", null)
        .maybeSingle();

      if (activeAssignment || unit.status === "occupied") {
        return fail(
          res,
          "UNIT_OCCUPIED",
          "Unit has an active stay assignment and cannot be placed into maintenance until the guest checks out.",
          400
        );
      }
    }

    const previousStatus = unit.status;

    // 3. Update status
    const { data: updatedUnit, error: updateErr } = await supabase
      .from("rooms")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", unit.id)
      .select()
      .single();

    if (updateErr || !updatedUnit) {
      return fail(res, "UPDATE_FAILED", "Failed to update unit status", 500);
    }

    // 4. Audit log
    await recordAuditLog({
      userId: user.id,
      action: "UPDATE_ROOM_UNIT_STATUS",
      entity: "room_unit",
      entityId: unit.id,
      previousData: { status: previousStatus },
      newData: { status: newStatus },
      req,
    });

    return ok(res, {
      unit: updatedUnit,
      message: `Unit ${unit.unit_number} status updated to '${newStatus}'.`,
    });
  },
  {
    allowedMethods: ["PUT", "PATCH"],
    requireAuth: true,
    requiredRoles: ["resort_admin", "super_admin"],
    bodySchema: updateUnitStatusSchema,
  }
);
