import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { sendEmail } from "@/services/email/sendgrid";
import { generateBookingPdfBuffer } from "@/services/pdf/booking-pdf";
import { buildBookingPdfInput } from "./booking-data";
import { logger } from "@/lib/logger";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

/**
 * Emails the booking confirmation with the PDF attached. Never throws: a failed email must
 * not undo a confirmed booking (guests can resend from their account).
 */
export async function sendBookingConfirmationEmail(
  supabase: SupabaseClient<Database>,
  booking: BookingRow
): Promise<boolean> {
  try {
    const pdfInput = await buildBookingPdfInput(supabase, booking, "CONFIRMED");
    const pdfBuffer = await generateBookingPdfBuffer(pdfInput);

    const result = await sendEmail({
      to: booking.guest_email,
      templateId: "booking_confirmation",
      templateData: {
        reference: booking.reference,
        name: booking.guest_name,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
      },
      attachments: [
        {
          content: pdfBuffer.toString("base64"),
          filename: `GraceArenaResorts-${booking.reference}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    });
    return result.success;
  } catch (error) {
    logger.error("Failed to generate or send booking confirmation", {
      reference: booking.reference,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
