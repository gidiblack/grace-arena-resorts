import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { assertTransition, canMarkNoShow } from "@/domain/booking/state-machine";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { runAfterResponse, sendBookingConfirmationEmail } from "@/services/booking/notifications";
import { logger } from "@/lib/logger";
import type { BookingStatus } from "@/types/db";

const updateStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"]),
  note: z.string().optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { ref } = req.query;
    const { status: targetStatus, note } = req.body as z.infer<typeof updateStatusSchema>;
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

    const currentStatus = booking.status as BookingStatus;

    // 2. Validate state machine transition
    try {
      assertTransition(currentStatus, targetStatus as BookingStatus);
    } catch (err) {
      return fail(
        res,
        "INVALID_TRANSITION",
        err instanceof Error
          ? err.message
          : `Invalid transition from ${currentStatus} to ${targetStatus}`,
        400
      );
    }

    // 3. Enforce 24-hour guard for no-show status
    if (targetStatus === "no_show") {
      const isAllowed = canMarkNoShow(new Date(), booking.check_in_date);
      if (!isAllowed) {
        return fail(
          res,
          "NO_SHOW_PREMATURE",
          "A booking may only be marked as No-Show starting 24 hours after the scheduled check-in time (14:00 on check-in date).",
          400
        );
      }
    }

    // 4. Update status in database
    const updatedNotes = note
      ? `${booking.special_requests || ""}\n[Admin note: ${note}]`.trim()
      : booking.special_requests;

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status: targetStatus,
        special_requests: updatedNotes,
        hold_expires_at: null,
      })
      .eq("id", booking.id)
      .eq("status", currentStatus)
      .select()
      .single();

    if (updateError) {
      logger.error("Failed to update booking status", { error: updateError });
      return fail(res, "UPDATE_FAILED", "Failed to update booking status", 500);
    }
    if (!updatedBooking) {
      return fail(res, "CONFLICT", "The booking was modified concurrently. Please reload.", 409);
    }

    // 5. If transitioning to Confirmed: dispatch confirmation email with PDF
    if (targetStatus === "confirmed" && currentStatus === "pending") {
      runAfterResponse("booking confirmation email", () =>
        sendBookingConfirmationEmail(supabase, updatedBooking)
      );
    }

    // 6. Record admin audit log
    await recordAuditLog({
      userId: user.id,
      action: `UPDATE_STATUS_${targetStatus.toUpperCase()}`,
      entity: "booking",
      entityId: booking.id,
      previousData: { status: currentStatus },
      newData: { status: targetStatus, note },
      req,
    });

    return ok(res, {
      booking: updatedBooking,
      message: `Booking status updated successfully to '${targetStatus}'.`,
    });
  },
  {
    allowedMethods: ["PUT"],
    requireAuth: true,
    requiredRoles: ["resort_admin", "super_admin"],
    bodySchema: updateStatusSchema,
  }
);
