import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { authorizeBookingAccess } from "@/services/booking/access";
import { ok, fail } from "@/lib/http/response";
import { sendBookingConfirmationEmail } from "@/services/booking/notifications";

export default withApi(
  async (req, res, ctx) => {
    const ref = String(req.query.ref || "")
      .toUpperCase()
      .trim();
    if (!ref) {
      return fail(res, "MISSING_REF", "Booking reference is required", 400);
    }

    const supabase = getSupabaseAdminClient();
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("reference", ref)
      .maybeSingle();

    const access = booking
      ? await authorizeBookingAccess(req, booking, ctx.user, [
          "resort_admin",
          "super_admin",
          "content_manager",
        ])
      : null;
    if (!booking || !access) {
      return fail(res, "NOT_FOUND", "Booking not found", 404);
    }

    if (!["confirmed", "checked_in", "checked_out"].includes(booking.status)) {
      return fail(
        res,
        "NOT_CONFIRMED",
        "A confirmation can only be sent for confirmed bookings",
        400
      );
    }

    const result = await sendBookingConfirmationEmail(supabase, booking);
    if (!result.success) {
      return fail(
        res,
        "EMAIL_DISPATCH_FAILED",
        result.queued
          ? "We couldn't send the email right now. It has been queued and will be retried automatically."
          : "Unable to send confirmation email at this time",
        502
      );
    }

    return ok(res, { message: `Confirmation email dispatched to ${booking.guest_email}` });
  },
  {
    allowedMethods: ["POST"],
    rateLimit: {
      keyPrefix: "booking-confirmation-resend",
      maxRequests: 3,
      windowSeconds: 3600,
    },
  }
);
