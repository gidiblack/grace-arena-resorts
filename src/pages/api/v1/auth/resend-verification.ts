import { withApi } from "@/pages/api/v1/_shared/handler";
import { resendVerificationSchema } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok } from "@/lib/http/response";
import { sendEmail } from "@/services/email/sendgrid";
import { env } from "@/config/env";

export default withApi(
  async (req, res) => {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getSupabaseAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, email, full_name, is_email_verified")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (user && !user.is_email_verified) {
      const verificationToken = Buffer.from(`${user.id}:${Date.now()}`).toString("base64url");
      const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

      await sendEmail({
        to: normalizedEmail,
        templateId: "email_verification",
        templateData: {
          name: user.full_name,
          verifyUrl,
        },
      });
    }

    return ok(res, {
      message: "If your account is awaiting verification, a new confirmation link has been sent.",
    });
  },
  {
    allowedMethods: ["POST"],
    bodySchema: resendVerificationSchema,
    rateLimit: {
      keyPrefix: "auth-resend-verification",
      maxRequests: 1,
      windowSeconds: 60,
    },
  }
);
