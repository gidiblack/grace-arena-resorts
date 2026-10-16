import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { sendRoomNowAvailableNotifications } from "@/services/notify-me/send-room-available";
import { runAfterResponse } from "@/services/booking/notifications";
import { MOCK_ROOMS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";

const updateRoomStatusSchema = z.object({
  status: z.enum(["available", "under_construction"]),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Room identifier is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: Fetch room details
    // ==========================================
    if (req.method === "GET") {
      // 1. Try fetching from database first
      const { data: dbRoom } = await supabase
        .from("room_types")
        .select("*, buildings(*, resorts(*))")
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      if (dbRoom) {
        return ok(res, dbRoom);
      }

      // 2. Fallback to mock data for mock IDs
      const mockRoom = MOCK_ROOMS.find(
        (r) => r.id.toLowerCase() === id.toLowerCase() || r.slug.toLowerCase() === id.toLowerCase()
      );

      if (!mockRoom) {
        return fail(res, "NOT_FOUND", `Room with identifier '${id}' not found`, 404);
      }

      return ok(res, mockRoom);
    }

    // ==========================================
    // PUT: Update room type status (Resort Admin+)
    // ==========================================
    if (req.method === "PUT") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only resort administrators can change room type status", 403);
      }

      const parseResult = updateRoomStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        return fail(
          res,
          "VALIDATION_ERROR",
          parseResult.error.issues[0]?.message || "Invalid status payload",
          400
        );
      }

      const { status: newStatus } = parseResult.data;

      // Find room type in database
      const { data: roomType, error: fetchErr } = await supabase
        .from("room_types")
        .select("id, name, status, base_price")
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      if (fetchErr || !roomType) {
        return fail(res, "NOT_FOUND", `Room type '${id}' not found in database`, 404);
      }

      const previousStatus = roomType.status;

      // Update status
      const { data: updatedRoom, error: updateErr } = await supabase
        .from("room_types")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomType.id)
        .select()
        .single();

      if (updateErr || !updatedRoom) {
        return fail(res, "UPDATE_FAILED", "Failed to update room type status", 500);
      }

      // If transitioning under_construction -> available: trigger Notify-Me broadcast
      if (previousStatus === "under_construction" && newStatus === "available") {
        runAfterResponse("notify-me room available broadcast", () =>
          sendRoomNowAvailableNotifications(roomType.id)
        );
      }

      // Record audit log
      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_ROOM_TYPE_STATUS",
        entity: "room_type",
        entityId: roomType.id,
        previousData: { status: previousStatus },
        newData: { status: newStatus },
        req,
      });

      return ok(res, {
        room: updatedRoom,
        message: `Room type status updated to '${newStatus}'.`,
      });
    }
  },
  {
    allowedMethods: ["GET", "PUT"],
  }
);
