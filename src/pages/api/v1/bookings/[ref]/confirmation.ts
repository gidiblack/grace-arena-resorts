import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { sendEmail } from "@/services/email/sendgrid";
import { generateBookingPdfBuffer } from "@/services/pdf/booking-pdf";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res, ctx) => {
    const { ref } = req.query;
    const user = ctx.user!;

    if (!ref || typeof ref !== "string") {
      return fail(res, "MISSING_REF", "Booking reference is required", 400);
    }

    const supabase = getSupabaseAdminClient();
    const isAdmin = ["resort_admin", "super_admin", "content_manager"].includes(user.role);

    let query = supabase
      .from("bookings")
      .select("*")
      .eq("reference", ref.toUpperCase().trim());

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error || !booking) {
      return fail(res, "NOT_FOUND", "Booking not found", 404);
    }

    try {
      const { data: lineItems } = await supabase
        .from("booking_line_items")
        .select("*")
        .eq("booking_id", booking.id);

      const pdfBuffer = await generateBookingPdfBuffer({
        reference: booking.reference,
        status: booking.status.toUpperCase(),
        guestName: booking.guest_name,
        guestEmail: booking.guest_email,
        guestPhone: booking.guest_phone,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        nights: booking.nights,
        rooms: (lineItems || []).map((bli) => ({
          name: "Room Suite",
          quantity: bli.quantity,
          unitPrice: bli.unit_price,
          lineTotal: bli.line_total,
        })),
        subtotal: booking.subtotal,
        dealDiscount: booking.deal_discount,
        tax: booking.tax,
        total: booking.total,
        createdAt: booking.created_at,
      });

      await sendEmail({
        to: booking.guest_email,
        templateId: "booking_confirmation",
        templateData: {
          reference: booking.reference,
          name: booking.guest_name,
        },
        attachments: [
          {
            content: pdfBuffer.toString("base64"),
            filename: `GraceArenaResorts-${booking.reference}.pdf`,
            type: "application/pdf",
          },
        ],
      });

      return ok(res, { message: `Confirmation email dispatched to ${booking.guest_email}` });
    } catch (err) {
      logger.error("Failed to resend confirmation email", { err });
      return fail(res, "EMAIL_DISPATCH_FAILED", "Unable to send confirmation email at this time", 500);
    }
  },
  {
    allowedMethods: ["POST"],
    requireAuth: true,
  }
);
