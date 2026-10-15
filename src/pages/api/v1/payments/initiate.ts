import crypto from "node:crypto";
import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { initializePayment } from "@/services/payments/paystack";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import { env } from "@/config/env";
import { authorizeBookingAccess } from "@/services/booking/access";

const initiateSchema = z.object({
  bookingReference: z.string().min(1, "Booking reference is required"),
});

export default withApi(
  async (req, res, { user }) => {
    const { bookingReference } = req.body as z.infer<typeof initiateSchema>;
    const supabase = getSupabaseAdminClient();

    // 1. Fetch booking reservation
    const { data: booking, error: bError } = await supabase
      .from("bookings")
      .select("*")
      .eq("reference", bookingReference.toUpperCase().trim())
      .maybeSingle();

    if (bError || !booking) {
      return fail(res, "NOT_FOUND", "Booking reservation not found", 404);
    }

    // 2. Only admins, the signed-in owner, or a guest holding the booking's access token may pay
    if (!(await authorizeBookingAccess(req, booking, user))) {
      return fail(res, "FORBIDDEN", "Access denied for this reservation", 403);
    }

    // 3. Status checks
    if (booking.status !== "pending") {
      return fail(
        res,
        booking.status === "cancelled" || booking.status === "no_show"
          ? "BOOKING_CANCELLED"
          : "ALREADY_CONFIRMED",
        booking.status === "cancelled" || booking.status === "no_show"
          ? "This booking reservation has been cancelled."
          : "This booking is already confirmed.",
        400
      );
    }

    // 4. The inventory hold was fixed when the booking was created (30 min, or 2 h in downtime mode)
    const holdExpiresAt = booking.hold_expires_at ? new Date(booking.hold_expires_at) : null;
    if (!holdExpiresAt || holdExpiresAt.getTime() <= Date.now()) {
      return fail(
        res,
        "HOLD_EXPIRED",
        "Your booking hold has expired. Please select your rooms again to start a new reservation.",
        400,
        { isHoldExpired: true }
      );
    }

    const { data: settledPayments } = await supabase
      .from("payments")
      .select("id")
      .eq("booking_id", booking.id)
      .in("status", ["success", "refund_pending"]);

    if (settledPayments && settledPayments.length > 0) {
      return fail(
        res,
        "ALREADY_PAID",
        "A payment for this booking is already being processed.",
        409
      );
    }

    // 5. Unique payment reference per attempt
    const paymentRef = `${booking.reference}-${crypto.randomBytes(16).toString("hex").toUpperCase()}`;
    const amountKobo = booking.total * 100;

    const { error: pInsertError } = await supabase.from("payments").insert({
      booking_id: booking.id,
      gateway: "paystack",
      gateway_reference: paymentRef,
      amount: booking.total,
      currency: "NGN",
      status: "pending",
      metadata: {
        bookingReference: booking.reference,
        initiatedBy: user?.id ?? "guest",
      },
    });

    if (pInsertError) {
      logger.error("Failed to insert pending payment record", { error: pInsertError });
      return fail(res, "DB_ERROR", "Could not initialize payment transaction", 500);
    }

    // 6. Request payment link from Paystack; the callback is always our own booking page
    try {
      const paystackRes = await initializePayment({
        email: booking.guest_email,
        amountKobo,
        reference: paymentRef,
        callbackUrl: `${env.NEXT_PUBLIC_APP_URL}/booking?bookingRef=${encodeURIComponent(booking.reference)}`,
        metadata: {
          bookingReference: booking.reference,
          bookingId: booking.id,
        },
      });

      return ok(res, {
        authorizationUrl: paystackRes.authorizationUrl,
        accessCode: paystackRes.accessCode,
        reference: paymentRef,
        amount: booking.total,
        currency: "NGN",
        expiresAt: holdExpiresAt.toISOString(),
      });
    } catch (err: unknown) {
      logger.error("Paystack initialization failed", { error: err });
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("gateway_reference", paymentRef)
        .eq("status", "pending");
      return fail(
        res,
        "GATEWAY_ERROR",
        "Online payment is temporarily unavailable. Please contact us on WhatsApp to complete your reservation.",
        502,
        { downtimeFallbackRecommended: true, whatsappAlternative: true }
      );
    }
  },
  {
    allowedMethods: ["POST"],
    bodySchema: initiateSchema,
  }
);
