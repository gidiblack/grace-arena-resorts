import { env } from "@/config/env";
import { sendEmail, type EmailSendResult } from "@/services/email";
import { issueToken } from "./tokens";

/**
 * Issues a single-use email verification token and emails the confirmation link.
 */
export async function sendVerificationEmail(
  user: { userId: string; email: string; fullName: string },
  options: { queueOnFailure?: boolean } = {}
): Promise<EmailSendResult> {
  const token = await issueToken({
    purpose: "email_verification",
    email: user.email,
    userId: user.userId,
  });

  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to: user.email,
    templateId: "email_verification",
    templateData: { name: user.fullName, verifyUrl },
    retry: {
      handler: "email_verification",
      params: { userId: user.userId, email: user.email, fullName: user.fullName },
    },
    queueOnFailure: options.queueOnFailure,
  });
}
