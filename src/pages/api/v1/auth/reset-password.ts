import bcrypt from "bcryptjs";
import { withApi } from "../_shared/handler";
import { resetPasswordSchema } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res) => {
    const { token, newPassword } = req.body;

    // Decode and validate token payload
    let userId: string;
    let expiresAt: number;

    try {
      const decoded = Buffer.from(token, "base64url").toString("utf8");
      const [parsedId, parsedTime] = decoded.split(":");
      userId = parsedId;
      expiresAt = parseInt(parsedTime, 10);

      if (!userId || isNaN(expiresAt)) {
        throw new Error("Malformed token");
      }
    } catch {
      return fail(res, "INVALID_TOKEN", "The password reset token is invalid or corrupted", 400);
    }

    if (Date.now() > expiresAt) {
      return fail(
        res,
        "TOKEN_EXPIRED",
        "The password reset link has expired. Please request a new one.",
        400
      );
    }

    const supabase = getSupabaseAdminClient();

    // Check user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", userId)
      .maybeSingle();

    if (userError || !user) {
      return fail(res, "USER_NOT_FOUND", "Account not found", 404);
    }

    // Hash new password with bcrypt (cost factor >= 12)
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update in database and reset lockout/failed attempts
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: newHash,
        failed_login_attempts: 0,
        is_locked: false,
        locked_until: null,
      })
      .eq("id", userId);

    if (updateError) {
      logger.error("Failed to update password in database", { error: updateError });
      return fail(res, "UPDATE_FAILED", "Failed to update password", 500);
    }

    // Also update in Supabase Auth if user exists there
    try {
      await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    } catch {
      // In offline/mock mode ignore
    }

    return ok(res, {
      message: "Password reset successful. You may now log in with your new password.",
    });
  },
  {
    allowedMethods: ["POST"],
    bodySchema: resetPasswordSchema,
  }
);
