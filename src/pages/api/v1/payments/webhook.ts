import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { isValidPaystackSignature } from "@/services/payments/signature";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { settleSuccessfulCharge } from "@/services/payments/settlement";
import { sendEmail } from "@/services/email/sendgrid";
import { logger } from "@/lib/logger";
import type { PaystackWebhookPayload } from "@/domain/payment/types";
import type { Json } from "@/types/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Stable idempotency key per Paystack event. Refund events carry their own id; charge events
 * are keyed by transaction id/reference.
 */
export function webhookEventKey(payload: PaystackWebhookPayload): string | null {
  const id = payload.data?.id ?? payload.data?.refund?.id;
  const ref = payload.data?.reference || payload.data?.transaction_reference;
  if (id === undefined && !ref) return null;
  return `${payload.event}:${id ?? ref}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Only POST allowed" },
    });
  }

  // 1. Read raw body stream
  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    logger.error("Failed to read raw body for Paystack webhook", { error: err });
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: "Unable to read request payload" },
    });
  }

  // 2. Cryptographic signature validation (HMAC-SHA512 with the Paystack secret key)
  const signature = req.headers["x-paystack-signature"];
  if (!isValidPaystackSignature(rawBody, signature)) {
    logger.warn("Unauthorized Paystack webhook attempt with invalid signature", {
      headerPresent: Boolean(signature),
    });
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_SIGNATURE",
        message: "Unauthorized: Webhook signature verification failed",
      },
    });
  }

  // 3. Parse JSON event
  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    logger.error("Failed to parse Paystack webhook JSON payload", { error: err });
    return res
      .status(400)
      .json({ success: false, error: { code: "INVALID_JSON", message: "Malformed JSON payload" } });
  }

  const eventKey = webhookEventKey(payload);
  if (!eventKey) {
    logger.warn("Paystack webhook without identifiable data ignored", { event: payload.event });
    return res.status(200).json({ success: true });
  }

  const supabase = getSupabaseAdminClient();

  // 4. Idempotency ledger: record the event, skip only if it was fully processed before
  await supabase.from("webhook_events").upsert(
    {
      provider: "paystack",
      event_key: eventKey,
      event_type: payload.event,
      payload: payload as unknown as Json,
    },
    { onConflict: "provider,event_key", ignoreDuplicates: true }
  );

  const { data: ledger } = await supabase
    .from("webhook_events")
    .select("id, attempts, processed_at")
    .eq("provider", "paystack")
    .eq("event_key", eventKey)
    .single();

  if (ledger?.processed_at) {
    return res.status(200).json({ success: true, message: "Duplicate webhook event acknowledged" });
  }

  // 5. Process supported events
  try {
    switch (payload.event) {
      case "charge.success": {
        const result = await settleSuccessfulCharge(supabase, {
          reference: payload.data.reference,
          amountKobo: payload.data.amount,
          currency: payload.data.currency || "NGN",
          paidAt: payload.data.paid_at,
        });
        if (result.outcome === "not_found") {
          logger.warn("charge.success for unknown payment reference", {
            reference: payload.data.reference,
          });
        }
        break;
      }

      case "refund.processed": {
        await handleRefundProcessed(payload);
        break;
      }

      case "refund.failed": {
        logger.error("Paystack refund failed event received", {
          reference: payload.data.transaction_reference || payload.data.reference,
        });
        break;
      }

      default:
        logger.info("Unhandled Paystack webhook event", { event: payload.event });
        break;
    }

    if (ledger) {
      await supabase
        .from("webhook_events")
        .update({
          processed_at: new Date().toISOString(),
          attempts: ledger.attempts + 1,
          last_error: null,
        })
        .eq("id", ledger.id);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Error processing Paystack webhook event", {
      event: payload.event,
      error: message,
    });
    if (ledger) {
      await supabase
        .from("webhook_events")
        .update({ attempts: ledger.attempts + 1, last_error: message })
        .eq("id", ledger.id);
    }
    // Non-2xx makes Paystack retry; the ledger is not marked processed
    return res
      .status(500)
      .json({ success: false, error: { code: "SERVER_ERROR", message: "Webhook handler failed" } });
  }
}

async function handleRefundProcessed(payload: PaystackWebhookPayload) {
  const supabase = getSupabaseAdminClient();
  const txRef = payload.data.transaction_reference || payload.data.reference;
  const refundAmountNaira = Math.round((payload.data.amount || 0) / 100);

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("gateway", "paystack")
    .eq("gateway_reference", txRef)
    .maybeSingle();

  if (!payment) {
    logger.warn("refund.processed for unknown payment reference", { reference: txRef });
    return;
  }

  const isFullRefund = refundAmountNaira >= payment.amount;
  await supabase
    .from("payments")
    .update({
      status: isFullRefund ? "refunded" : "partially_refunded",
      refund_amount: refundAmountNaira,
      refunded_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  const { data: booking } = await supabase
    .from("bookings")
    .select("reference, guest_email")
    .eq("id", payment.booking_id)
    .maybeSingle();

  if (booking) {
    await sendEmail({
      to: booking.guest_email,
      templateId: "booking_refund_completed",
      templateData: {
        reference: booking.reference,
        amount: refundAmountNaira,
      },
    });
  }
}
