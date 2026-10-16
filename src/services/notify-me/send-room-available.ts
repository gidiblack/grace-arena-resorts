import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/services/email";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export interface SendRoomAvailableResult {
  total: number;
  sent: number;
  failed: number;
}

/**
 * Triggers batch email notifications to all users who requested to be notified
 * when an under-construction room type becomes available (SRS Section 4.5).
 * Only sends to un-notified records (is_notified = false) and marks them notified.
 */
export async function sendRoomNowAvailableNotifications(
  roomTypeId: string
): Promise<SendRoomAvailableResult> {
  const supabase = getSupabaseAdminClient();
  const result: SendRoomAvailableResult = { total: 0, sent: 0, failed: 0 };

  try {
    // 1. Fetch room type details
    const { data: roomType, error: roomError } = await supabase
      .from("room_types")
      .select("id, name, tier, base_price, description, images")
      .eq("id", roomTypeId)
      .maybeSingle();

    if (roomError || !roomType) {
      logger.error("Room type not found for notify-me broadcast", { roomTypeId, roomError });
      return result;
    }

    // 2. Fetch pending notification registrations
    const { data: registrations, error: regError } = await supabase
      .from("notify_me_registrations")
      .select("id, email")
      .eq("room_type_id", roomTypeId)
      .eq("is_notified", false);

    if (regError) {
      logger.error("Failed to query notify_me_registrations", { roomTypeId, regError });
      return result;
    }

    if (!registrations || registrations.length === 0) {
      return result;
    }

    result.total = registrations.length;

    let heroImageUrl = "";
    if (Array.isArray(roomType.images) && roomType.images.length > 0) {
      const first = roomType.images[0];
      if (typeof first === "string") heroImageUrl = first;
      else if (first && typeof first === "object" && "url" in first) heroImageUrl = String((first as { url: string }).url);
    }

    const appUrl = (env.NEXT_PUBLIC_APP_URL || "https://gracearenaresorts.com").replace(/\/$/, "");
    const bookUrl = `${appUrl}/booking?room=${roomType.id}`;

    for (const reg of registrations) {
      const templateData = {
        roomName: roomType.name,
        tier: roomType.tier,
        pricePerNight: roomType.base_price,
        heroImageUrl,
        description: roomType.description,
        bookUrl,
      };

      try {
        const sendRes = await sendEmail({
          to: reg.email,
          templateId: "room_now_available",
          templateData,
          queueOnFailure: true,
          retry: {
            handler: "room_now_available",
            params: {
              registrationId: reg.id,
              roomTypeId: roomType.id,
              email: reg.email,
            },
          },
        });

        if (sendRes.success) {
          result.sent++;
          await supabase
            .from("notify_me_registrations")
            .update({
              is_notified: true,
              notified_at: new Date().toISOString(),
            })
            .eq("id", reg.id);
        } else {
          result.failed++;
          logger.warn("Notify-me email queued on provider failure", {
            email: reg.email,
            roomTypeId,
            error: sendRes.error,
          });
        }
      } catch (err) {
        result.failed++;
        logger.error("Failed to dispatch notify-me email to recipient", {
          email: reg.email,
          roomTypeId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info("Notify-me broadcast completed", {
      roomTypeId,
      ...result,
    });
  } catch (err) {
    logger.error("Unexpected error in sendRoomNowAvailableNotifications", {
      roomTypeId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return result;
}
