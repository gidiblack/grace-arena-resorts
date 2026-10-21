import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { ContactStatus } from "@/types/db";

const updateContactSchema = z.object({
  status: z.enum(["new", "read", "responded", "closed"]),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Submission ID is required", 400);
    }

    const user = ctx.user;
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }
    if (!["resort_admin", "super_admin"].includes(user.role)) {
      return fail(res, "FORBIDDEN", "Only resort administrators can update contact submissions", 403);
    }

    const { status: newStatus } = req.body as z.infer<typeof updateContactSchema>;
    const supabase = getSupabaseAdminClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("contact_submissions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return fail(res, "NOT_FOUND", `Submission '${id}' not found`, 404);
    }

    const previousStatus = existing.status;

    const { data: updated, error: updateErr } = await supabase
      .from("contact_submissions")
      .update({
        status: newStatus as ContactStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr || !updated) {
      return fail(res, "UPDATE_FAILED", "Failed to update submission status", 500);
    }

    await recordAuditLog({
      userId: user.id,
      action: "UPDATE_CONTACT_STATUS",
      entity: "contact_submissions",
      entityId: id,
      previousData: { status: previousStatus },
      newData: { status: newStatus },
      req,
    });

    return ok(res, updated);
  },
  {
    allowedMethods: ["PUT"],
    requiredRoles: ["resort_admin", "super_admin"],
    bodySchema: updateContactSchema,
  }
);
