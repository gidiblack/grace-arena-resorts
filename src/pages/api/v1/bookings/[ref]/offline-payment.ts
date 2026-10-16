import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { runAfterResponse, sendBookingConfirmationEmail } from "@/services/booking/notifications";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import type { Database } from "@/types/db";

const offlinePaymentSchema = z.object({
  method: z.enum(["bank_transfer", "cash", "pos"]),
  amount: z.number().int().min(1, "Amount must be greater than 0"),
  reference: z.string().trim().min(1, "Payment reference is required"),
  paidAt: z.string().optional(),
  note: z.string().max(500).optional(),
});

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

    // 5. Try atomic RPC first, with fallback to direct operations
    let paymentRecord: Database["public"]["Tables"]["payments"]["Row"] | null = null;
    let updatedBooking: Database["public"]["Tables"]["bookings"]["Row"] | null = null;

    const { data: rpcPayment, error: rpcError } = await supabase.rpc("record_offline_payment", {
      p_booking_id: booking.id,
      p_method: method,
      p_amount: amount,
      p_reference: reference,
      p_paid_at: paidAt || new Date().toISOString(),
      p_note: note || null,
      p_actor: user.id,
    });

    if (!rpcError && rpcPayment) {
      paymentRecord = rpcPayment;
      const { data: b } = await supabase.from("bookings").select("*").eq("id", booking.id).single();
      updatedBooking = b;
    } else {
      // Fallback
      const { data: insertedPayment, error: pError } = await supabase
        .from("payments")
        .insert({
          booking_id: booking.id,
          gateway: method,
          gateway_reference: reference,
          amount,
          currency: "NGN",
          status: "success",
          paid_at: paidAt || new Date().toISOString(),
          metadata: {
            recordedBy: user.id,
            note: note || null,
          },
        })
        .select()
        .single();

      if (pError || !insertedPayment) {
        logger.error("Failed to insert offline payment", { error: pError });
        return fail(res, "PAYMENT_RECORD_FAILED", "Failed to record payment in database", 500);
      }
      paymentRecord = insertedPayment;

      const { data: b, error: bError } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          hold_expires_at: null,
          status_changed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)
        .select()
        .single();

      if (bError || !b) {
        logger.error("Failed to confirm booking after payment insertion", { error: bError });
        return fail(res, "BOOKING_UPDATE_FAILED", "Payment recorded but booking confirmation failed", 500);
      }
      updatedBooking = b;
    }

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
