import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { initiatePaystackRefund } from "@/services/payments/refund";
import { sendEmail } from "@/services/email";
import { runAfterResponse } from "@/services/booking/notifications";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import type { Json } from "@/types/db";

const recordRefundSchema = z.object({
  action: z.enum(["mark_processed", "mark_failed", "retry_paystack"]),
  reference: z.string().trim().optional(),
  refundedAt: z.string().optional(),
  destination: z
    .object({
      bankName: z.string().trim().min(2, "Bank name required"),
      accountLast4: z.string().trim().regex(/^\d{4}$/, "Must be last 4 digits of account"),
    })
    .optional(),
  note: z.string().max(500).optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    const { action, reference, refundedAt, destination, note } = req.body as z.infer<
      typeof recordRefundSchema
    >;
    const user = ctx.user!;

    if (!id || typeof id !== "string") {
      return fail(res, "MISSING_ID", "Payment ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // 1. Fetch payment
    const { data: payment, error: pError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (pError || !payment) {
      return fail(res, "NOT_FOUND", "Payment record not found", 404);
    }

    if (!["refund_pending", "refund_failed"].includes(payment.status)) {
      return fail(
        res,
        "INVALID_PAYMENT_STATUS",
        `Only payments in 'refund_pending' or 'refund_failed' can be updated. Current status is '${payment.status}'.`,
        400
      );
    }

    const existingMetadata = (payment.metadata as Record<string, Json>) || {};
    const refundAmount = payment.refund_amount ?? payment.amount;

    if (action === "mark_processed") {
      const isFullRefund = refundAmount >= payment.amount;
      const targetStatus = isFullRefund ? "refunded" : "partially_refunded";
      const nowIso = refundedAt || new Date().toISOString();

      const updatedMetadata: Record<string, Json> = {
        ...existingMetadata,
      };
      if (destination) {
        // Safe: store ONLY bankName and last 4 digits, never full bank accounts (SRS v1.4)
        updatedMetadata.refundDestination = {
          bankName: destination.bankName,
          accountLast4: destination.accountLast4,
        };
      }

      const { data: updatedPayment, error: uError } = await supabase
        .from("payments")
        .update({
          status: targetStatus,
          refunded_at: nowIso,
          refund_reference: reference || null,
          refund_processed_by: user.id,
          refund_note: note || payment.refund_note,
          metadata: updatedMetadata,
        })
        .eq("id", payment.id)
        .select()
        .single();

      if (uError || !updatedPayment) {
        logger.error("Failed to update refund status to processed", { error: uError });
        return fail(res, "UPDATE_FAILED", "Failed to update payment record", 500);
      }

      // Fetch booking and send completion email
      const { data: booking } = await supabase
        .from("bookings")
        .select("reference, guest_email")
        .eq("id", payment.booking_id)
        .maybeSingle();

      if (booking) {
        runAfterResponse("manual refund completion email", () =>
          sendEmail({
            to: booking.guest_email,
            templateId: "booking_refund_completed",
            templateData: {
              reference: booking.reference,
              amount: refundAmount,
            },
          })
        );
      }

      await recordAuditLog({
        userId: user.id,
        action: "RECORD_REFUND_PROCESSED",
        entity: "payment",
        entityId: payment.id,
        previousData: { status: payment.status },
        newData: {
          status: targetStatus,
          refundReference: reference,
          refundedAt: nowIso,
          destination,
          note,
        },
        req,
      });

      return ok(res, {
        payment: updatedPayment,
        message: "Manual refund marked as processed successfully.",
      });
    }

    if (action === "mark_failed") {
      const { data: updatedPayment, error: uError } = await supabase
        .from("payments")
        .update({
          status: "refund_failed",
          refund_note: note || payment.refund_note,
          refund_processed_by: user.id,
        })
        .eq("id", payment.id)
        .select()
        .single();

      if (uError || !updatedPayment) {
        return fail(res, "UPDATE_FAILED", "Failed to update payment status to refund_failed", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "RECORD_REFUND_FAILED",
        entity: "payment",
        entityId: payment.id,
        previousData: { status: payment.status },
        newData: { status: "refund_failed", note },
        req,
      });

      return ok(res, {
        payment: updatedPayment,
        message: "Refund status updated to failed. It remains in the resolution queue.",
      });
    }

    if (action === "retry_paystack") {
      if (payment.gateway !== "paystack" || !payment.gateway_reference) {
        return fail(
          res,
          "INVALID_GATEWAY",
          "Cannot retry Paystack refund on a payment made through an offline gateway.",
          400
        );
      }

      try {
        const gatewayRefund = await initiatePaystackRefund({
          transactionReferenceOrId: payment.gateway_reference,
          amountKobo: refundAmount * 100,
          customerNote: `Cancellation refund retry`,
          merchantNote: note || `Admin retry`,
        });

        const { data: updatedPayment } = await supabase
          .from("payments")
          .update({
            status: "refund_pending",
            metadata: {
              ...existingMetadata,
              refundId: String(gatewayRefund.refundId),
              retriedAt: new Date().toISOString(),
            },
          })
          .eq("id", payment.id)
          .select()
          .single();

        await recordAuditLog({
          userId: user.id,
          action: "RETRY_PAYSTACK_REFUND",
          entity: "payment",
          entityId: payment.id,
          newData: { refundId: gatewayRefund.refundId, note },
          req,
        });

        return ok(res, {
          payment: updatedPayment,
          message: "Paystack refund retry submitted successfully.",
        });
      } catch (err) {
        logger.error("Paystack refund retry failed", { error: err });
        return fail(
          res,
          "GATEWAY_ERROR",
          err instanceof Error ? err.message : "Paystack refund retry rejected",
          502
        );
      }
    }

    return fail(res, "BAD_ACTION", "Unrecognized refund action", 400);
  },
  {
    allowedMethods: ["POST"],
    requireAuth: true,
    requiredRoles: ["resort_admin", "super_admin"],
    bodySchema: recordRefundSchema,
  }
);
