import { withApi } from "../_shared/handler";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok } from "@/lib/http/response";
import { sendEmail } from "@/services/email/sendgrid";
import { env } from "@/config/env";

export default withApi(
  async (req, res) => {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getSupabaseAdminClient();

    // Look up user silently
    const { data: user } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (user) {
      // 1-hour expiration timestamp
      const expiresAt = Date.now() + 60 * 60 * 1000;
      const resetToken = Buffer.from(`${user.id}:${expiresAt}`).toString("base64url");
      const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

      await sendEmail({
        to: normalizedEmail,
        templateId: "password_reset",
        templateData: {
          name: user.full_name,
          resetUrl,
        },
      });
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
