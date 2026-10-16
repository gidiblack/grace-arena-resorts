import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { sendRoomNowAvailableNotifications } from "@/services/notify-me/send-room-available";
import { runAfterResponse } from "@/services/booking/notifications";
import { MOCK_ROOMS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import type { Database } from "@/types/db";

const updateRoomSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  status: z.enum(["available", "under_construction"]).optional(),
  tier: z.enum(["budget", "standard", "deluxe", "premium", "executive", "presidential", "royal"]).optional(),
  description: z.string().trim().min(5).optional(),
  base_price: z.number().min(0).optional(),
  max_guests: z.number().int().min(1).optional(),
  total_units: z.number().int().min(1).optional(),
  amenities: z.array(z.any()).optional(),
  images: z.array(z.any()).optional(),
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
      const { data: dbRoom } = await supabase
        .from("room_types")
        .select("*, buildings(*, resorts(*))")
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      if (dbRoom) {
        return ok(res, dbRoom);
      }

      const mockRoom = MOCK_ROOMS.find(
        (r) => r.id.toLowerCase() === id.toLowerCase() || r.slug.toLowerCase() === id.toLowerCase()
      );

      if (!mockRoom) {
        return fail(res, "NOT_FOUND", `Room with identifier '${id}' not found`, 404);
      }

      return ok(res, mockRoom);
    }

    // ==========================================
    // PUT: Update room type (Resort Admin+)
    // ==========================================
    if (req.method === "PUT") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only resort administrators can edit room types", 403);
      }

      const parseResult = updateRoomSchema.safeParse(req.body);
      if (!parseResult.success) {
        return fail(
          res,
          "VALIDATION_ERROR",
          parseResult.error.issues[0]?.message || "Invalid update payload",
          400
        );
      }

      const updates = parseResult.data;

      const { data: roomType, error: fetchErr } = await supabase
        .from("room_types")
        .select("*")
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      if (fetchErr || !roomType) {
        return fail(res, "NOT_FOUND", `Room type '${id}' not found in database`, 404);
      }

      const previousStatus = roomType.status;

      const updateData: Database["public"]["Tables"]["room_types"]["Update"] = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.tier !== undefined) updateData.tier = updates.tier;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.base_price !== undefined) updateData.base_price = updates.base_price;
      if (updates.max_guests !== undefined) updateData.max_guests = updates.max_guests;
      if (updates.total_units !== undefined) updateData.total_units = updates.total_units;
      if (updates.amenities !== undefined) updateData.amenities = updates.amenities;
      if (updates.images !== undefined) updateData.images = updates.images;

      const { data: updatedRoom, error: updateErr } = await supabase
        .from("room_types")
        .update(updateData)
        .eq("id", roomType.id)
        .select()
        .single();

      if (updateErr || !updatedRoom) {
        return fail(res, "UPDATE_FAILED", "Failed to update room type", 500);
      }

      // If transitioning under_construction -> available: trigger Notify-Me broadcast
      if (previousStatus === "under_construction" && updates.status === "available") {
        runAfterResponse("notify-me room available broadcast", () =>
          sendRoomNowAvailableNotifications(roomType.id)
        );
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_ROOM_TYPE",
        entity: "room_types",
        entityId: roomType.id,
        previousData: roomType,
        newData: updatedRoom,
        req,
      });

      return ok(res, {
        room: updatedRoom,
        message: `Room suite '${updatedRoom.name}' successfully updated.`,
      });
    }

    // ==========================================
    // DELETE: Delete room type (Resort Admin+)
    // ==========================================
    if (req.method === "DELETE") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only resort administrators can delete room suites", 403);
      }

      const { data: roomType } = await supabase
        .from("room_types")
        .select("id, name")
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      if (!roomType) {
        return fail(res, "NOT_FOUND", `Room type '${id}' not found`, 404);
      }

      // Check for active bookings
      const { data: lineItems } = await supabase
        .from("booking_line_items")
        .select("booking_id, bookings(status)")
        .eq("room_type_id", roomType.id)
        .limit(10);

      const hasActiveBookings = lineItems?.some((item) => {
        const b = item.bookings as { status?: string } | null;
        return b?.status === "pending" || b?.status === "confirmed" || b?.status === "checked_in";
      });

      if (hasActiveBookings) {
        return fail(
          res,
          "ROOM_HAS_ACTIVE_BOOKINGS",
          "Cannot delete room suite with active or pending bookings. Mark as Under Construction instead.",
          409
        );
      }

      // Delete units and seasonal prices
      await supabase.from("rooms").delete().eq("room_type_id", roomType.id);
      await supabase.from("seasonal_prices").delete().eq("room_type_id", roomType.id);

      const { error: deleteErr } = await supabase
        .from("room_types")
        .delete()
        .eq("id", roomType.id);

      if (deleteErr) {
        return fail(res, "DELETE_FAILED", "Failed to delete room type", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "DELETE_ROOM_TYPE",
        entity: "room_types",
        entityId: roomType.id,
        previousData: roomType,
        newData: null,
        req,
      });

      return ok(res, {
        message: `Room suite '${roomType.name}' has been deleted.`,
      });
    }
  },
  {
    allowedMethods: ["GET", "PUT", "DELETE"],
  }
);
