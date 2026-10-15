import { withApi } from "../_shared/handler";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { consumeToken } from "@/services/auth/tokens";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res) => {
    const { token, newPassword } = req.body as ResetPasswordInput;

    const consumed = await consumeToken("password_reset", token);
    if (!consumed?.userId) {
      return fail(
        res,
        "INVALID_TOKEN",
        "This password reset link is invalid, expired, or has already been used. Please request a new one.",
        400
      );
    }

    const supabase = getSupabaseAdminClient();

    const { error: authError } = await supabase.auth.admin.updateUserById(consumed.userId, {
      password: newPassword,
    });

    if (authError) {
      logger.error("Failed to update password in Supabase Auth", {
        code: authError.code,
        status: authError.status,
      });
      return fail(
        res,
        "UPDATE_FAILED",
        "Failed to update password. Please request a new reset link.",
        500
      );
    }

    // A successful reset also clears any lockout
    await supabase
      .from("users")
      .update({ failed_login_attempts: 0, is_locked: false, locked_until: null })
      .eq("id", consumed.userId);

    return ok(res, {
      message: "Password reset successful. You may now log in with your new password.",
    });
  },
  {
    allowedMethods: ["POST"],
    bodySchema: resetPasswordSchema,
    rateLimit: {
      keyPrefix: "auth-reset-password",
      maxRequests: 10,
      windowSeconds: 900,
    },
  }
);
