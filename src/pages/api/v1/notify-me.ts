import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const notifyMeSchema = z.object({
  email: z.string().email("Valid email address is required"),
  roomTypeId: z.string().optional(),
  roomTitle: z.string().optional(),
  phone: z.string().optional(),
});

export interface NotifyMeRecord {
  id: string;
  email: string;
  roomTypeId?: string;
  roomTitle?: string;
  phone?: string;
  createdAt: string;
}

// In-memory registry for Milestone 1 (M2 will persist to Supabase)
export const notifyMeStore: NotifyMeRecord[] = [];

export function resetNotifyMeStore() {
  notifyMeStore.length = 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  // Rate limiting: 10 requests per hour per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`notify-me:${clientIp}`, 10, 3600);
  if (!rateLimit.success) {
    res.setHeader("Retry-After", Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString());
    return fail(
      res,
      "RATE_LIMIT_EXCEEDED",
      "Too many notification requests. Please try again later.",
      429
    );
  }

  const parsed = notifyMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(
      res,
      "VALIDATION_ERROR",
      "Invalid notification request",
      400,
      parsed.error.format()
    );
  }

  const { email, roomTypeId, roomTitle, phone } = parsed.data;

  // Duplicate suppression: same email + roomTypeId returns 200 without creating a second record
  const normalizedEmail = email.trim().toLowerCase();
  const isDuplicate = notifyMeStore.some(
    (item) =>
      item.email.toLowerCase() === normalizedEmail &&
      ((roomTypeId && item.roomTypeId === roomTypeId) ||
        (roomTitle && item.roomTitle?.toLowerCase() === roomTitle.trim().toLowerCase()))
  );

  if (isDuplicate) {
    logger.info("Notify-me duplicate submission suppressed", {
      email: normalizedEmail,
      roomTypeId,
      roomTitle,
    });
    return ok(res, {
      message: "You are already on the priority notification list for this room.",
      isDuplicate: true,
      email: normalizedEmail,
      roomTitle: roomTitle || roomTypeId,
    });
  }

  const newRecord: NotifyMeRecord = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    email: normalizedEmail,
    roomTypeId,
    roomTitle,
    phone,
    createdAt: new Date().toISOString(),
  };

  notifyMeStore.push(newRecord);

  logger.info("Notify-me interest captured", {
    email: normalizedEmail,
    roomTypeId,
    roomTitle,
    totalRecords: notifyMeStore.length,
  });

  return ok(
    res,
    {
      message: "You have been added to the priority list! We will notify you when bookings open.",
      isDuplicate: false,
      email: normalizedEmail,
      roomTitle: roomTitle || roomTypeId,
    },
    200
  );
}
