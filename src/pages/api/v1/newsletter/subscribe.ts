import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { ok, fail } from "@/lib/http/response";
import { sendEmail } from "@/services/email/sendgrid";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

const subscribeSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "VALIDATION_ERROR", "Invalid email", 400, parsed.error.format());
  }

  const { email } = parsed.data;
  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64url");
  const confirmUrl = `${env.NEXT_PUBLIC_APP_URL}/api/v1/newsletter/confirm?token=${token}`;

  logger.info("Newsletter subscription requested", { email });

  // Dispatch double opt-in confirmation email via SendGrid
  try {
    await sendEmail({
      to: email,
      templateId: "newsletter_confirmation",
      templateData: {
        confirmUrl,
      },
    });
  } catch (error) {
    logger.warn("Failed to dispatch newsletter confirmation email", { error, email });
  }

  return ok(
    res,
    {
      message: "Please check your inbox to confirm your newsletter subscription.",
      email,
    },
    200
  );
}
