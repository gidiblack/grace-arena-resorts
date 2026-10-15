import { withApi } from "../_shared/handler";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { issueToken } from "@/services/auth/tokens";
import { ok } from "@/lib/http/response";
import { sendEmail } from "@/services/email";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res) => {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getSupabaseAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (user) {
      try {
        // Random single-use token (1-hour expiry); only its hash is stored
        const resetToken = await issueToken({
          purpose: "password_reset",
          email: normalizedEmail,
          userId: user.id,
        });
        const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${encodeURIComponent(resetToken)}`;

        await sendEmail({
          to: normalizedEmail,
          templateId: "password_reset",
          templateData: {
            name: user.full_name,
            resetUrl,
          },
        });
      } catch (error) {
        logger.error("Failed to issue password reset email", { error });
      }
    }

    // Always respond with generic 200 to protect against account enumeration
    return ok(res, {
      message: "If an account matches this email, a password reset link has been dispatched.",
    });
  },
  {
    allowedMethods: ["POST"],
    bodySchema: forgotPasswordSchema,
    rateLimit: {
      keyPrefix: "auth-forgot-password",
      maxRequests: 3,
      windowSeconds: 3600,
    },
  }
);
