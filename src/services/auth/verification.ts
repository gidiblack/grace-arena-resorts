import { env } from "@/config/env";
import { sendEmail } from "@/services/email/sendgrid";
import { issueToken } from "./tokens";

/**
 * Issues a single-use email verification token and emails the confirmation link.
 */
export async function sendVerificationEmail(options: {
  userId: string;
  email: string;
  fullName: string;
}) {
  const token = await issueToken({
    purpose: "email_verification",
    email: options.email,
    userId: options.userId,
  });

  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;

  return sendEmail({
    to: options.email,
    templateId: "email_verification",
    templateData: { name: options.fullName, verifyUrl },
  });
}
