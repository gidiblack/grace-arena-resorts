import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { InquiryStatus } from "@/types/db";

const updateInquirySchema = z.object({
  status: z.enum(["new", "in_review", "responded", "closed"]).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  special_requirements: z.string().trim().max(5000).optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Inquiry ID is required", 400);
    }

    const user = ctx.user;
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }
    if (!["resort_admin", "super_admin"].includes(user.role)) {
      return fail(res, "FORBIDDEN", "Only resort administrators can manage event inquiries", 403);
    }

    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: Single inquiry
    // ==========================================
    if (req.method === "GET") {
      const { data: inquiry, error: fetchErr } = await supabase
        .from("event_inquiries")
        .select("*, event_categories(*)")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !inquiry) {
        return fail(res, "NOT_FOUND", `Inquiry '${id}' not found`, 404);
      }

      return ok(res, inquiry);
    }

    // ==========================================
    // PUT: Update inquiry
    // ==========================================
    if (req.method === "PUT") {
      const updates = req.body as z.infer<typeof updateInquirySchema>;

      const { data: existing, error: fetchErr } = await supabase
        .from("event_inquiries")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !existing) {
        return fail(res, "NOT_FOUND", `Inquiry '${id}' not found`, 404);
      }

      const { data: updated, error: updateErr } = await supabase
        .from("event_inquiries")
        .update({
          ...(updates.status ? { status: updates.status as InquiryStatus } : {}),
          ...(updates.assigned_to !== undefined ? { assigned_to: updates.assigned_to } : {}),
          ...(updates.special_requirements !== undefined
            ? { special_requirements: updates.special_requirements }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*, event_categories(*)")
        .single();

      if (updateErr || !updated) {
        return fail(res, "UPDATE_FAILED", "Failed to update inquiry", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_EVENT_INQUIRY",
        entity: "event_inquiries",
        entityId: id,
        previousData: existing,
        newData: updated,
        req,
      });

      return ok(res, updated);
    }
  },
  {
    allowedMethods: ["GET", "PUT"],
    requiredRoles: ["resort_admin", "super_admin"],
    bodySchema: updateInquirySchema,
  }
);
