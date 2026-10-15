import { z } from "zod";
import { withApi } from "../_shared/handler";
import { verifyRecaptcha } from "../_shared/recaptcha";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { env } from "@/config/env";
import { sendEmail } from "@/services/email";
import { notifyStaffOfSubmission } from "@/services/email/staff-alert";
import { logger } from "@/lib/logger";

const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().email("Valid email required"),
  phoneNumber: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(3, "Subject is required").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
  recaptchaToken: z.string().optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { fullName, email, phoneNumber, subject, message, recaptchaToken } = req.body as z.infer<
      typeof contactSchema
    >;

    const recaptcha = await verifyRecaptcha(recaptchaToken, "contact");
    if (!recaptcha.success) {
      return fail(res, "RECAPTCHA_FAILED", "Spam protection check failed. Please try again.", 400);
    }

    let ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;

    if (!env.NEXT_PUBLIC_USE_MOCK_DATA) {
      const { data, error } = await getSupabaseAdminClient()
        .from("contact_submissions")
        .insert({
          user_id: ctx.user?.id ?? null,
          name: fullName,
          email: email.toLowerCase().trim(),
          phone: phoneNumber || null,
          subject,
          message,
        })
        .select("id")
        .single();

      if (error || !data) {
        logger.error("Failed to save contact submission", { error });
        return fail(
          res,
          "SUBMISSION_FAILED",
          "We could not send your message right now. Please try again or reach us on WhatsApp.",
          500
        );
      }
      ticketId = `TKT-${data.id.slice(0, 8).toUpperCase()}`;

      await notifyStaffOfSubmission({
        kind: "contact",
        name: fullName,
        email,
        phone: phoneNumber,
        subject,
        details: message,
      });
    }

    await sendEmail({
      to: email,
      templateId: "inquiry_acknowledgment",
      templateData: { name: fullName, subject },
    });

    return ok(
      res,
      {
        ticketId,
        message:
          "Thank you for reaching out. We have received your message and will respond shortly.",
      },
      201
    );
  },
  {
    allowedMethods: ["POST"],
    bodySchema: contactSchema,
    rateLimit: { keyPrefix: "contact", maxRequests: 3, windowSeconds: 3600 },
  }
);
