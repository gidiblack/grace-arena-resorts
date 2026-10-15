import type { Json } from "@/types/db";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { sendEmail, type EmailSendResult } from "./sendgrid";
import type { EmailTemplateId } from "./templates";
import { sendVerificationEmail } from "@/services/auth/verification";
import { sendBookingConfirmationEmail } from "@/services/booking/notifications";
import { sendNewsletterConfirmation } from "@/services/newsletter/confirmation";

export const MAX_EMAIL_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 5 * 60 * 1000;

type Params = Record<string, Json>;

/**
 * Rebuilds emails that cannot be stored verbatim (fresh single-use links, PDF attachments).
 */
const handlers: Record<string, (params: Params) => Promise<EmailSendResult>> = {
  email_verification: (p) =>
    sendVerificationEmail(
      { userId: String(p.userId), email: String(p.email), fullName: String(p.fullName) },
      { queueOnFailure: false }
    ),
  newsletter_confirmation: (p) =>
    sendNewsletterConfirmation(String(p.email), { queueOnFailure: false }),
  booking_confirmation: async (p) => {
    const supabase = getSupabaseAdminClient();
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", String(p.bookingId))
      .maybeSingle();
    if (!booking) return { success: false, error: "Booking no longer exists" };
    return sendBookingConfirmationEmail(supabase, booking, { queueOnFailure: false });
  },
};

export interface RetryRunSummary {
  attempted: number;
  sent: number;
  failed: number;
  exhausted: number;
}

/**
 * Retries due failed emails with exponential backoff (5, 10, 20 min…), up to 3 attempts in total.
 */
export async function retryFailedEmails(batchSize = 20): Promise<RetryRunSummary> {
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const summary: RetryRunSummary = { attempted: 0, sent: 0, failed: 0, exhausted: 0 };

  const { data: due, error } = await supabase
    .from("failed_emails")
    .select("*")
    .is("sent_at", null)
    .lt("attempts", MAX_EMAIL_ATTEMPTS)
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(batchSize);

  if (error) throw new Error(`Failed to load email retry queue: ${error.message}`);

  for (const row of due || []) {
    summary.attempted++;
    const handler = row.retry_handler ? handlers[row.retry_handler] : undefined;

    let result: EmailSendResult;
    try {
      result = handler
        ? await handler((row.retry_params ?? {}) as Params)
        : await sendEmail({
            to: row.recipient,
            templateId: row.template_id as EmailTemplateId,
            templateData: (row.template_data ?? {}) as Record<string, unknown>,
            queueOnFailure: false,
          });
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : String(err) };
    }

    const attempts = row.attempts + 1;
    if (result.success) {
      summary.sent++;
      await supabase
        .from("failed_emails")
        .update({
          sent_at: new Date().toISOString(),
          attempts,
          last_attempt_at: nowIso,
          error: null,
        })
        .eq("id", row.id);
      continue;
    }

    const exhausted = attempts >= MAX_EMAIL_ATTEMPTS;
    if (exhausted) summary.exhausted++;
    else summary.failed++;
    await supabase
      .from("failed_emails")
      .update({
        attempts,
        last_attempt_at: nowIso,
        next_attempt_at: exhausted
          ? null
          : new Date(Date.now() + BASE_BACKOFF_MS * 2 ** (attempts - 1)).toISOString(),
        error: (result.error || "Unknown error").slice(0, 500),
      })
      .eq("id", row.id);

    if (exhausted) {
      logger.error("Email permanently failed after retries", {
        code: "EMAIL_RETRIES_EXHAUSTED",
        templateId: row.template_id,
        failedEmailId: row.id,
      });
    }
  }

  return summary;
}
