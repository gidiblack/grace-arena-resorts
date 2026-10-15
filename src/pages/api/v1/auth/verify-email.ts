import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { consumeToken } from "@/services/auth/tokens";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export default withApi(
  async (req, res) => {
    const { token } = req.body as z.infer<typeof verifyEmailSchema>;

    const consumed = await consumeToken("email_verification", token);
    if (!consumed?.userId) {
      return fail(
        res,
        "INVALID_TOKEN",
        "This verification link is invalid, expired, or has already been used.",
        400
      );
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("users")
      .update({ is_email_verified: true })
      .eq("id", consumed.userId);

    if (error) {
      logger.error("Failed to mark email verified", { error });
      return fail(res, "VERIFICATION_FAILED", "Unable to verify your email right now", 500);
    }

    // Keep Supabase Auth's own flag consistent (matters for accounts created before the fix)
    const { error: authError } = await supabase.auth.admin.updateUserById(consumed.userId, {
      email_confirm: true,
    });
    if (authError) {
      logger.warn("Failed to sync email_confirm to Supabase Auth", { error: authError });
    }

    return ok(res, { verified: true, email: consumed.email });
  },
  {
    allowedMethods: ["POST"],
    bodySchema: verifyEmailSchema,
    rateLimit: {
      keyPrefix: "auth-verify-email",
      maxRequests: 10,
      windowSeconds: 300,
    },
  }
);
