import { z } from "zod";
import { buildIlikeOrFilter } from "@/lib/supabase/filters";
import { withApi } from "../../_shared/handler";
import { verifyRecaptcha } from "../../_shared/recaptcha";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { env } from "@/config/env";
import { sendEmail } from "@/services/email";
import { notifyStaffOfSubmission } from "@/services/email/staff-alert";
import { isValidCalendarDate } from "@/domain/booking/time";
import { logger } from "@/lib/logger";
import type { EventCategoryName, InquiryStatus } from "@/types/db";

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
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List inquiries (Resort Admin+)
    // ==========================================
    if (req.method === "GET") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only resort administrators can view inquiries", 403);
      }

      const { status, search, page = "1", limit = "20" } = req.query;

      const pageNum = Math.max(1, parseInt(typeof page === "string" ? page : "1", 10) || 1);
      const limitNum = Math.min(
        100,
        Math.max(1, parseInt(typeof limit === "string" ? limit : "20", 10) || 20)
      );
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from("event_inquiries")
        .select("*, event_categories(name)", { count: "exact" });

      if (status && typeof status === "string" && status !== "all") {
        query = query.eq("status", status as InquiryStatus);
      }

      if (search && typeof search === "string" && search.trim()) {
        const term = search.trim();
        query = query.or(buildIlikeOrFilter(["contact_name", "contact_email"], term));
      }

      const {
        data: inquiries,
        count,
        error,
      } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) {
        return fail(res, "FETCH_INQUIRIES_FAILED", "Failed to retrieve inquiries", 500);
      }

      return ok(res, inquiries || [], 200, {
        total: count ?? 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((count ?? 0) / limitNum),
      });
    }

    // ==========================================
    // POST: Submit inquiry (Public)
    // ==========================================
    if (req.method === "POST") {
      const body = req.body as z.infer<typeof eventInquirySchema>;

      const recaptcha = await verifyRecaptcha(body.recaptchaToken, "event_inquiry");
      if (!recaptcha.success) {
        return fail(
          res,
          "RECAPTCHA_FAILED",
          "Spam protection check failed. Please try again.",
          400
        );
      }

      let inquiryId = `EVT-${Date.now().toString(36).toUpperCase()}`;

      if (!env.NEXT_PUBLIC_USE_MOCK_DATA) {
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
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: eventInquirySchema,
    rateLimit: { keyPrefix: "inquiries", maxRequests: 5, windowSeconds: 3600, methods: ["POST"] },
  }
);
