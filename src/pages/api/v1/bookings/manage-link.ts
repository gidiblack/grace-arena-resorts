import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { issueBookingAccessToken, manageBookingUrl } from "@/services/booking/access";
import { sendEmail } from "@/services/email";
import { ok } from "@/lib/http/response";

const manageLinkSchema = z.object({
  reference: z.string().trim().min(4).max(20),
  email: z.string().email(),
});

/**
 * "Email me a new manage link": sends a fresh access link to the booking's own email address.
 * The response never reveals whether the reference/email pair exists.
 */
export default withApi(
  async (req, res) => {
    const { reference, email } = req.body as z.infer<typeof manageLinkSchema>;

    const { data: booking } = await getSupabaseAdminClient()
      .from("bookings")
      .select("id, reference, guest_name, guest_email, check_out_date, channel")
      .eq("reference", reference.toUpperCase())
      .eq("guest_email", email.toLowerCase().trim())
      .maybeSingle();

    if (booking && booking.channel !== "walk_in") {
      const token = await issueBookingAccessToken(booking);
      await sendEmail({
        to: booking.guest_email,
        templateId: "booking_manage_link",
        templateData: {
          name: booking.guest_name,
          reference: booking.reference,
          manageUrl: manageBookingUrl(booking.reference, token),
        },
      });
    }

    return ok(res, {
      message:
        "If that reference and email match a reservation, we've emailed a new link to manage it.",
    });
  },
  {
    allowedMethods: ["POST"],
    bodySchema: manageLinkSchema,
    rateLimit: { keyPrefix: "booking-manage-link", maxRequests: 5, windowSeconds: 3600 },
  }
);
