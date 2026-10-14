import { withApi } from "@/pages/api/v1/_shared/handler";
import { assertTransition } from "@/domain/booking/state-machine";
import { calculateCancellationRefund } from "@/domain/booking/cancellation";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import type { BookingStatus, Json } from "@/types/db";

export default withApi(
  async (req, res, ctx) => {
    const { ref } = req.query;
    const user = ctx.user!;

    if (!ref || typeof ref !== "string") {
      return fail(res, "MISSING_REF", "Booking reference is required", 400);
    }

    const supabase = getSupabaseAdminClient();
    const isAdmin = ["resort_admin", "super_admin"].includes(user.role);

    // 1. Fetch booking
    let query = supabase
      .from("bookings")
      .select("*")
      .eq("reference", ref.toUpperCase().trim());

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error || !booking) {
      return fail(res, "NOT_FOUND", "Booking not found or unauthorized", 404);
    }

    // 2. Validate state transition: pending -> cancelled or confirmed -> cancelled
    try {
      assertTransition(booking.status as BookingStatus, "cancelled");
    } catch {
      return fail(
        res,
        "INVALID_TRANSITION",
        `Cannot cancel a booking currently in '${booking.status}' status`,
        400
      );
    }

    // 3. Fetch payment and compute refund if confirmed
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", booking.id);

    const payment = payments?.find((p) => p.status === "success");
    const totalPaid = payment ? payment.amount : 0;
    const refundDetails = calculateCancellationRefund(totalPaid, booking.check_in_date, new Date(), 14);

    // 4. Update booking status to cancelled
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .select()
      .single();

    if (updateError || !updatedBooking) {
      logger.error("Failed to cancel booking", { error: updateError });
      return fail(res, "CANCEL_FAILED", "Failed to cancel booking", 500);
    }

    // 5. Update payment record if refund is due
    if (payment && refundDetails.refundAmount > 0) {
      const newPaymentStatus =
        refundDetails.refundAmount >= payment.amount ? "refunded" : "partially_refunded";

      await supabase
        .from("payments")
        .update({
          status: newPaymentStatus,
          refund_amount: refundDetails.refundAmount,
          refunded_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
    }

    // 6. Record audit log
    await recordAuditLog({
      userId: user.id,
      action: "CANCEL_BOOKING",
      entity: "booking",
      entityId: booking.id,
      previousData: { status: booking.status },
      newData: { status: "cancelled", refund: refundDetails as unknown as Json },
      req,
    });

    return ok(res, {
      booking: updatedBooking,
      refund: refundDetails,
      message:
        refundDetails.refundAmount > 0
          ? `Booking cancelled. A refund of ₦${refundDetails.refundAmount.toLocaleString()} (${refundDetails.refundPercentage * 100}%) has been initiated and will reflect in 5–10 business days.`
          : "Booking cancelled. Per resort policy, no refund applies for cancellations within 24 hours of check-in.",
    });
  },
  {
    allowedMethods: ["PUT"],
    requireAuth: true,
  }
);
