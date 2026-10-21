import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { runAfterResponse, sendBookingConfirmationEmail } from "@/services/booking/notifications";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import { mapRpcError } from "@/lib/supabase/rpc-errors";

const offlinePaymentSchema = z.object({
  method: z.enum(["bank_transfer", "cash", "pos"]),
  amount: z.number().int().min(1, "Amount must be greater than 0"),
  reference: z.string().trim().min(1, "Payment reference is required"),
  paidAt: z.string().optional(),
  note: z.string().max(500).optional(),
});

const OFFLINE_PAYMENT_ERRORS = {
  BOOKING_NOT_FOUND: { code: "NOT_FOUND", message: "Booking not found", status: 404 },
  INVALID_BOOKING_STATUS: {
    message: "Offline payments can only be recorded for pending bookings",
    status: 400,
  },
  BOOKING_HOLD_EXPIRED: {
    code: "HOLD_EXPIRED",
    message:
      "The inventory hold for this pending reservation has expired. Please create a new booking for the guest.",
    status: 409,
  },
  AMOUNT_MISMATCH: { message: "Payment amount does not match booking total", status: 400 },
  INVALID_PAYMENT_METHOD: { message: "Unsupported offline payment method", status: 400 },
  UNIQUE_VIOLATION: {
    code: "DUPLICATE_REFERENCE",
    message: `A payment record with this reference already exists`,
    status: 409,
  },
};

export default withApi(
  async (req, res, ctx) => {
    const { ref } = req.query;
    const { method, amount, reference, paidAt, note } = req.body as z.infer<
      typeof offlinePaymentSchema
    >;
    const user = ctx.user!;

    if (!ref || typeof ref !== "string") {
      return fail(res, "MISSING_REF", "Booking reference is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // 1. Fetch booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("reference", ref.toUpperCase().trim())
      .maybeSingle();

    if (fetchError || !booking) {
      return fail(res, "NOT_FOUND", "Booking not found", 404);
    }

    // 2. Validate current booking state
    if (booking.status !== "pending") {
      return fail(
        res,
        "INVALID_BOOKING_STATUS",
        `Offline payments can only be recorded for pending bookings. Current status is '${booking.status}'.`,
        400
      );
    }

    // Check inventory hold expiration
    const holdExpiresAt = booking.hold_expires_at
      ? new Date(booking.hold_expires_at)
      : new Date(new Date(booking.created_at).getTime() + 30 * 60 * 1000);

    if (holdExpiresAt < new Date()) {
      return fail(
        res,
        "HOLD_EXPIRED",
        "The inventory hold for this pending reservation has expired. Please create a new booking for the guest.",
        409
      );
    }

    // 3. Amount check (must equal booking total in v1.0)
    const bookingTotal = Number(
      booking.total ?? ((booking as Record<string, unknown>).total_price as number | undefined) ?? 0
    );
    if (bookingTotal !== amount) {
      return fail(
        res,
        "AMOUNT_MISMATCH",
        `Payment amount (₦${amount.toLocaleString()}) does not match booking total (₦${bookingTotal.toLocaleString()}). Full payment is required.`,
        400,
        { expected: bookingTotal, received: amount }
      );
    }

    // 4. Reference uniqueness check
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("gateway", method)
      .eq("gateway_reference", reference)
      .maybeSingle();

    if (existingPayment) {
      return fail(
        res,
        "DUPLICATE_REFERENCE",
        `A payment record with gateway reference '${reference}' already exists.`,
        409
      );
    }

    // 5. Record payment and confirm booking in one transaction
    const { data: paymentRecord, error: rpcError } = await supabase.rpc("record_offline_payment", {
      p_booking_id: booking.id,
      p_method: method,
      p_amount: amount,
      p_reference: reference,
      p_paid_at: paidAt || new Date().toISOString(),
      p_note: note || null,
      p_actor: user.id,
    });

    if (rpcError || !paymentRecord) {
      logger.error("record_offline_payment failed", { error: rpcError, bookingId: booking.id });
      const failure = mapRpcError(
        rpcError || {},
        OFFLINE_PAYMENT_ERRORS,
        "Failed to record offline payment"
      );
      return fail(res, failure.code, failure.message, failure.status);
    }

    const { data: updatedBooking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking.id)
      .single();

    // 6. Send confirmation email with PDF
    if (updatedBooking) {
      const confirmedBooking = updatedBooking;
      runAfterResponse("offline payment confirmation email", () =>
        sendBookingConfirmationEmail(supabase, confirmedBooking)
      );
    }

    // 7. Audit log
    await recordAuditLog({
      userId: user.id,
      action: "RECORD_OFFLINE_PAYMENT",
      entity: "booking",
      entityId: booking.id,
      previousData: { status: booking.status },
      newData: {
        status: "confirmed",
        paymentId: paymentRecord?.id,
        method,
        amount,
        reference,
        note,
      },
      req,
    });

    return ok(res, {
      booking: updatedBooking,
      payment: paymentRecord,
      message: `Offline ${method.replace("_", " ")} payment recorded successfully. Booking is now confirmed.`,
    });
  },
  {
    allowedMethods: ["POST"],
    requireAuth: true,
    requiredRoles: ["resort_admin", "super_admin"],
    bodySchema: offlinePaymentSchema,
  }
);
