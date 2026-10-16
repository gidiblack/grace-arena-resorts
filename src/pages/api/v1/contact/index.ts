import { z } from "zod";
import { withApi } from "../_shared/handler";
import { verifyRecaptcha } from "../_shared/recaptcha";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { env } from "@/config/env";
import { sendEmail } from "@/services/email";
import { notifyStaffOfSubmission } from "@/services/email/staff-alert";
import { logger } from "@/lib/logger";
import type { ContactStatus } from "@/types/db";

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
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List submissions (Resort Admin+)
    // ==========================================
    if (req.method === "GET") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only resort administrators can view contact submissions", 403);
      }

      const { status, search, page = "1", limit = "20" } = req.query;

      const pageNum = Math.max(1, parseInt(typeof page === "string" ? page : "1", 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(typeof limit === "string" ? limit : "20", 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      let query = supabase.from("contact_submissions").select("*", { count: "exact" });

      if (status && typeof status === "string" && status !== "all") {
        query = query.eq("status", status as ContactStatus);
      }

      if (search && typeof search === "string" && search.trim()) {
        const term = search.trim();
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,subject.ilike.%${term}%`);
      }

      const { data: submissions, count, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) {
        return fail(res, "FETCH_SUBMISSIONS_FAILED", "Failed to retrieve submissions", 500);
      }

      return ok(res, submissions || [], 200, {
        total: count ?? 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((count ?? 0) / limitNum),
      });
    }

    // ==========================================
    // POST: Public submission
    // ==========================================
    if (req.method === "POST") {
      const { fullName, email, phoneNumber, subject, message, recaptchaToken } = req.body as z.infer<
        typeof contactSchema
      >;

      const recaptcha = await verifyRecaptcha(recaptchaToken, "contact");
      if (!recaptcha.success) {
        return fail(res, "RECAPTCHA_FAILED", "Spam protection check failed. Please try again.", 400);
      }

      let ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;

      if (!env.NEXT_PUBLIC_USE_MOCK_DATA) {
        const { data, error } = await supabase
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
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: contactSchema,
    rateLimit: { keyPrefix: "contact", maxRequests: 3, windowSeconds: 3600, methods: ["POST"] },
  }
);
