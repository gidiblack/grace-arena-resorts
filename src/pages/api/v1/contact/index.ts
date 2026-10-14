import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { ok, fail } from "@/lib/http/response";
import { sendEmail } from "@/services/email/sendgrid";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const contactSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  phoneNumber: z.string().optional(),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  // Rate limiting: 3 submissions per hour per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`contact:${clientIp}`, 3, 3600);
  if (!rateLimit.success) {
    res.setHeader("Retry-After", Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString());
    return fail(
      res,
      "RATE_LIMIT_EXCEEDED",
      "Too many contact submissions from this IP. Please try again later.",
      429
    );
  }

  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "VALIDATION_ERROR", "Invalid contact form data", 400, parsed.error.format());
  }

  const { fullName, email, subject, message } = parsed.data;

  logger.info("Received public contact message", {
    sender: email,
    subject,
    messageLength: message.length,
  });

  // Dispatch acknowledgment email to guest
  try {
    await sendEmail({
      to: email,
      templateId: "inquiry_acknowledgment",
      templateData: {
        name: fullName,
        subject,
      },
    });
  } catch (error) {
    logger.warn("Failed to dispatch contact acknowledgment email", { error, email });
  }

  return ok(
    res,
    {
      ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`,
      message: "Thank you for reaching out. We have received your message and will respond shortly.",
    },
    201
  );
}
