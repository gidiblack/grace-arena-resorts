import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { verifyPayment } from "@/services/payments/paystack";
import { settleSuccessfulCharge } from "@/services/payments/settlement";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res, { user }) => {
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }

    // Paystack appends ?reference=<transaction ref>&trxref=<same> to the callback URL
    const rawRef = req.query.reference ?? req.query.trxref ?? req.body?.reference;
    const reference = Array.isArray(rawRef) ? rawRef[0] : rawRef;

    if (!reference || typeof reference !== "string") {
      return fail(res, "VALIDATION_ERROR", "Payment reference is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // 1. Resolve our payment record by exact gateway reference and check ownership first
    const { data: payment } = await supabase
      .from("payments")
      .select("id, booking_id, status")
      .eq("gateway", "paystack")
      .eq("gateway_reference", reference)
      .maybeSingle();

    if (!payment) {
      return fail(res, "NOT_FOUND", "Payment record not found", 404);
    }

    const { data: ownerCheck } = await supabase
      .from("bookings")
      .select("user_id")
      .eq("id", payment.booking_id)
      .single();

    const isAdmin = ["resort_admin", "super_admin"].includes(user.role);
    if (!isAdmin && ownerCheck?.user_id !== user.id) {
      return fail(res, "FORBIDDEN", "Access denied", 403);
    }

    // 2. Verify with Paystack
    let verified;
    try {
      verified = await verifyPayment(reference);
    } catch (err: unknown) {
      logger.error("Paystack verify call failed", { reference, error: err });
      return fail(
        res,
        "GATEWAY_ERROR",
        "Unable to confirm payment with the gateway right now",
        502
      );
    }

    // 3. Settle (shared with the webhook; idempotent)
    if (verified.status === "success") {
      try {
        await settleSuccessfulCharge(supabase, {
          reference,
          amountKobo: verified.amountKobo,
          currency: verified.currency,
          paidAt: verified.paidAt,
        });
      } catch (err) {
        logger.error("Payment settlement failed during verify", { reference, error: err });
        return fail(res, "SETTLEMENT_FAILED", "We could not finalise your payment yet", 502);
      }
    } else if (verified.status === "failed") {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id)
        .eq("status", "pending");
    }

    // 4. Report the real post-settlement state
    const [{ data: booking }, { data: latestPayment }] = await Promise.all([
      supabase
        .from("bookings")
        .select(
          "reference, status, guest_name, guest_email, check_in_date, check_out_date, nights, total"
        )
        .eq("id", payment.booking_id)
        .single(),
      supabase.from("payments").select("status").eq("id", payment.id).single(),
    ]);

    return ok(res, {
      verified: verified.status === "success" && booking?.status === "confirmed",
      paymentStatus: latestPayment?.status ?? payment.status,
      bookingStatus: booking?.status,
      gatewayMessage: verified.gatewayResponse || null,
      booking: booking
        ? {
            reference: booking.reference,
            guestName: booking.guest_name,
            guestEmail: booking.guest_email,
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            nights: booking.nights,
            total: booking.total,
          }
        : null,
    });
  },
  {
    allowedMethods: ["GET", "POST"],
    requireAuth: true,
  }
);
