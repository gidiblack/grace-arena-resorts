import type { NextApiRequest } from "next";
import { withApi } from "@/pages/api/v1/_shared/handler";
import type { AuthUser } from "@/pages/api/v1/_shared/auth";
import { canTransition } from "@/domain/booking/state-machine";
import {
  calculateCancellationRefund,
  type RefundCalculationResult,
} from "@/domain/booking/cancellation";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { initiatePaystackRefund } from "@/services/payments/refund";
import { PaystackError } from "@/services/payments/paystack";
import { sendEmail } from "@/services/email";
import { authorizeBookingAccess } from "@/services/booking/access";
import { runAfterResponse } from "@/services/booking/notifications";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import type { BookingStatus, Database, Json } from "@/types/db";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

const POLICY_TIER = {
  full: "full_refund",
  half: "partial_refund",
  none: "no_refund",
} as const;

function describePolicy(refund: RefundCalculationResult, paid: number): string {
  if (paid === 0) return "No payment has been taken for this booking, so nothing will be refunded.";
  if (refund.tier === "full") return "Cancelled 72 or more hours before check-in: full refund.";
  if (refund.tier === "half") return "Cancelled 24–72 hours before check-in: 50% refund.";
  return "Cancelled less than 24 hours before check-in: no refund applies.";
}

async function loadBooking(req: NextApiRequest, user: AuthUser | undefined) {
  const ref = String(req.query.ref || "")
    .toUpperCase()
    .trim();
  const supabase = getSupabaseAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("reference", ref)
    .maybeSingle();
  // Admin, signed-in owner, or a guest holding the booking's manage link
  if (!booking || !(await authorizeBookingAccess(req, booking, user))) return null;

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", booking.id)
    .eq("status", "success");

  const payment: PaymentRow | null = payments?.[0] ?? null;
  const totalPaid = payment?.amount ?? 0;
  const refund = calculateCancellationRefund(totalPaid, booking.check_in_date, new Date());
  return { booking, payment, totalPaid, refund };
}

export default withApi(
  async (req, res, ctx) => {
    const user = ctx.user;
    const loaded = await loadBooking(req, user);

    if (!loaded) {
      return fail(res, "NOT_FOUND", "Booking not found or unauthorized", 404);
    }

    const { booking, payment, totalPaid, refund } = loaded;
    const cancellable = canTransition(booking.status as BookingStatus, "cancelled");

    // GET: refund preview, no side effects
    if (req.method === "GET") {
      return ok(res, {
        bookingReference: booking.reference,
        checkInDate: booking.check_in_date,
        hoursUntilCheckIn: Math.round(refund.hoursUntilCheckIn),
        policyTier: POLICY_TIER[refund.tier],
        refundPercentage: Math.round(refund.refundPercentage * 100),
        bookingTotal: booking.total,
        amountPaid: totalPaid,
        estimatedRefundAmount: refund.refundAmount,
        cancellable,
        reason: describePolicy(refund, totalPaid),
      });
    }

    // PUT: cancel
    if (!cancellable) {
      return fail(
        res,
        "INVALID_TRANSITION",
        `Cannot cancel a booking currently in '${booking.status}' status`,
        400
      );
    }

    const supabase = getSupabaseAdminClient();
    let refundStatus: "none" | "initiated" | "manual" = "none";

    // 1. Refund first: if the gateway refuses, the booking stays as it was so the guest can retry
    if (payment && refund.refundAmount > 0) {
      const { data: claimed } = await supabase
        .from("payments")
        .update({ status: "refund_pending", refund_amount: refund.refundAmount })
        .eq("id", payment.id)
        .eq("status", "success")
        .select()
        .maybeSingle();

      if (!claimed) {
        return fail(res, "CONFLICT", "This booking is already being cancelled", 409);
      }

      if (payment.gateway === "paystack" && payment.gateway_reference) {
        try {
          const gatewayRefund = await initiatePaystackRefund({
            transactionReferenceOrId: payment.gateway_reference,
            amountKobo: refund.refundAmount * 100,
            customerNote: `Cancellation refund for reservation ${booking.reference}`,
            merchantNote: `Guest cancellation (${refund.tier})`,
          });
          await supabase
            .from("payments")
            .update({
              metadata: {
                ...((payment.metadata as Record<string, Json>) || {}),
                refundId: String(gatewayRefund.refundId),
                refundReason: "GUEST_CANCELLATION",
              },
            })
            .eq("id", payment.id);
          refundStatus = "initiated";
        } catch (error) {
          const isAlreadyRefunded =
            (error instanceof PaystackError &&
              ((error.responseData as { code?: string })?.code === "transaction_reversed" ||
                error.message.toLowerCase().includes("already exist"))) ||
            (error instanceof Error && error.message.toLowerCase().includes("already exist"));

          if (isAlreadyRefunded) {
            logger.info("Paystack refund already exists on gateway, proceeding with cancellation", {
              reference: booking.reference,
            });
            await supabase
              .from("payments")
              .update({
                status: "refund_pending",
                refund_amount: refund.refundAmount,
                metadata: {
                  ...((payment.metadata as Record<string, Json>) || {}),
                  refundReason: "GUEST_CANCELLATION",
                  alreadyRefundedOnGateway: true,
                },
              })
              .eq("id", payment.id);
            refundStatus = "initiated";
          } else {
            logger.error("Paystack refund failed during cancellation", {
              reference: booking.reference,
              error: error instanceof Error ? error.message : String(error),
            });
            await supabase
              .from("payments")
              .update({ status: "success", refund_amount: null })
              .eq("id", payment.id);
            return fail(
              res,
              "REFUND_FAILED",
              "We could not process your refund right now, so the booking has not been cancelled. Please try again or contact us on WhatsApp.",
              502
            );
          }
        }
      } else {
        // Cash/POS walk-in payments are refunded at the front desk
        await supabase
          .from("payments")
          .update({
            metadata: {
              ...((payment.metadata as Record<string, Json>) || {}),
              manualRefundRequired: true,
            },
          })
          .eq("id", payment.id);
        refundStatus = "manual";
      }
    }

    // 2. Cancel (conditional on the status we read, to avoid racing admin/system updates)
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled", hold_expires_at: null })
      .eq("id", booking.id)
      .eq("status", booking.status)
      .select()
      .maybeSingle();

    if (updateError || !updatedBooking) {
      logger.error("Failed to cancel booking after refund step", {
        reference: booking.reference,
        refundStatus,
        error: updateError,
      });
      return fail(res, "CANCEL_FAILED", "Failed to cancel booking. Please contact us.", 500);
    }

    await recordAuditLog({
      userId: user?.id ?? null,
      action: "CANCEL_BOOKING",
      entity: "booking",
      entityId: booking.id,
      previousData: { status: booking.status },
      newData: { status: "cancelled", refund: refund as unknown as Json, refundStatus },
      req,
    });

    if (refundStatus === "initiated") {
      runAfterResponse("refund initiated email", () =>
        sendEmail({
          to: booking.guest_email,
          templateId: "booking_refund_initiated",
          templateData: {
            reference: booking.reference,
            amount: refund.refundAmount,
            message: "Your refund will reflect in your account within 5–10 business days.",
          },
        })
      );
    }

    return ok(res, {
      booking: updatedBooking,
      refund,
      refundStatus,
      message:
        refund.refundAmount > 0
          ? `Booking cancelled. A refund of ₦${refund.refundAmount.toLocaleString()} (${Math.round(refund.refundPercentage * 100)}%) has been initiated and will reflect in 5–10 business days.`
          : totalPaid > 0
            ? "Booking cancelled. Per resort policy, no refund applies for cancellations within 24 hours of check-in."
            : "Booking cancelled.",
    });
  },
  {
    allowedMethods: ["GET", "PUT"],
  }
);
