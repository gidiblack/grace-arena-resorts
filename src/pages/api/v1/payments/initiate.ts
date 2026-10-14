import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { initializePayment } from "@/services/payments/paystack";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import {
  isGatewayDowntime,
  STANDARD_HOLD_WINDOW_MS,
  DOWNTIME_HOLD_WINDOW_MS,
} from "@/domain/payment/types";

const initiateSchema = z.object({
  bookingReference: z.string().min(1, "Booking reference is required"),
  callbackUrl: z.string().url("Invalid callback URL").optional(),
});

export default withApi(
  async (req, res, { user }) => {
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }

    const parseResult = initiateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return fail(res, "VALIDATION_ERROR", parseResult.error.issues[0]?.message || "Invalid payload", 400);
    }

    const { bookingReference, callbackUrl } = parseResult.data;
    const supabase = getSupabaseAdminClient();

    // 1. Fetch booking reservation
    const { data: booking, error: bError } = await supabase
      .from("bookings")
      .select("*")
      .eq("reference", bookingReference)
      .maybeSingle();

    if (bError || !booking) {
      return fail(res, "NOT_FOUND", "Booking reservation not found", 404);
    }

    // 2. Authorization check
    const isAdmin = ["resort_admin", "super_admin"].includes(user.role);
    if (!isAdmin && booking.user_id && booking.user_id !== user.id) {
      return fail(res, "FORBIDDEN", "Access denied for this reservation", 403);
    }

    // 3. Status checks
    if (booking.status === "confirmed" || booking.status === "checked_in" || booking.status === "checked_out") {
      return fail(res, "ALREADY_CONFIRMED", "This booking is already confirmed.", 400);
    }

    if (booking.status === "cancelled" || booking.status === "no_show") {
      return fail(res, "BOOKING_CANCELLED", "This booking reservation has been cancelled.", 400);
    }

    // 4. Check for gateway downtime setting and hold window
    const { data: downtimeSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "paystack_downtime")
      .maybeSingle();

    const isDowntime = isGatewayDowntime(downtimeSetting?.value);
    const holdDurationMs = isDowntime ? DOWNTIME_HOLD_WINDOW_MS : STANDARD_HOLD_WINDOW_MS;
    const elapsedMs = Date.now() - new Date(booking.created_at).getTime();

    if (elapsedMs > holdDurationMs) {
      return fail(
        res,
        "HOLD_EXPIRED",
        "Your 30-minute booking hold has expired. Please select your room again to start a new reservation.",
        400,
        {
          isHoldExpired: true,
          elapsedMinutes: Math.round(elapsedMs / (60 * 1000)),
        }
      );
    }

    // 5. Generate distinct payment reference to prevent gateway collision on retries
    const paymentRef = `${booking.reference}-${Date.now().toString().slice(-6)}`;
    const amountKobo = Math.round(booking.total * 100);

    // 6. Record payment attempt
    const { error: pInsertError } = await supabase.from("payments").insert({
      booking_id: booking.id,
      gateway: "paystack",
      gateway_reference: paymentRef,
      amount: booking.total,
      currency: "NGN",
      status: "pending",
      metadata: {
        bookingReference: booking.reference,
        guestEmail: booking.guest_email,
        guestName: booking.guest_name,
        initiatedBy: user.id,
        isDowntimeFallbackApplied: isDowntime,
      },
    });

    if (pInsertError) {
      logger.error("Failed to insert pending payment record", { error: pInsertError });
      return fail(res, "DB_ERROR", "Could not initialize payment transaction", 500);
    }

    // 7. Request payment link from Paystack
    try {
      const paystackRes = await initializePayment({
        email: booking.guest_email,
        amountKobo,
        reference: paymentRef,
        callbackUrl,
        metadata: {
          bookingReference: booking.reference,
          bookingId: booking.id,
          guestName: booking.guest_name,
        },
      });

      return ok(res, {
        authorizationUrl: paystackRes.authorizationUrl,
        accessCode: paystackRes.accessCode,
        reference: paymentRef,
        amount: booking.total,
        currency: "NGN",
        expiresAt: new Date(new Date(booking.created_at).getTime() + holdDurationMs).toISOString(),
        downtimeFallbackActive: isDowntime,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Payment gateway error";
      logger.error("Paystack initialization failed", { error: err });
      return fail(res, "GATEWAY_ERROR", errMsg, 502, {
        downtimeFallbackRecommended: true,
        whatsappAlternative: true,
      });
    }
  },
  {
    allowedMethods: ["POST"],
    requireAuth: true,
  }
);
