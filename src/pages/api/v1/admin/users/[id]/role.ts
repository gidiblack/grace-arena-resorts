import { z } from "zod";
import { withApi } from "../../../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import type { UserRole } from "@/types/db";

const updateRoleSchema = z.object({
  role: z.enum(["guest", "content_manager", "resort_admin", "super_admin"]),
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

    const { role: newRole } = req.body as z.infer<typeof updateRoleSchema>;

    // Protection: A super admin cannot demote their own account
    if (currentAdmin.id === id && newRole !== "super_admin") {
      return fail(res, "FORBIDDEN", "You cannot demote your own Super Admin account", 403);
    }

    const supabase = getSupabaseAdminClient();

    // Check target user
    const { data: targetUser, error: fetchErr } = await supabase
      .from("users")
      .select("id, email, role, full_name")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !targetUser) {
      return fail(res, "USER_NOT_FOUND", `User with ID '${id}' not found`, 404);
    }

    const previousRole = targetUser.role;

    const { data: updated, error: updateErr } = await supabase
      .from("users")
      .update({
        role: newRole as UserRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, email, role, full_name")
      .single();

    if (updateErr || !updated) {
      return fail(res, "UPDATE_FAILED", "Failed to update user role", 500);
    }

    await recordAuditLog({
      userId: currentAdmin.id,
      action: "UPDATE_USER_ROLE",
      entity: "users",
      entityId: id,
      previousData: { role: previousRole },
      newData: { role: newRole },
      req,
    });

    return ok(res, {
      user: updated,
      message: `User role updated from '${previousRole}' to '${newRole}'.`,
    });
  },
  {
    allowedMethods: ["PUT"],
    requiredRoles: ["super_admin"],
    bodySchema: updateRoleSchema,
  }
);
