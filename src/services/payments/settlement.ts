import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/db";
import { initiatePaystackRefund } from "./refund";
import { sendEmail } from "@/services/email";
import { runAfterResponse, sendBookingConfirmationEmail } from "@/services/booking/notifications";
import { logger } from "@/lib/logger";

type Db = SupabaseClient<Database>;
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

export interface SuccessfulCharge {
  /** Paystack transaction reference (our payments.gateway_reference) */
  reference: string;
  amountKobo: number;
  currency: string;
  paidAt?: string | null;
}

export type SettlementOutcome =
  | "confirmed"
  | "already_processed"
  | "refunded_late_payment"
  | "refunded_amount_mismatch"
  | "refunded_duplicate_payment"
  | "not_found";

export interface SettlementResult {
  outcome: SettlementOutcome;
  booking: BookingRow | null;
  payment: PaymentRow | null;
}

function mergeMetadata(existing: Json, extra: Record<string, Json>): Json {
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  return { ...base, ...extra };
}

/**
 * Settles a successful Paystack charge exactly once, from either the verify endpoint or the
 * webhook. The payment row is claimed with a conditional `pending -> X` update so concurrent
 * callers can never double-confirm or double-refund.
 *
 * - Only an exact gateway_reference match counts (no booking-reference prefix guessing).
 * - Amount and currency must equal what we asked for, otherwise the charge is refunded.
 * - A charge for a booking that is no longer confirmable (hold expired, cancelled by the
 *   expiry job, or already paid) is refunded in full.
 */
export async function settleSuccessfulCharge(
  supabase: Db,
  charge: SuccessfulCharge
): Promise<SettlementResult> {
  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("gateway", "paystack")
    .eq("gateway_reference", charge.reference)
    .maybeSingle();

  if (!payment) {
    return { outcome: "not_found", booking: null, payment: null };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", payment.booking_id)
    .single();

  if (payment.status !== "pending") {
    // A refund decided on an earlier attempt failed at the gateway: retry it
    const meta = (payment.metadata ?? {}) as Record<string, Json>;
    if (payment.status === "success" && typeof meta.refundReason === "string" && !meta.refundId) {
      await refundClaimedPayment(supabase, payment, booking, charge, {
        reason: meta.refundReason,
        customerNote: "Automated refund for your Grace Arena Resorts payment.",
        notifyMessage: "A full refund of your payment has been initiated.",
      });
      return { outcome: "refunded_late_payment", booking, payment };
    }
    return { outcome: "already_processed", booking, payment };
  }

  const paidAt = charge.paidAt || new Date().toISOString();
  const expectedKobo = payment.amount * 100;

  if (charge.amountKobo !== expectedKobo || charge.currency.toUpperCase() !== "NGN") {
    logger.error("Paystack charge amount/currency mismatch; refunding", {
      reference: charge.reference,
      expectedKobo,
      receivedKobo: charge.amountKobo,
      currency: charge.currency,
    });
    const refunded = await claimAndRefund(supabase, payment, booking, charge, paidAt, {
      reason: "AMOUNT_MISMATCH",
      customerNote: "Automated refund: payment amount did not match your reservation total.",
      notifyMessage:
        "The amount received did not match your reservation total, so it has been refunded in full. Please start a new booking or contact us on WhatsApp.",
    });
    return {
      outcome: refunded ? "refunded_amount_mismatch" : "already_processed",
      booking,
      payment,
    };
  }

  // Claim the payment as successful
  const { data: claimed } = await supabase
    .from("payments")
    .update({ status: "success", paid_at: paidAt })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (!claimed) {
    return { outcome: "already_processed", booking, payment };
  }

  // Confirm only while the booking is pending and its inventory hold is still live
  const { data: confirmed } = await supabase
    .from("bookings")
    .update({ status: "confirmed", hold_expires_at: null })
    .eq("id", payment.booking_id)
    .eq("status", "pending")
    .gt("hold_expires_at", new Date().toISOString())
    .select()
    .maybeSingle();

  if (confirmed) {
    runAfterResponse("booking confirmation email", () =>
      sendBookingConfirmationEmail(supabase, confirmed)
    );
    return { outcome: "confirmed", booking: confirmed, payment: claimed };
  }

  // Booking could not be confirmed: refund this charge
  const { data: latestBooking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", payment.booking_id)
    .single();

  const alreadyPaid =
    latestBooking && ["confirmed", "checked_in", "checked_out"].includes(latestBooking.status);

  if (latestBooking?.status === "pending") {
    await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        special_requests: `${latestBooking.special_requests ? `${latestBooking.special_requests} ` : ""}[System: Payment received after hold expired; auto-refunded]`,
      })
      .eq("id", latestBooking.id)
      .eq("status", "pending");
  }

  await refundClaimedPayment(supabase, claimed, latestBooking, charge, {
    reason: alreadyPaid ? "DUPLICATE_PAYMENT" : "HOLD_EXPIRED",
    customerNote: alreadyPaid
      ? "Automated refund: duplicate payment for an already-paid reservation."
      : "Automated refund: booking hold expired before payment completed.",
    notifyMessage: alreadyPaid
      ? "We received a second payment for a reservation that was already paid. The duplicate payment has been refunded in full."
      : "Your payment was received after your booking hold expired, so the rooms could not be guaranteed. A full refund has been initiated.",
  });

  return {
    outcome: alreadyPaid ? "refunded_duplicate_payment" : "refunded_late_payment",
    booking: latestBooking,
    payment: claimed,
  };
}

interface RefundReason {
  reason: string;
  customerNote: string;
  notifyMessage: string;
}

/**
 * Claims a still-pending payment for refund and refunds it. Returns false if another caller
 * already processed the payment.
 */
async function claimAndRefund(
  supabase: Db,
  payment: PaymentRow,
  booking: BookingRow | null,
  charge: SuccessfulCharge,
  paidAt: string,
  why: RefundReason
): Promise<boolean> {
  const { data: claimed } = await supabase
    .from("payments")
    .update({ status: "success", paid_at: paidAt })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (!claimed) return false;
  await refundClaimedPayment(supabase, claimed, booking, charge, why);
  return true;
}

/**
 * Refunds the full received amount of a payment this caller has claimed. On gateway failure
 * the payment stays `success` with the error recorded, and the error is rethrown so webhook
 * delivery is retried.
 */
async function refundClaimedPayment(
  supabase: Db,
  payment: PaymentRow,
  booking: BookingRow | null,
  charge: SuccessfulCharge,
  why: RefundReason
) {
  try {
    const refund = await initiatePaystackRefund({
      transactionReferenceOrId: charge.reference,
      amountKobo: charge.amountKobo,
      customerNote: why.customerNote,
      merchantNote: why.reason,
    });

    await supabase
      .from("payments")
      .update({
        status: "refund_pending",
        refund_amount: Math.round(charge.amountKobo / 100),
        metadata: mergeMetadata(payment.metadata, {
          refundReason: why.reason,
          refundId: String(refund.refundId),
          refundInitiatedAt: new Date().toISOString(),
        }),
      })
      .eq("id", payment.id);
  } catch (error) {
    await supabase
      .from("payments")
      .update({
        metadata: mergeMetadata(payment.metadata, {
          refundReason: why.reason,
          refundError: error instanceof Error ? error.message : String(error),
        }),
      })
      .eq("id", payment.id);
    throw error;
  }

  if (booking) {
    runAfterResponse("refund initiated email", () =>
      sendEmail({
        to: booking.guest_email,
        templateId: "booking_refund_initiated",
        templateData: {
          reference: booking.reference,
          amount: Math.round(charge.amountKobo / 100),
          message: why.notifyMessage,
        },
      })
    );
  }
}
