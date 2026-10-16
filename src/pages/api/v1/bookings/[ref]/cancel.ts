import type { NextApiRequest } from "next";
import { z } from "zod";
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
import type { BookingStatus, Database, Json, RefundMethod } from "@/types/db";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

const POLICY_TIER = {
  full: "full_refund",
  half: "partial_refund",
  none: "no_refund",
} as const;

const cancelRequestSchema = z.object({
  refundAmountOverride: z.number().int().min(0).optional(),
  overrideReason: z.string().trim().min(3).optional(),
  refundMethod: z.enum(["bank_transfer", "cash", "pos_reversal"]).optional(),
  forceManualRefund: z.boolean().optional(),
}).optional();

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

    const bodyParsed = cancelRequestSchema.safeParse(req.body || {});
    const payload = bodyParsed.success ? bodyParsed.data : undefined;
    const isAdmin = Boolean(user && ["resort_admin", "super_admin"].includes(user.role));

    // Handle Admin Refund Override
    let finalRefundAmount = refund.refundAmount;
    if (payload?.refundAmountOverride !== undefined) {
      if (!isAdmin) {
        return fail(res, "FORBIDDEN", "Only administrators can override refund amounts", 403);
      }
      if (!payload.overrideReason || !payload.overrideReason.trim()) {
        return fail(res, "MISSING_REASON", "A mandatory reason is required to override refund amounts", 400);
      }
      if (payload.refundAmountOverride < 0 || payload.refundAmountOverride > totalPaid) {
        return fail(
          res,
          "INVALID_OVERRIDE_AMOUNT",
          `Refund override must be between ₦0 and amount paid (₦${totalPaid.toLocaleString()})`,
          400
        );
      }
      finalRefundAmount = payload.refundAmountOverride;
    }

    const supabase = getSupabaseAdminClient();
    let refundStatus: "none" | "initiated" | "manual" = "none";
    let chosenRefundMethod: RefundMethod = "paystack";

    // 1. Process or stage refund
    if (payment && finalRefundAmount > 0) {
      const isPaystack = payment.gateway === "paystack" && payment.gateway_reference;
      const isManualForced = Boolean(payload?.forceManualRefund);

      chosenRefundMethod = payload?.refundMethod || (
        payment.gateway === "bank_transfer"
          ? "bank_transfer"
          : payment.gateway === "pos"
            ? "pos_reversal"
            : payment.gateway === "cash"
              ? "cash"
              : "bank_transfer"
      );

      const { data: claimed } = await supabase
        .from("payments")
        .update({
          status: "refund_pending",
          refund_amount: finalRefundAmount,
          refund_method: !isPaystack || isManualForced ? chosenRefundMethod : "paystack",
        })
        .eq("id", payment.id)
        .eq("status", "success")
        .select()
        .maybeSingle();

      if (!claimed) {
        return fail(res, "CONFLICT", "This booking is already being cancelled", 409);
      }

      if (isPaystack && !isManualForced) {
        try {
          const gatewayRefund = await initiatePaystackRefund({
            transactionReferenceOrId: payment.gateway_reference!,
            amountKobo: finalRefundAmount * 100,
            customerNote: `Cancellation refund for reservation ${booking.reference}`,
            merchantNote: isAdmin && payload?.overrideReason
              ? `Admin override (${payload.overrideReason})`
              : `Guest cancellation (${refund.tier})`,
          });
          await supabase
            .from("payments")
            .update({
              metadata: {
                ...((payment.metadata as Record<string, Json>) || {}),
                refundId: String(gatewayRefund.refundId),
                refundReason: isAdmin ? "ADMIN_CANCELLATION" : "GUEST_CANCELLATION",
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
                refund_amount: finalRefundAmount,
                metadata: {
                  ...((payment.metadata as Record<string, Json>) || {}),
                  refundReason: isAdmin ? "ADMIN_CANCELLATION" : "GUEST_CANCELLATION",
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

            // Revert payment status
            await supabase
              .from("payments")
              .update({ status: "success", refund_amount: null })
              .eq("id", payment.id);

            return fail(
              res,
              "REFUND_FAILED",
              "We could not process your refund right now with Paystack. Administrators can select 'Refund manually instead' to proceed with cancellation.",
              502,
              { allowManualRefund: isAdmin }
            );
          }
        }
      } else {
        // Offline payments or manual override: no Paystack call, tracked as manual refund
        await supabase
          .from("payments")
          .update({
            metadata: {
              ...((payment.metadata as Record<string, Json>) || {}),
              manualRefundRequired: true,
              overrideReason: payload?.overrideReason || null,
            },
          })
          .eq("id", payment.id);
        refundStatus = "manual";
      }
    }

    // 2. Cancel booking and record audit trail
    const cancellationReason = isAdmin ? "admin_cancelled" : "guest_request";
    const nowIso = new Date().toISOString();

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        hold_expires_at: null,
        cancellation_reason: cancellationReason,
        cancelled_at: nowIso,
        cancelled_by: user?.id || null,
        status_changed_by: user?.id || null,
      })
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
      newData: {
        status: "cancelled",
        cancellationReason,
        refundAmount: finalRefundAmount,
        refundStatus,
        overrideReason: payload?.overrideReason,
        chosenRefundMethod,
      },
      req,
    });

    if (finalRefundAmount > 0) {
      const emailMessage =
        refundStatus === "manual" || chosenRefundMethod === "bank_transfer"
          ? "Your refund will be sent by bank transfer. Our resort staff will contact you to confirm transfer details."
          : "Your refund will reflect in your account within 5–10 business days.";

      runAfterResponse("refund initiated email", () =>
        sendEmail({
          to: booking.guest_email,
          templateId: "booking_refund_initiated",
          templateData: {
            reference: booking.reference,
            amount: finalRefundAmount,
            refundMethod: chosenRefundMethod,
            message: emailMessage,
          },
        })
      );
    }

    return ok(res, {
      booking: updatedBooking,
      refund: {
        ...refund,
        refundAmount: finalRefundAmount,
        overrideApplied: finalRefundAmount !== refund.refundAmount,
      },
      refundStatus,
      message:
        finalRefundAmount > 0
          ? `Booking cancelled. A refund of ₦${finalRefundAmount.toLocaleString()} has been initiated (${refundStatus === "manual" ? "manual processing queue" : "gateway"}).`
          : totalPaid > 0
            ? "Booking cancelled. Per resort policy, no refund applies for cancellations within 24 hours of check-in."
            : "Booking cancelled.",
    });
  },
  {
    allowedMethods: ["GET", "PUT"],
  }
);
