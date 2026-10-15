import type { SupabaseClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import type { Database } from "@/types/db";
import { sendEmail, type EmailSendResult } from "@/services/email/sendgrid";
import { generateBookingPdfBuffer } from "@/services/pdf/booking-pdf";
import { buildBookingPdfInput } from "./booking-data";
import { issueBookingAccessToken, manageBookingUrl } from "./access";
import { logger } from "@/lib/logger";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

/**
 * Runs side effects (emails, PDFs) after the HTTP response has been sent. On Vercel the function
 * stays alive until the promise settles; elsewhere the promise simply continues in the background.
 * Errors are logged, never thrown into the request.
 */
export function runAfterResponse(label: string, task: () => Promise<unknown>) {
  const promise = task().catch((error) => {
    logger.error(`Background task failed: ${label}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  waitUntil(promise);
  return promise;
}

/**
 * Emails the booking confirmation with the PDF attached and a "Manage booking" link. Never
 * throws: a failed email must not undo a confirmed booking (it is queued for retry, and guests
 * can also resend from the manage page).
 */
export async function sendBookingConfirmationEmail(
  supabase: SupabaseClient<Database>,
  booking: BookingRow,
  options: { queueOnFailure?: boolean } = {}
): Promise<EmailSendResult> {
  try {
    const [pdfInput, accessToken] = await Promise.all([
      buildBookingPdfInput(supabase, booking, "CONFIRMED"),
      issueBookingAccessToken(booking),
    ]);
    const pdfBuffer = await generateBookingPdfBuffer(pdfInput);

    return await sendEmail({
      to: booking.guest_email,
      templateId: "booking_confirmation",
      templateData: {
        reference: booking.reference,
        name: booking.guest_name,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        manageUrl: manageBookingUrl(booking.reference, accessToken),
      },
      attachments: [
        {
          content: pdfBuffer.toString("base64"),
          filename: `GraceArenaResorts-${booking.reference}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
      retry: { handler: "booking_confirmation", params: { bookingId: booking.id } },
      queueOnFailure: options.queueOnFailure,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Failed to generate or send booking confirmation", {
      reference: booking.reference,
      error: message,
    });
    return { success: false, error: message };
  }
}
