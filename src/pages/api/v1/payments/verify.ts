import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { verifyPayment } from "@/services/payments/paystack";
import { initiatePaystackRefund } from "@/services/payments/refund";
import { sendEmail } from "@/services/email/sendgrid";
import { generateBookingPdfBuffer } from "@/services/pdf/booking-pdf";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import {
  isGatewayDowntime,
  STANDARD_HOLD_WINDOW_MS,
  DOWNTIME_HOLD_WINDOW_MS,
} from "@/domain/payment/types";
import type { Json } from "@/types/db";

export default withApi(
  async (req, res, { user }) => {
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }

    const reference =
      (req.query.reference as string) ||
      (req.body && typeof req.body === "object" ? req.body.reference : undefined);

    if (!reference || typeof reference !== "string") {
      return fail(
        res,
        "VALIDATION_ERROR",
        "Payment reference query parameter or body is required",
        400
      );
    }

    const supabase = getSupabaseAdminClient();

    // 1. Verify with Paystack
    let verified;
    try {
      verified = await verifyPayment(reference);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Payment gateway verification error";
      logger.error("Paystack verify call failed", { reference, error: err });
      return fail(res, "GATEWAY_ERROR", errMsg, 502);
    }

    // 2. Locate payment record in database
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("gateway_reference", reference)
      .maybeSingle();

    let bookingId = payment?.booking_id;

    // Fallback: If payment record not found by gateway_reference, try extracting booking reference
    if (!bookingId) {
      const refPrefix = reference.split("-").slice(0, 2).join("-"); // e.g. "GAR-ABC12345"
      const { data: fallbackBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("reference", refPrefix)
        .maybeSingle();
      if (fallbackBooking) {
        bookingId = fallbackBooking.id;
      }
    }

    if (!bookingId) {
      return fail(res, "NOT_FOUND", "Associated reservation payment record not found", 404);
    }

    // 3. Fetch booking reservation
    const { data: booking, error: bError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bError || !booking) {
      return fail(res, "NOT_FOUND", "Booking reservation not found", 404);
    }

    // 4. Authorization check: owner or admin
    const isAdmin = ["resort_admin", "super_admin"].includes(user.role);
    if (!isAdmin && booking.user_id && booking.user_id !== user.id) {
      return fail(res, "FORBIDDEN", "Access denied", 403);
    }

    // 5. Handle verification result
    if (verified.status === "success") {
      // Check for gateway downtime setting and hold window
      const { data: downtimeSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "paystack_downtime")
        .maybeSingle();

      const isDowntime = isGatewayDowntime(downtimeSetting?.value);
      const holdDurationMs = isDowntime ? DOWNTIME_HOLD_WINDOW_MS : STANDARD_HOLD_WINDOW_MS;
      const elapsedMs = Date.now() - new Date(booking.created_at).getTime();

      // Check race condition: Did payment succeed after the hold expired?
      const isHoldExpired = booking.status === "pending" && elapsedMs > holdDurationMs;

      if (isHoldExpired) {
        logger.warn("Payment succeeded for expired hold; triggering automated refund", {
          reference,
          bookingReference: booking.reference,
          elapsedMinutes: Math.round(elapsedMs / (60 * 1000)),
        });

        // Trigger automated full refund
        let refundResult = null;
        try {
          refundResult = await initiatePaystackRefund({
            transactionReferenceOrId: reference,
            amountKobo: verified.amountKobo,
            customerNote:
              "Automated refund: Booking hold window expired prior to payment completion.",
            merchantNote: "Hold expired late payment auto-refund",
          });
        } catch (rfErr) {
          logger.error("Failed to trigger automated refund on expired hold", { reference, rfErr });
        }

        // Update payment record
        if (payment) {
          await supabase
            .from("payments")
            .update({
              status: "refunded",
              refund_amount: booking.total,
              refunded_at: new Date().toISOString(),
              paid_at: verified.paidAt || new Date().toISOString(),
              metadata: {
                ...(typeof payment.metadata === "object" && payment.metadata !== null
                  ? payment.metadata
                  : {}),
                reason: "EXPIRED_HOLD_AUTO_REFUND",
                refundResult: refundResult ? (refundResult as unknown as Json) : null,
              },
            })
            .eq("id", payment.id);
        }

        // Mark booking cancelled
        await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            special_requests:
              (booking.special_requests || "") +
              " [Cancelled: Payment succeeded after 30-min hold expired; auto-refund triggered]",
          })
          .eq("id", booking.id);

        // Notify guest of late payment refund
        await sendEmail({
          to: booking.guest_email,
          templateId: "booking_refund_initiated",
          templateData: {
            reference: booking.reference,
            amount: booking.total,
            message:
              "Your payment was received after the booking hold expired. A full refund has been automatically initiated.",
          },
        });

        return ok(res, {
          verified: true,
          paymentStatus: "refunded",
          bookingStatus: "cancelled",
          bookingReference: booking.reference,
          isHoldExpired: true,
          message:
            "Payment received after hold expired. A full refund has been automatically initiated.",
        });
      }

      // Hold is valid: Confirm booking and mark payment success
      if (payment) {
        await supabase
          .from("payments")
          .update({
            status: "success",
            paid_at: verified.paidAt || new Date().toISOString(),
          })
          .eq("id", payment.id);
      }

      if (booking.status === "pending") {
        await supabase
          .from("bookings")
          .update({
            status: "confirmed",
          })
          .eq("id", booking.id);

        // Fetch line items for PDF confirmation
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
          logger.error("Failed to generate or dispatch PDF confirmation on verification", {
            reference: booking.reference,
            error: pdfErr,
          });
        }
      }

      return ok(res, {
        verified: true,
        paymentStatus: "success",
        bookingStatus: "confirmed",
        bookingReference: booking.reference,
      });
    }

    if (verified.status === "failed") {
      if (payment) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
          })
          .eq("id", payment.id);
      }

      return ok(res, {
        verified: false,
        paymentStatus: "failed",
        bookingStatus: booking.status,
        bookingReference: booking.reference,
        message: verified.gatewayResponse || "Payment failed or was declined.",
      });
    }

    return ok(res, {
      verified: false,
      paymentStatus: "pending",
      bookingStatus: booking.status,
      bookingReference: booking.reference,
      message: "Payment transaction is still pending.",
    });
  },
  {
    allowedMethods: ["GET", "POST"],
    requireAuth: true,
  }
);
