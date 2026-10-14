import { z } from "zod";
import { withApi } from "../_shared/handler";
import { parsePagination, setPaginationHeaders } from "../_shared/pagination";
import { generateBookingReference } from "@/domain/booking/reference";
import { calculateBookingPricing } from "@/services/pricing/pricing-engine";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { sendEmail } from "@/services/email/sendgrid";
import { generateBookingPdfBuffer } from "@/services/pdf/booking-pdf";
import { logger } from "@/lib/logger";
import type { BookingStatus, Database } from "@/types/db";

const createBookingSchema = z.object({
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  nights: z.number().int().min(1, "Minimum stay is 1 night").max(30, "Maximum stay is 30 nights"),
  rooms: z
    .array(
      z.object({
        roomTypeId: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
      })
    )
    .min(1, "Select at least one room"),
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  guest: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().regex(/^\+234\d{10}$/, "Format must be +234XXXXXXXXXX"),
    specialRequests: z.string().max(500).optional(),
  }),
  dealId: z.string().optional(),
  promoCode: z.string().optional(),
  paymentMethod: z.enum(["paystack", "cash", "pos"]).optional().default("paystack"),
});

export default withApi(
  async (req, res, ctx) => {
    const user = ctx.user!;
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List bookings
    // ==========================================
    if (req.method === "GET") {
      const { page, limit, offset } = parsePagination(req);
      const { status, reference, guestEmail } = req.query;

      const isAdmin = ["resort_admin", "super_admin", "content_manager"].includes(user.role);

      let query = supabase.from("bookings").select("*", { count: "exact" });

      if (!isAdmin) {
        // Guests can ONLY view their own bookings per SRS Section 4.1
        query = query.eq("user_id", user.id);
      } else {
        // Admin filters
        if (status && typeof status === "string") {
          query = query.eq("status", status as BookingStatus);
        }
        if (reference && typeof reference === "string") {
          query = query.ilike("reference", `%${reference}%`);
        }
        if (guestEmail && typeof guestEmail === "string") {
          query = query.ilike("guest_email", `%${guestEmail}%`);
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
    if (req.method === "POST") {
      const parseResult = createBookingSchema.safeParse(req.body);
      if (!parseResult.success) {
        return fail(
          res,
          "VALIDATION_ERROR",
          parseResult.error.issues[0]?.message || "Invalid payload",
          400
        );
      }
      const payload = parseResult.data;
      const isAdmin = ["resort_admin", "super_admin"].includes(user.role);
      const isWalkInAdminBooking =
        isAdmin && (payload.paymentMethod === "cash" || payload.paymentMethod === "pos");

      // Enforce email verification for online booking guests per GAR-SRS Section 4.1
      if (!isAdmin && !user.isEmailVerified) {
        return fail(
          res,
          "EMAIL_NOT_VERIFIED",
          "Email verification is required before creating online reservations. Please verify your email first.",
          403
        );
      }

      const checkIn = new Date(payload.checkInDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkIn < today) {
        return fail(res, "PAST_DATE", "Check-in date cannot be in the past", 400);
      }

      const checkOut = new Date(checkIn.getTime() + payload.nights * 24 * 60 * 60 * 1000);
      const checkInStr = checkIn.toISOString().slice(0, 10);
      const checkOutStr = checkOut.toISOString().slice(0, 10);

      // 1. Fetch room types and verify existence and availability
      const roomTypeIds = payload.rooms.map((r) => r.roomTypeId);
      const { data: roomTypes, error: rtError } = await supabase
        .from("room_types")
        .select("id, name, base_price, total_units, status")
        .in("id", roomTypeIds);

      if (rtError || !roomTypes || roomTypes.length !== roomTypeIds.length) {
        return fail(res, "INVALID_ROOM_TYPE", "One or more selected rooms were not found", 404);
      }

      // Ensure no under_construction room is selected
      const underConstructionRoom = roomTypes.find((rt) => rt.status === "under_construction");
      if (underConstructionRoom) {
        return fail(
          res,
          "ROOM_UNDER_CONSTRUCTION",
          `'${underConstructionRoom.name}' is under construction and cannot be booked yet.`,
          400
        );
      }

      // Check unit availability for each room
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select("id, status, created_at")
        .lt("check_in_date", checkOutStr)
        .gt("check_out_date", checkInStr)
        .in("status", ["confirmed", "checked_in", "pending"]);

      const now = Date.now();
      const validBookingIds = (activeBookings || [])
        .filter((b) => {
          if (b.status === "pending") {
            const created = new Date(b.created_at).getTime();
            return now - created <= 30 * 60 * 1000; // not expired hold
          }
          return true;
        })
        .map((b) => b.id);

      const bookedCounts: Record<string, number> = {};
      if (validBookingIds.length > 0) {
        const { data: items } = await supabase
          .from("booking_line_items")
          .select("room_type_id, quantity")
          .in("booking_id", validBookingIds);

        (items || []).forEach((item) => {
          bookedCounts[item.room_type_id] = (bookedCounts[item.room_type_id] || 0) + item.quantity;
        });
      }

      for (const sel of payload.rooms) {
        const rt = roomTypes.find((r) => r.id === sel.roomTypeId)!;
        const alreadyBooked = bookedCounts[sel.roomTypeId] || 0;
        const available = rt.total_units - alreadyBooked;

        if (available < sel.quantity) {
          return fail(
            res,
            "INSUFFICIENT_AVAILABILITY",
            `'${rt.name}' is no longer available in the requested quantity for your selected dates.`,
            409,
            { roomTypeId: sel.roomTypeId, available, requested: sel.quantity }
          );
        }
      }

      // 2. Fetch seasonal prices
      const { data: seasonalPrices } = await supabase
        .from("seasonal_prices")
        .select("room_type_id, start_date, end_date, price, created_at")
        .in("room_type_id", roomTypeIds)
        .lte("start_date", checkOutStr)
        .gte("end_date", checkInStr);

      // 3. Fetch deal if promo code or dealId provided
      let appliedDeal = null;
      if (payload.promoCode || payload.dealId) {
        let dealQuery = supabase.from("deals").select("*").eq("is_active", true);
        if (payload.promoCode) {
          dealQuery = dealQuery.ilike("promo_code", payload.promoCode.trim());
        } else if (payload.dealId) {
          dealQuery = dealQuery.eq("id", payload.dealId);
        }
        const { data: deal } = await dealQuery.maybeSingle();
        if (deal) {
          appliedDeal = {
            id: deal.id,
            discountType: deal.discount_type as "percentage" | "fixed",
            discountValue: deal.discount_value,
            applicableRoomTypeIds: (deal.applicable_room_type_ids as string[]) || [],
            startDate: deal.start_date,
            endDate: deal.end_date,
            isActive: deal.is_active,
          };
        }
      }

      // 4. Calculate accurate pricing
      const basePricesMap: Record<string, number> = {};
      roomTypes.forEach((rt) => {
        basePricesMap[rt.id] = rt.base_price;
      });

      const quote = calculateBookingPricing({
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        selections: payload.rooms,
        basePrices: basePricesMap,
        seasonalPrices: (seasonalPrices || []).map((sp) => ({
          roomTypeId: sp.room_type_id,
          startDate: sp.start_date,
          endDate: sp.end_date,
          price: sp.price,
          createdAt: sp.created_at,
        })),
        deal: appliedDeal,
        taxRate: 0.075,
      });

      // 5. Generate unique booking reference (GAR-XXXXXXXX)
      const bookingRef = generateBookingReference();

      // Determine initial status:
      // Walk-in admin booking with cash/pos is confirmed immediately; online booking is pending
      const initialStatus = isWalkInAdminBooking ? "confirmed" : "pending";
      const assignedUserId = isWalkInAdminBooking ? null : user.id;

      // 6. Insert Booking record
      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          reference: bookingRef,
          user_id: assignedUserId,
          guest_name: payload.guest.fullName,
          guest_email: payload.guest.email,
          guest_phone: payload.guest.phone,
          check_in_date: checkInStr,
          check_out_date: checkOutStr,
          nights: quote.nights,
          adults: payload.adults,
          children: payload.children,
          special_requests: payload.guest.specialRequests || null,
          subtotal: quote.subtotal,
          deal_discount: quote.dealDiscount,
          tax: quote.tax,
          total: quote.total,
          status: initialStatus,
          deal_id: appliedDeal?.id || null,
        })
        .select()
        .single();

      if (bookingError || !newBooking) {
        logger.error("Failed to create booking in database", { error: bookingError });
        return fail(res, "CREATE_BOOKING_FAILED", "Unable to create booking reservation", 500);
      }

      // 7. Insert Booking Line Items
      const lineItemInserts = quote.rooms.map((rm) => {
        const rt = roomTypes.find((r) => r.id === rm.roomTypeId)!;
        return {
          booking_id: newBooking.id,
          room_type_id: rm.roomTypeId,
          quantity: rm.quantity,
          unit_price: rt.base_price,
          line_total: rm.lineSubtotal,
        };
      });

      const { error: lineItemError } = await supabase
        .from("booking_line_items")
        .insert(lineItemInserts);
      if (lineItemError) {
        logger.error("Failed to insert booking line items", { error: lineItemError });
      }

      // 8. If Walk-in Confirmed: Record Payment & Send Confirmation Email with PDF
      if (isWalkInAdminBooking) {
        await supabase.from("payments").insert({
          booking_id: newBooking.id,
          gateway: payload.paymentMethod,
          gateway_reference: `POS-WALKIN-${bookingRef}`,
          amount: quote.total,
          currency: "NGN",
          status: "success",
          paid_at: new Date().toISOString(),
          metadata: { createdByAdmin: user.id, paymentMethod: payload.paymentMethod },
        });

        // Generate confirmation PDF and send email
        try {
          const pdfBuffer = await generateBookingPdfBuffer({
            reference: bookingRef,
            status: "CONFIRMED",
            guestName: payload.guest.fullName,
            guestEmail: payload.guest.email,
            guestPhone: payload.guest.phone,
            checkInDate: checkInStr,
            checkOutDate: checkOutStr,
            nights: quote.nights,
            rooms: quote.rooms.map((rm) => {
              const rt = roomTypes.find((r) => r.id === rm.roomTypeId)!;
              return {
                name: rt.name,
                quantity: rm.quantity,
                unitPrice: rt.base_price,
                lineTotal: rm.lineSubtotal,
              };
            }),
            subtotal: quote.subtotal,
            dealDiscount: quote.dealDiscount,
            tax: quote.tax,
            total: quote.total,
            createdAt: new Date().toISOString(),
            paymentGateway: payload.paymentMethod.toUpperCase(),
          });

          await sendEmail({
            to: payload.guest.email,
            templateId: "booking_confirmation",
            templateData: { reference: bookingRef, name: payload.guest.fullName },
            attachments: [
              {
                content: pdfBuffer.toString("base64"),
                filename: `GraceArenaResorts-${bookingRef}.pdf`,
                type: "application/pdf",
              },
            ],
          });
        } catch (emailErr) {
          logger.error("Error generating PDF or sending walk-in confirmation email", {
            error: emailErr,
          });
        }
      }

      return ok(
        res,
        {
          booking: newBooking,
          pricing: quote,
          paymentRequired: !isWalkInAdminBooking,
        },
        201
      );
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    requireAuth: true,
  }
);
