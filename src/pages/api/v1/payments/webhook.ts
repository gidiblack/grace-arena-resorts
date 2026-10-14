import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { isValidPaystackSignature } from "@/services/payments/signature";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { initiatePaystackRefund } from "@/services/payments/refund";
import { sendEmail } from "@/services/email/sendgrid";
import { generateBookingPdfBuffer } from "@/services/pdf/booking-pdf";
import { logger } from "@/lib/logger";
import {
  isGatewayDowntime,
  STANDARD_HOLD_WINDOW_MS,
  DOWNTIME_HOLD_WINDOW_MS,
  type PaystackWebhookPayload,
} from "@/domain/payment/types";
import type { Json } from "@/types/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Only POST allowed" } });
  }

  // 1. Read raw body stream
  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    logger.error("Failed to read raw body for Paystack webhook", { error: err });
    return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Unable to read request payload" } });
  }

  // 2. Cryptographic signature validation with timing-safe comparison
  const signature = req.headers["x-paystack-signature"];
  if (!isValidPaystackSignature(rawBody, signature)) {
    logger.warn("Unauthorized Paystack webhook attempt with invalid signature", {
      headerPresent: Boolean(signature),
    });
    return res.status(401).json({
      success: false,
      error: { code: "INVALID_SIGNATURE", message: "Unauthorized: Webhook signature verification failed" },
    });
  }

  // 3. Parse JSON event
  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    logger.error("Failed to parse Paystack webhook JSON payload", { error: err });
    return res.status(400).json({ success: false, error: { code: "INVALID_JSON", message: "Malformed JSON payload" } });
  }

  const supabase = getSupabaseAdminClient();
  const eventId = String(payload.data?.id || payload.data?.reference || Date.now());

  // 4. Enforce idempotency and replay attack protection
  const { data: existingEvent } = await supabase
    .from("audit_logs")
    .select("id")
    .eq("action", "paystack_webhook")
    .eq("entity_id", eventId)
    .maybeSingle();

  if (existingEvent) {
    logger.info("Paystack webhook duplicate event acknowledged", { eventId, event: payload.event });
    return res.status(200).json({ success: true, message: "Duplicate webhook event acknowledged" });
  }

  // Log incoming webhook event for auditing
  await supabase.from("audit_logs").insert({
    action: "paystack_webhook",
    entity: "payment",
    entity_id: eventId,
    new_data: {
      event: payload.event,
      reference: payload.data?.reference,
      amount: payload.data?.amount,
      status: payload.data?.status,
    },
    ip_address: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
  });

  // 5. Process supported webhook events
  try {
    switch (payload.event) {
      case "charge.success": {
        const reference = payload.data.reference;
        const amountNaira = (payload.data.amount || 0) / 100;

        // Locate payment record
        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("gateway_reference", reference)
          .maybeSingle();

        let bookingId = payment?.booking_id;
        if (!bookingId) {
          const refPrefix = reference.split("-").slice(0, 2).join("-");
          const { data: b } = await supabase.from("bookings").select("id").eq("reference", refPrefix).maybeSingle();
          bookingId = b?.id;
        }

        if (!bookingId) {
          logger.warn("Received charge.success for unknown booking reference", { reference });
          return res.status(200).json({ success: true, message: "No matching booking found" });
        }

        const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).maybeSingle();
        if (!booking) {
          return res.status(200).json({ success: true });
        }

        // Check if hold window expired
        const { data: downtimeSetting } = await supabase
          .from("system_settings")
          .select("value")
          .eq("key", "paystack_downtime")
          .maybeSingle();

        const isDowntime = isGatewayDowntime(downtimeSetting?.value);
        const holdDurationMs = isDowntime ? DOWNTIME_HOLD_WINDOW_MS : STANDARD_HOLD_WINDOW_MS;
        const elapsedMs = Date.now() - new Date(booking.created_at).getTime();

        if (booking.status === "pending" && elapsedMs > holdDurationMs) {
          // Late payment race condition on expired hold -> auto-trigger full refund
          logger.warn("Webhook detected payment on expired hold; auto-refunding", {
            reference,
            bookingReference: booking.reference,
          });

          await initiatePaystackRefund({
            transactionReferenceOrId: reference,
            amountKobo: payload.data.amount,
            customerNote: "Automated refund: Booking hold window expired before checkout completion.",
          });

          if (payment) {
            await supabase
              .from("payments")
              .update({
                status: "refunded",
                refund_amount: amountNaira,
                refunded_at: new Date().toISOString(),
                paid_at: payload.data.paid_at || new Date().toISOString(),
              })
              .eq("id", payment.id);
          }

          await supabase
            .from("bookings")
            .update({
              status: "cancelled",
            })
            .eq("id", booking.id);

          await sendEmail({
            to: booking.guest_email,
            templateId: "booking_refund_initiated",
            templateData: {
              reference: booking.reference,
              amount: amountNaira,
              message: "Your payment was received after your booking hold expired. A full refund has been automatically initiated.",
            },
          });

          return res.status(200).json({ success: true, message: "Auto-refund processed for expired hold" });
        }

        // Valid payment: update payment status and confirm booking
        if (payment) {
          await supabase
            .from("payments")
            .update({
              status: "success",
              paid_at: payload.data.paid_at || new Date().toISOString(),
            })
            .eq("id", payment.id);
        }

        if (booking.status === "pending") {
          await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);

          // Generate PDF and send confirmation email
          const { data: lineItems } = await supabase
            .from("booking_line_items")
            .select("*")
            .eq("booking_id", booking.id);

          const roomTypeIds = (lineItems || []).map((li) => li.room_type_id);
          const { data: roomTypes } = await supabase
            .from("room_types")
            .select("id, name, tier")
            .in("id", roomTypeIds);

          const roomMap = new Map((roomTypes || []).map((r) => [r.id, r]));

          try {
            const pdfBuffer = await generateBookingPdfBuffer({
              reference: booking.reference,
              status: "confirmed",
              guestName: booking.guest_name,
              guestEmail: booking.guest_email,
              guestPhone: booking.guest_phone,
              checkInDate: booking.check_in_date,
              checkOutDate: booking.check_out_date,
              nights: booking.nights,
              rooms: (lineItems || []).map((li) => {
                const rt = roomMap.get(li.room_type_id);
                return {
                  name: rt?.name || "Resort Room",
                  quantity: li.quantity,
                  unitPrice: li.unit_price,
                  lineTotal: li.line_total,
                };
              }),
              subtotal: booking.subtotal,
              dealDiscount: booking.deal_discount,
              tax: booking.tax,
              total: booking.total,
              createdAt: booking.created_at,
              paymentGateway: "Paystack",
            });

            await sendEmail({
              to: booking.guest_email,
              templateId: "booking_confirmation",
              templateData: {
                reference: booking.reference,
                guestName: booking.guest_name,
                checkInDate: booking.check_in_date,
                checkOutDate: booking.check_out_date,
              },
              attachments: [
                {
                  content: pdfBuffer.toString("base64"),
                  filename: `Confirmation-${booking.reference}.pdf`,
                  type: "application/pdf",
                  disposition: "attachment",
                },
              ],
            });
          } catch (pdfErr) {
            logger.error("Failed to generate PDF confirmation on webhook charge.success", { error: pdfErr });
          }
        }
        break;
      }

      case "refund.processed": {
        const txRef = payload.data.transaction_reference || payload.data.reference;
        const refundAmountNaira = (payload.data.amount || 0) / 100;

        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .or(`gateway_reference.eq.${txRef},id.eq.${txRef}`)
          .maybeSingle();

        if (payment) {
          const isFullRefund = refundAmountNaira >= payment.amount;
          await supabase
            .from("payments")
            .update({
              status: isFullRefund ? "refunded" : "partially_refunded",
              refund_amount: refundAmountNaira,
              refunded_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

          // Disclose completion email if booking exists
          const { data: booking } = await supabase
            .from("bookings")
            .select("*")
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
        break;
      }

      case "refund.failed": {
        logger.error("Paystack refund failed event received", { data: payload.data });
        await supabase.from("audit_logs").insert({
          action: "paystack_refund_failed",
          entity: "payment",
          entity_id: String(payload.data.id || payload.data.reference),
          new_data: payload.data as unknown as Json,
        });
        break;
      }

      default:
        logger.info("Unhandled Paystack webhook event", { event: payload.event });
        break;
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error("Error processing Paystack webhook event", { event: payload.event, error: err });
    return res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Webhook handler failed" } });
  }
}
