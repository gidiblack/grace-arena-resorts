import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { sendBookingConfirmationEmail } from "@/services/booking/notifications";

export default withApi(
  async (req, res, ctx) => {
    const { ref } = req.query;
    const user = ctx.user!;

    if (!ref || typeof ref !== "string") {
      return fail(res, "MISSING_REF", "Booking reference is required", 400);
    }

    const supabase = getSupabaseAdminClient();
    const isAdmin = ["resort_admin", "super_admin", "content_manager"].includes(user.role);

    let query = supabase.from("bookings").select("*").eq("reference", ref.toUpperCase().trim());

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error || !booking) {
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

    const sent = await sendBookingConfirmationEmail(supabase, booking);
    if (!sent) {
      return fail(
        res,
        "EMAIL_DISPATCH_FAILED",
        "Unable to send confirmation email at this time",
        502
      );
    }

    return ok(res, { message: `Confirmation email dispatched to ${booking.guest_email}` });
  },
  {
    allowedMethods: ["POST"],
    requireAuth: true,
    rateLimit: {
      keyPrefix: "booking-confirmation-resend",
      maxRequests: 3,
      windowSeconds: 3600,
    },
  }
);
