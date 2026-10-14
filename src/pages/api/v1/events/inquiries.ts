import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { ok, fail } from "@/lib/http/response";
import { sendEmail } from "@/services/email/sendgrid";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const eventInquirySchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email required"),
  phoneNumber: z.string().min(8, "Phone number is required"),
  eventType: z.string().min(1, "Event category is required"),
  estimatedGuests: z.number().int().positive().optional(),
  preferredDate: z.string().optional(),
  notes: z.string().optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  // Rate limiting: 5 event inquiries per hour per IP
  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`inquiries:${clientIp}`, 5, 3600);
  if (!rateLimit.success) {
    res.setHeader("Retry-After", Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString());
    return fail(
      res,
      "RATE_LIMIT_EXCEEDED",
      "Too many event inquiries from this IP. Please try again later.",
      429
    );
  }

  const parsed = eventInquirySchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "VALIDATION_ERROR", "Invalid event inquiry data", 400, parsed.error.format());
  }

  const { fullName, email, eventType } = parsed.data;

  // Dispatch acknowledgment email via SendGrid
  try {
    await sendEmail({
      to: email,
      templateId: "inquiry_acknowledgment",
      templateData: {
        name: fullName,
        service: eventType,
      },
    });
  } catch (error) {
    logger.warn("Failed to dispatch event inquiry auto-reply", { error, email });
  }

  return ok(
    res,
    {
      inquiryId: `EVT-${Date.now().toString(36).toUpperCase()}`,
      message: "Your event inquiry has been received. Our event coordinator will contact you within 24 hours.",
    },
    201
  );
}
