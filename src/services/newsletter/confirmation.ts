import { env } from "@/config/env";
import { issueToken } from "@/services/auth/tokens";
import { sendEmail, type EmailSendResult } from "@/services/email/sendgrid";

/**
 * Issues a fresh single-use confirmation token and emails the double opt-in link.
 */
export async function sendNewsletterConfirmation(
  email: string,
  options: { queueOnFailure?: boolean } = {}
): Promise<EmailSendResult> {
  const token = await issueToken({ purpose: "newsletter_confirm", email });
  return sendEmail({
    to: email,
    templateId: "newsletter_confirmation",
    templateData: {
      confirmUrl: `${env.NEXT_PUBLIC_APP_URL}/api/v1/newsletter/confirm?token=${encodeURIComponent(token)}`,
    },
    retry: { handler: "newsletter_confirmation", params: { email } },
    queueOnFailure: options.queueOnFailure,
  });
}
