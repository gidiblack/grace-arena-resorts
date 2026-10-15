import { withApi } from "../../_shared/handler";
import { changePasswordSchema, type ChangePasswordInput } from "@/features/auth/schemas";
import { getSupabaseAdminClient, createSupabaseAuthClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res, ctx) => {
    const user = ctx.user!;
    const { currentPassword, newPassword } = req.body as ChangePasswordInput;

    // 1. Verify the current password against Supabase Auth (per-request client)
    const { error: signInError } = await createSupabaseAuthClient().auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      if (signInError.code === "invalid_credentials") {
        return fail(
          res,
          "INVALID_CURRENT_PASSWORD",
          "The current password provided is incorrect",
          400
        );
      }
      logger.error("Current password verification failed unexpectedly", {
        code: signInError.code,
      });
      return fail(res, "AUTH_UNAVAILABLE", "Unable to verify your current password", 503);
    }

    // 2. Update the password
    const { error: updateError } = await getSupabaseAdminClient().auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      logger.error("Failed to update password", { code: updateError.code });
      return fail(res, "UPDATE_FAILED", "Failed to update password", 500);
    }

    return ok(res, { message: "Password updated successfully." });
  },
  {
    allowedMethods: ["PUT"],
    requireAuth: true,
    bodySchema: changePasswordSchema,
    rateLimit: {
      keyPrefix: "auth-change-password",
      maxRequests: 5,
      windowSeconds: 900,
    },
  }
);
