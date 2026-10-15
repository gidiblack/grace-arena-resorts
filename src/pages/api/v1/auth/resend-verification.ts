import { withApi } from "@/pages/api/v1/_shared/handler";
import { resendVerificationSchema } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok } from "@/lib/http/response";
import { sendVerificationEmail } from "@/services/auth/verification";
import { logger } from "@/lib/logger";

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
      try {
        await sendVerificationEmail({
          userId: user.id,
          email: normalizedEmail,
          fullName: user.full_name,
        });
      } catch (error) {
        logger.error("Failed to resend verification email", { error });
      }
    }

    // Generic response prevents account enumeration
    return ok(res, {
      message:
        "If your account is awaiting verification, a new confirmation link is on its way. If it does not arrive within a few minutes, please try again later or contact us on WhatsApp.",
    });
  },
  {
    allowedMethods: ["POST"],
    bodySchema: resendVerificationSchema,
    rateLimit: {
      keyPrefix: "auth-resend-verification",
      maxRequests: 1,
      windowSeconds: 60,
      identifierExtractor: (req) =>
        String(req.body?.email || "")
          .toLowerCase()
          .trim(),
    },
  }
);
