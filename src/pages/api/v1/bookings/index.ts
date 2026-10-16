import { z } from "zod";
import { withApi } from "../_shared/handler";
import { parsePagination, setPaginationHeaders } from "../_shared/pagination";
import { generateBookingReference } from "@/domain/booking/reference";
import { addCalendarDays, isValidCalendarDate, resortToday } from "@/domain/booking/time";
import { calculateBookingPricing } from "@/services/pricing/pricing-engine";
import { findValidDeal, getTaxRate } from "@/services/booking/booking-data";
import { runAfterResponse, sendBookingConfirmationEmail } from "@/services/booking/notifications";
import {
  issueBookingAccessToken,
  manageBookingUrl,
  rememberBookingAccess,
} from "@/services/booking/access";
import { enforceRateLimit } from "../_shared/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import { recordAuditLog } from "../_shared/audit-log";
import type { BookingChannel, BookingStatus, PaymentStatus, Database } from "@/types/db";

/** Anti-abuse limits for online bookings (product decision 2026-10-15; reCAPTCHA deferred) */
export const GUEST_BOOKINGS_PER_IP_PER_HOUR = 10;
export const MAX_LIVE_HOLDS_PER_EMAIL = 3;

const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
] as const;

export const createBookingSchema = z.object({
  checkInDate: z.string().refine(isValidCalendarDate, "Format must be a valid YYYY-MM-DD date"),
  nights: z.number().int().min(1, "Minimum stay is 1 night").max(30, "Maximum stay is 30 nights"),
  rooms: z
    .array(
      z.object({
        roomTypeId: z.guid("Invalid room selection"),
        quantity: z.number().int().min(1).max(20).default(1),
      })
    )
    .min(1, "Select at least one room"),
  adults: z.number().int().min(1).max(10).default(1),
  children: z.number().int().min(0).max(10).default(0),
  guest: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().email(),
    phone: z.string().regex(/^\+234\d{10}$/, "Format must be +234XXXXXXXXXX"),
    specialRequests: z.string().max(500).optional(),
  }),
  dealId: z.guid().optional(),
  promoCode: z.string().trim().min(1).max(40).optional(),
  paymentMethod: z.enum(["paystack", "cash", "pos", "bank_transfer"]).optional().default("paystack"),
  paymentReference: z.string().trim().max(100).optional(),
  // NDPR: guests consent at checkout because they may not have registered (SRS v1.3)
  privacyConsent: z.boolean().optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const user = ctx.user;
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List bookings (signed-in users only)
    // ==========================================
    if (req.method === "GET") {
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required to access this resource", 401);
      }
      const { page, limit, offset } = parsePagination(req);
      const {
        status,
        reference,
        guestEmail,
        checkInFrom,
        checkInTo,
        channel,
        paymentStatus,
        q,
      } = req.query;

      const isAdmin = ["resort_admin", "super_admin", "content_manager"].includes(user.role);

      let query = supabase.from("bookings").select("*", { count: "exact" });

      if (!isAdmin) {
        // Guests can ONLY view their own bookings per SRS Section 4.1
        query = query.eq("user_id", user.id);
      } else {
        if (
          typeof status === "string" &&
          (BOOKING_STATUSES as readonly string[]).includes(status)
        ) {
          query = query.eq("status", status as BookingStatus);
        }
        if (typeof reference === "string" && reference) {
          query = query.eq("reference", reference.toUpperCase().trim());
        }
        if (typeof guestEmail === "string" && guestEmail) {
          query = query.eq("guest_email", guestEmail.toLowerCase().trim());
        }
        if (typeof checkInFrom === "string" && checkInFrom) {
          query = query.gte("check_in_date", checkInFrom);
        }
        if (typeof checkInTo === "string" && checkInTo) {
          query = query.lte("check_in_date", checkInTo);
        }
        if (
          typeof channel === "string" &&
          ["online_guest", "online_account", "walk_in"].includes(channel)
        ) {
          query = query.eq("channel", channel as BookingChannel);
        }
        if (typeof q === "string" && q.trim()) {
          const term = q.trim();
          query = query.or(
            `reference.ilike.%${term}%,guest_name.ilike.%${term}%,guest_email.ilike.%${term}%`
          );
        }
        if (typeof paymentStatus === "string" && paymentStatus) {
          const { data: matchedPayments } = await supabase
            .from("payments")
            .select("booking_id")
            .eq("status", paymentStatus as PaymentStatus);
          const bookingIds = (matchedPayments || []).map((p) => p.booking_id);
          query = query.in(
            "id",
            bookingIds.length > 0 ? bookingIds : ["00000000-0000-0000-0000-000000000000"]
          );
        }
      }

      query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      const { data: bookings, count, error } = await query;

      if (error) {
        logger.error("Failed to query bookings list", { error });
        return fail(res, "DB_ERROR", "Failed to load bookings", 500);
      }

      const bookingList = bookings || [];
      const bookingIds = bookingList.map((b) => b.id);
      let lineItems: Array<Database["public"]["Tables"]["booking_line_items"]["Row"]> = [];
      let payments: Array<Database["public"]["Tables"]["payments"]["Row"]> = [];

      if (bookingIds.length > 0) {
        const [{ data: li }, { data: pm }] = await Promise.all([
          supabase.from("booking_line_items").select("*").in("booking_id", bookingIds),
          supabase.from("payments").select("*").in("booking_id", bookingIds),
        ]);
        lineItems = li || [];
        payments = pm || [];
      }

      const enrichedBookings = bookingList.map((b) => ({
        ...b,
        booking_line_items: lineItems.filter((i) => i.booking_id === b.id),
        payments: payments.filter((p) => p.booking_id === b.id),
      }));

      setPaginationHeaders(res, count || 0, page, limit);
      return ok(res, enrichedBookings);
    }

    // ==========================================
    // POST: Create booking
    // ==========================================
    const parseResult = createBookingSchema.safeParse(req.body);
    if (!parseResult.success) {
      return fail(
        res,
        "VALIDATION_ERROR",
        parseResult.error.issues[0]?.message || "Invalid payload",
        400,
        parseResult.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }))
      );
    }
    const payload = parseResult.data;
    const isAdmin = Boolean(user && ["resort_admin", "super_admin"].includes(user.role));
    const isWalkInAdminBooking =
      isAdmin && ["cash", "pos", "bank_transfer"].includes(payload.paymentMethod);

    if (isWalkInAdminBooking && payload.paymentMethod === "bank_transfer") {
      if (!payload.paymentReference || !payload.paymentReference.trim()) {
        return fail(
          res,
          "MISSING_PAYMENT_REFERENCE",
          "Payment reference is required for bank transfer payments",
          400
        );
      }
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("gateway", "bank_transfer")
        .eq("gateway_reference", payload.paymentReference.trim())
        .maybeSingle();

      if (existingPayment) {
        return fail(
          res,
          "DUPLICATE_PAYMENT_REFERENCE",
          "A payment with this transfer reference already exists",
          409
        );
      }
    }

    // Online bookings: no account or email verification required (SRS v1.3), but consent is
    if (!isWalkInAdminBooking) {
      if (payload.privacyConsent !== true) {
        return fail(
          res,
          "PRIVACY_CONSENT_REQUIRED",
          "Please accept the Privacy Policy to complete your reservation.",
          400
        );
      }
      const allowed = await enforceRateLimit(req, res, {
        keyPrefix: "booking-create",
        maxRequests: GUEST_BOOKINGS_PER_IP_PER_HOUR,
        windowSeconds: 3600,
      });
      if (!allowed) return;
    }

    // Dates are calendar dates at the resort (WAT), never the server's timezone
    const checkInStr = payload.checkInDate;
    if (checkInStr < resortToday()) {
      return fail(res, "PAST_DATE", "Check-in date cannot be in the past", 400);
    }
    const checkOutStr = addCalendarDays(checkInStr, payload.nights);

    // Merge repeated selections of the same room type
    const quantities = new Map<string, number>();
    for (const sel of payload.rooms) {
      quantities.set(sel.roomTypeId, (quantities.get(sel.roomTypeId) || 0) + sel.quantity);
    }
    const selections = [...quantities].map(([roomTypeId, quantity]) => ({ roomTypeId, quantity }));
    const roomTypeIds = selections.map((s) => s.roomTypeId);

    // 1. Room types
    const { data: roomTypes, error: rtError } = await supabase
      .from("room_types")
      .select("id, name, base_price, status")
      .in("id", roomTypeIds);

    if (rtError) {
      logger.error("Failed to load room types for booking", { error: rtError });
      return fail(res, "DB_ERROR", "Unable to create booking reservation", 500);
    }
    if (!roomTypes || roomTypes.length !== roomTypeIds.length) {
      return fail(res, "INVALID_ROOM_TYPE", "One or more selected rooms were not found", 404);
    }

    const underConstructionRoom = roomTypes.find((rt) => rt.status === "under_construction");
    if (underConstructionRoom) {
      return fail(
        res,
        "ROOM_UNDER_CONSTRUCTION",
        `'${underConstructionRoom.name}' is under construction and cannot be booked yet.`,
        400
      );
    }

    // 2. Pricing inputs: seasonal overrides, deal, tax rate
    const [{ data: seasonalPrices }, taxRate] = await Promise.all([
      supabase
        .from("seasonal_prices")
        .select("room_type_id, start_date, end_date, price, created_at")
        .in("room_type_id", roomTypeIds)
        .lte("start_date", checkOutStr)
        .gte("end_date", checkInStr),
      getTaxRate(supabase),
    ]);

    let appliedDeal = null;
    if (payload.promoCode || payload.dealId) {
      appliedDeal = await findValidDeal(supabase, {
        promoCode: payload.promoCode,
        dealId: payload.dealId,
        onDate: checkInStr,
      });
      if (!appliedDeal) {
        return fail(
          res,
          "INVALID_PROMO_CODE",
          "The promo code is invalid, inactive, or not valid for your check-in date.",
          400
        );
      }
    }

    const quote = calculateBookingPricing({
      checkInDate: checkInStr,
      checkOutDate: checkOutStr,
      selections,
      basePrices: Object.fromEntries(roomTypes.map((rt) => [rt.id, rt.base_price])),
      seasonalPrices: (seasonalPrices || []).map((sp) => ({
        roomTypeId: sp.room_type_id,
        startDate: sp.start_date,
        endDate: sp.end_date,
        price: sp.price,
        createdAt: sp.created_at,
      })),
      deal: appliedDeal,
      taxRate,
    });

    // 3. Atomic insert with inventory lock (availability is re-checked inside the transaction)
    const initialStatus: BookingStatus = isWalkInAdminBooking ? "confirmed" : "pending";
    const bookingRef = generateBookingReference();
    const guestEmail = payload.guest.email.toLowerCase().trim();

    // Ownership: signed-in guests own their bookings; signed-out guests' bookings attach
    // immediately to a verified account with the same email, otherwise stay unowned
    let ownerId: string | null = null;
    let channel: BookingChannel;
    if (isWalkInAdminBooking) {
      channel = "walk_in";
    } else if (user) {
      ownerId = user.id;
      channel = "online_account";
    } else {
      channel = "online_guest";
      const { data: verifiedAccount } = await supabase
        .from("users")
        .select("id")
        .eq("email", guestEmail)
        .eq("is_email_verified", true)
        .maybeSingle();
      ownerId = verifiedAccount?.id ?? null;
    }

    const { data: newBooking, error: bookingError } = await supabase.rpc(
      "create_booking_with_lock",
      {
        p_reference: bookingRef,
        p_user_id: ownerId,
        p_status: initialStatus,
        p_channel: channel,
        p_guest_name: payload.guest.fullName,
        p_guest_email: guestEmail,
        p_guest_phone: payload.guest.phone,
        p_check_in: checkInStr,
        p_check_out: checkOutStr,
        p_nights: quote.nights,
        p_adults: payload.adults,
        p_children: payload.children,
        p_special_requests: payload.guest.specialRequests || null,
        p_subtotal: quote.subtotal,
        p_deal_discount: quote.dealDiscount,
        p_tax: quote.tax,
        p_total: quote.total,
        p_deal_id: appliedDeal?.id ?? null,
        p_privacy_consent_at: isWalkInAdminBooking ? null : new Date().toISOString(),
        p_max_pending_holds: MAX_LIVE_HOLDS_PER_EMAIL,
        p_line_items: quote.rooms.map((rm) => ({
          room_type_id: rm.roomTypeId,
          quantity: rm.quantity,
          // Average nightly rate actually charged (seasonal-aware)
          unit_price: Math.round(rm.lineSubtotal / (rm.quantity * quote.nights)),
          line_total: rm.lineSubtotal,
        })),
      }
    );

    if (bookingError || !newBooking) {
      if (bookingError?.message?.includes("TOO_MANY_PENDING_HOLDS")) {
        return fail(
          res,
          "TOO_MANY_PENDING_HOLDS",
          `You already have ${MAX_LIVE_HOLDS_PER_EMAIL} unpaid reservations on hold. Please complete or cancel one, wait for it to expire, or contact us on WhatsApp.`,
          429
        );
      }
      if (bookingError?.message?.includes("INSUFFICIENT_AVAILABILITY")) {
        const [roomTypeId, available] = String(bookingError.details || "").split(":");
        const rt = roomTypes.find((r) => r.id === roomTypeId);
        return fail(
          res,
          "INSUFFICIENT_AVAILABILITY",
          `'${rt?.name || "A selected room"}' is no longer available in the requested quantity for your selected dates.`,
          409,
          { roomTypeId, available: Number(available) || 0 }
        );
      }
      logger.error("Failed to create booking in database", { error: bookingError });
      return fail(res, "CREATE_BOOKING_FAILED", "Unable to create booking reservation", 500);
    }

    // 4. Walk-in / Admin booking (cash/POS/bank_transfer): record settled payment, audit log, and send confirmation
    if (isWalkInAdminBooking) {
      const gatewayRef =
        payload.paymentMethod === "bank_transfer" && payload.paymentReference
          ? payload.paymentReference.trim()
          : `${payload.paymentMethod.toUpperCase()}-WALKIN-${bookingRef}`;

      const { error: paymentError } = await supabase.from("payments").insert({
        booking_id: newBooking.id,
        gateway: payload.paymentMethod,
        gateway_reference: gatewayRef,
        amount: quote.total,
        currency: "NGN",
        status: "success",
        paid_at: new Date().toISOString(),
        metadata: {
          createdByAdmin: user!.id,
          paymentMethod: payload.paymentMethod,
          reference: gatewayRef,
        },
      });
      if (paymentError) {
        logger.error("Failed to record walk-in payment", { error: paymentError });
      }

      await recordAuditLog({
        userId: user!.id,
        action: "CREATE_ADMIN_BOOKING",
        entity: "booking",
        entityId: newBooking.id,
        newData: {
          reference: newBooking.reference,
          total: quote.total,
          paymentMethod: payload.paymentMethod,
          gatewayReference: gatewayRef,
        },
        req,
      });

      runAfterResponse("walk-in confirmation email", () =>
        sendBookingConfirmationEmail(supabase, newBooking)
      );
    }

    // "Manage booking" access for online bookings: cookie for this browser + private link
    let manageUrl: string | null = null;
    if (!isWalkInAdminBooking) {
      const accessToken = await issueBookingAccessToken(newBooking);
      rememberBookingAccess(req, res, newBooking.reference, accessToken);
      manageUrl = manageBookingUrl(newBooking.reference, accessToken);
    }

    return ok(
      res,
      {
        booking: newBooking,
        pricing: quote,
        paymentRequired: !isWalkInAdminBooking,
        manageUrl,
        linkedToAccount: Boolean(ownerId),
      },
      201
    );
  },
  {
    allowedMethods: ["GET", "POST"],
  }
);
