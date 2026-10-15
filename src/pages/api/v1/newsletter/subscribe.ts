import { z } from "zod";
import { withApi } from "../_shared/handler";
import { verifyRecaptcha } from "../_shared/recaptcha";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { sendNewsletterConfirmation } from "@/services/newsletter/confirmation";
import { logger } from "@/lib/logger";

const subscribeSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  recaptchaToken: z.string().optional(),
});

export default withApi(
  async (req, res) => {
    const { email, recaptchaToken } = req.body as z.infer<typeof subscribeSchema>;
    const normalizedEmail = email.toLowerCase().trim();

    const recaptcha = await verifyRecaptcha(recaptchaToken, "newsletter");
    if (!recaptcha.success) {
      return fail(res, "RECAPTCHA_FAILED", "Spam protection check failed. Please try again.", 400);
    }

    const supabase = getSupabaseAdminClient();
    const { data: existing, error: lookupError } = await supabase
      .from("newsletter_subscribers")
      .select("id, is_confirmed, unsubscribed_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      logger.error("Newsletter subscriber lookup failed", { error: lookupError });
      return fail(res, "SUBSCRIBE_FAILED", "Unable to subscribe right now", 503);
    }

    const alreadyActive = existing?.is_confirmed && !existing.unsubscribed_at;

    if (!alreadyActive) {
      if (!existing) {
        const { error } = await supabase
          .from("newsletter_subscribers")
          .insert({ email: normalizedEmail });
        if (error) {
          logger.error("Failed to save newsletter subscriber", { error });
          return fail(res, "SUBSCRIBE_FAILED", "Unable to subscribe right now", 503);
        }
      }

      // Double opt-in: nothing is sent to the address until it confirms
      await sendNewsletterConfirmation(normalizedEmail);
    }

    // Same response either way (no subscription status disclosure)
    return ok(res, {
      message: "Please check your inbox to confirm your newsletter subscription.",
    });
  },
  {
    allowedMethods: ["POST"],
    bodySchema: subscribeSchema,
    rateLimit: { keyPrefix: "newsletter-subscribe", maxRequests: 5, windowSeconds: 3600 },
  }
);
