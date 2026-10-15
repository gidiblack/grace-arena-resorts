import type { NextApiRequest, NextApiResponse } from "next";
import { stringifySetCookie } from "cookie";
import { env } from "@/config/env";
import type { AuthUser } from "@/pages/api/v1/_shared/auth";
import { issueToken, isValidBookingAccessToken } from "@/services/auth/tokens";
import { resortDateTime } from "@/domain/booking/time";
import type { Database, UserRole } from "@/types/db";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export const BOOKING_ACCESS_COOKIE = "gar_booking_access";
const MAX_COOKIE_ENTRIES = 5;
const ACCESS_VALID_AFTER_CHECKOUT_MS = 30 * 24 * 60 * 60 * 1000;

interface CookieEntry {
  r: string; // booking reference
  t: string; // raw access token
}

function readCookieEntries(req: NextApiRequest): CookieEntry[] {
  const raw = req.cookies?.[BOOKING_ACCESS_COOKIE];
  if (!raw) return [];
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return Array.isArray(parsed)
      ? parsed.filter((e) => typeof e?.r === "string" && typeof e?.t === "string")
      : [];
  } catch {
    return [];
  }
}

function appendSetCookie(res: NextApiResponse, cookie: string) {
  const existing = res.getHeader("Set-Cookie");
  const current = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
  res.setHeader("Set-Cookie", [...current, cookie]);
}

/**
 * Remembers a booking's access token in an HttpOnly cookie so the same browser can return from
 * Paystack and manage the booking without an account. Keeps the most recent 5 bookings.
 */
export function rememberBookingAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  reference: string,
  token: string
) {
  const entries = [
    { r: reference, t: token },
    ...readCookieEntries(req).filter((e) => e.r !== reference),
  ].slice(0, MAX_COOKIE_ENTRIES);
  appendSetCookie(
    res,
    stringifySetCookie({
      name: BOOKING_ACCESS_COOKIE,
      value: Buffer.from(JSON.stringify(entries)).toString("base64url"),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_VALID_AFTER_CHECKOUT_MS / 1000,
    })
  );
}

export function bookingAccessExpiry(checkOutDate: string): Date {
  return new Date(resortDateTime(checkOutDate, 11).getTime() + ACCESS_VALID_AFTER_CHECKOUT_MS);
}

/**
 * Issues a "Manage booking" token valid until 30 days after check-out.
 */
export async function issueBookingAccessToken(
  booking: Pick<BookingRow, "id" | "guest_email" | "check_out_date">
): Promise<string> {
  return issueToken({
    purpose: "booking_access",
    email: booking.guest_email,
    bookingId: booking.id,
    expiresAt: bookingAccessExpiry(booking.check_out_date),
  });
}

export function manageBookingUrl(reference: string, token: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}/manage-booking/${encodeURIComponent(reference)}?t=${encodeURIComponent(token)}`;
}

/** The access token presented for this booking: ?t= query parameter first, then the cookie */
export function presentedAccessToken(req: NextApiRequest, reference: string): string | null {
  const queryToken = Array.isArray(req.query.t) ? req.query.t[0] : req.query.t;
  if (typeof queryToken === "string" && queryToken) return queryToken;
  return readCookieEntries(req).find((e) => e.r === reference)?.t ?? null;
}

export type BookingAccessVia = "admin" | "owner" | "token";

/**
 * Who may act on a booking: admins in `adminRoles`, the signed-in owner, or anyone presenting a
 * valid booking access token ("Manage booking" link or the cookie set at checkout).
 */
export async function authorizeBookingAccess(
  req: NextApiRequest,
  booking: Pick<BookingRow, "id" | "reference" | "user_id">,
  user: AuthUser | undefined,
  adminRoles: UserRole[] = ["resort_admin", "super_admin"]
): Promise<BookingAccessVia | null> {
  if (user && adminRoles.includes(user.role)) return "admin";
  if (user && booking.user_id && booking.user_id === user.id) return "owner";

  const token = presentedAccessToken(req, booking.reference);
  if (token && (await isValidBookingAccessToken(booking.id, token))) return "token";

  return null;
}
