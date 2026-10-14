import bcrypt from "bcryptjs";
import { withApi } from "../../_shared/handler";
import { changePasswordSchema } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res, ctx) => {
    const user = ctx.user!;
    const { currentPassword, newPassword } = req.body;
    const supabase = getSupabaseAdminClient();

    // 1. Fetch current password hash
    const { data: dbUser, error } = await supabase
      .from("users")
      .select("id, password_hash")
      .eq("id", user.id)
      .single();

    if (error || !dbUser || !dbUser.password_hash) {
      return fail(res, "USER_NOT_FOUND", "User profile not found", 404);
    }

    // 2. Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.password_hash);
    if (!isCurrentValid) {
      return fail(res, "INVALID_CURRENT_PASSWORD", "The current password provided is incorrect", 400);
    }

    // 3. Hash new password with bcrypt cost factor >= 12
    const newHash = await bcrypt.hash(newPassword, 12);

    // 4. Update in database
    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: newHash })
      .eq("id", user.id);

    if (updateError) {
      logger.error("Failed to update password hash in database", { error: updateError });
      return fail(res, "UPDATE_FAILED", "Failed to update password", 500);
    }

    // 5. Also update in Supabase Auth if applicable
    try {
      await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
    } catch {
      // In offline/mock mode ignore
    }

    return ok(res, { message: "Password updated successfully." });
  },
  {
    allowedMethods: ["PUT"],
    requireAuth: true,
    bodySchema: changePasswordSchema,
  }
);
