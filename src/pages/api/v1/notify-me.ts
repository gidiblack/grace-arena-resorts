import { z } from "zod";
import { withApi } from "./_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notifyMeSchema = z.object({
  email: z.string().email("Valid email address is required"),
  // Catalog slug (e.g. "village-presidential-hut") or room type UUID
  roomTypeId: z.string().trim().min(1, "Room selection is required").max(100),
  roomTitle: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(20).optional(),
});

export interface NotifyMeRecord {
  id: string;
  email: string;
  roomTypeId?: string;
  roomTitle?: string;
  phone?: string;
  createdAt: string;
}

// In-memory registry used only in mock-data mode (UI previews/tests without Supabase)
export const notifyMeStore: NotifyMeRecord[] = [];

export function resetNotifyMeStore() {
  notifyMeStore.length = 0;
}

export default withApi(
  async (req, res) => {
    const { email, roomTypeId, roomTitle, phone } = req.body as z.infer<typeof notifyMeSchema>;
    const normalizedEmail = email.trim().toLowerCase();

    const respond = (isDuplicate: boolean) =>
      ok(res, {
        message: isDuplicate
          ? "You are already on the priority notification list for this room."
          : "You have been added to the priority list! We will notify you when bookings open.",
        isDuplicate,
        email: normalizedEmail,
        roomTitle: roomTitle || roomTypeId,
      });

    if (env.NEXT_PUBLIC_USE_MOCK_DATA) {
      const isDuplicate = notifyMeStore.some(
        (item) => item.email === normalizedEmail && item.roomTypeId === roomTypeId
      );
      if (!isDuplicate) {
        notifyMeStore.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          email: normalizedEmail,
          roomTypeId,
          roomTitle,
          phone,
          createdAt: new Date().toISOString(),
        });
      }
      return respond(isDuplicate);
    }

    const supabase = getSupabaseAdminClient();
    const { data: roomType } = await supabase
      .from("room_types")
      .select("id, status")
      .eq(UUID.test(roomTypeId) ? "id" : "slug", roomTypeId)
      .maybeSingle();

    if (!roomType) {
      return fail(res, "ROOM_NOT_FOUND", "The selected room could not be found", 404);
    }
    if (roomType.status !== "under_construction") {
      return fail(res, "ROOM_AVAILABLE", "This room is already open for booking", 400);
    }

    const { error } = await supabase
      .from("notify_me_registrations")
      .insert({ room_type_id: roomType.id, email: normalizedEmail });

    if (error) {
      // Unique (room_type_id, lower(email)): duplicate submissions succeed without a new row
      if (error.code === "23505") return respond(true);
      logger.error("Failed to save notify-me registration", { error });
      return fail(res, "SUBMISSION_FAILED", "Unable to save your request right now", 500);
    }

    return respond(false);
  },
  {
    allowedMethods: ["POST"],
    bodySchema: notifyMeSchema,
    rateLimit: { keyPrefix: "notify-me", maxRequests: 10, windowSeconds: 3600 },
  }
);
