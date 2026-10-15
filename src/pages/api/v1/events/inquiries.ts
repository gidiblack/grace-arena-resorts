import { z } from "zod";
import { withApi } from "../_shared/handler";
import { verifyRecaptcha } from "../_shared/recaptcha";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { env } from "@/config/env";
import { sendEmail } from "@/services/email";
import { notifyStaffOfSubmission } from "@/services/email/staff-alert";
import { isValidCalendarDate } from "@/domain/booking/time";
import { logger } from "@/lib/logger";
import type { EventCategoryName } from "@/types/db";

const eventInquirySchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().email("Valid email required"),
  phoneNumber: z.string().trim().min(8, "Phone number is required").max(20),
  eventType: z.string().trim().min(1, "Event category is required").max(100),
  estimatedGuests: z.number().int().positive().max(5000).optional(),
  preferredDate: z.string().refine(isValidCalendarDate, "Invalid date").optional(),
  notes: z.string().trim().max(2000).optional(),
  recaptchaToken: z.string().optional(),
});

/**
 * Maps the public form's event labels onto the event_categories reference data.
 */
export function eventCategoryNameFor(eventType: string): EventCategoryName {
  const label = eventType.toLowerCase();
  if (label.includes("wedding")) return "weddings";
  if (label.includes("shoot") || label.includes("film") || label.includes("photo")) return "shoots";
  if (
    label.includes("retreat") ||
    label.includes("corporate") ||
    label.includes("seminar") ||
    label.includes("team")
  ) {
    return "team_bonding";
  }
  return "celebrations";
}

export default withApi(
  async (req, res) => {
    const body = req.body as z.infer<typeof eventInquirySchema>;

    const recaptcha = await verifyRecaptcha(body.recaptchaToken, "event_inquiry");
    if (!recaptcha.success) {
      return fail(res, "RECAPTCHA_FAILED", "Spam protection check failed. Please try again.", 400);
    }

    let inquiryId = `EVT-${Date.now().toString(36).toUpperCase()}`;

    if (!env.NEXT_PUBLIC_USE_MOCK_DATA) {
      const supabase = getSupabaseAdminClient();
      const { data: category } = await supabase
        .from("event_categories")
        .select("id")
        .eq("name", eventCategoryNameFor(body.eventType))
        .maybeSingle();

      if (!category) {
        logger.error("Event category lookup failed", { eventType: body.eventType });
        return fail(res, "SUBMISSION_FAILED", "We could not submit your inquiry right now.", 500);
      }

      const { data, error } = await supabase
        .from("event_inquiries")
        .insert({
          event_category_id: category.id,
          contact_name: body.fullName,
          contact_email: body.email.toLowerCase().trim(),
          contact_phone: body.phoneNumber,
          preferred_date: body.preferredDate ?? null,
          estimated_guests: body.estimatedGuests ?? null,
          special_requirements: [`Event type: ${body.eventType}`, body.notes]
            .filter(Boolean)
            .join("\n\n"),
        })
        .select("id")
        .single();

      if (error || !data) {
        logger.error("Failed to save event inquiry", { error });
        return fail(
          res,
          "SUBMISSION_FAILED",
          "We could not submit your inquiry right now. Please try again or reach us on WhatsApp.",
          500
        );
      }
      inquiryId = `EVT-${data.id.slice(0, 8).toUpperCase()}`;

      await notifyStaffOfSubmission({
        kind: "event inquiry",
        name: body.fullName,
        email: body.email,
        phone: body.phoneNumber,
        subject: body.eventType,
        details: [
          `Preferred date: ${body.preferredDate || "not specified"}`,
          `Estimated guests: ${body.estimatedGuests ?? "not specified"}`,
          body.notes || "",
        ].join("\n"),
      });
    }

    await sendEmail({
      to: body.email,
      templateId: "inquiry_acknowledgment",
      templateData: { name: body.fullName, service: body.eventType },
    });

    return ok(
      res,
      {
        inquiryId,
        message:
          "Your event inquiry has been received. Our event coordinator will contact you within 24 hours.",
      },
      201
    );
  },
  {
    allowedMethods: ["POST"],
    bodySchema: eventInquirySchema,
    rateLimit: { keyPrefix: "inquiries", maxRequests: 5, windowSeconds: 3600 },
  }
);
