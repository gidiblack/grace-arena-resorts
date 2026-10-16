import { z } from "zod";
import { withApi } from "../../../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

const updateStatusSchema = z.object({
  isLocked: z.boolean(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "User ID is required", 400);
    }

    const currentAdmin = ctx.user;
    if (!currentAdmin) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }

    const { isLocked } = req.body as z.infer<typeof updateStatusSchema>;

    // Protection: A super admin cannot lock their own account
    if (currentAdmin.id === id && isLocked) {
      return fail(res, "FORBIDDEN", "You cannot lock your own Super Admin account", 403);
    }

    const supabase = getSupabaseAdminClient();

    const { data: targetUser, error: fetchErr } = await supabase
      .from("users")
      .select("id, email, is_locked, full_name")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !targetUser) {
      return fail(res, "USER_NOT_FOUND", `User with ID '${id}' not found`, 404);
    }

    const previousLocked = targetUser.is_locked;

    const { data: updated, error: updateErr } = await supabase
      .from("users")
      .update({
        is_locked: isLocked,
        failed_login_attempts: isLocked ? 5 : 0,
        locked_until: isLocked ? new Date(Date.now() + 86400000 * 365).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, email, is_locked, full_name")
      .single();

    if (updateErr || !updated) {
      return fail(res, "UPDATE_FAILED", "Failed to update user lock status", 500);
    }

    await recordAuditLog({
      userId: currentAdmin.id,
      action: isLocked ? "LOCK_USER_ACCOUNT" : "UNLOCK_USER_ACCOUNT",
      entity: "users",
      entityId: id,
      previousData: { is_locked: previousLocked },
      newData: { is_locked: isLocked },
      req,
    });

    return ok(res, {
      user: updated,
      message: isLocked
        ? `User account '${targetUser.email}' has been locked.`
        : `User account '${targetUser.email}' has been unlocked.`,
    });
  },
  {
    allowedMethods: ["PUT"],
    requiredRoles: ["super_admin"],
    bodySchema: updateStatusSchema,
  }
);
