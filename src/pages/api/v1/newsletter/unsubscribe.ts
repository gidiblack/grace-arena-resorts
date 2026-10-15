import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isValidUnsubscribeToken } from "@/services/newsletter/tokens";
import { escapeHtml } from "@/services/email/templates";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

/**
 * One-click unsubscribe. Requires the signed token from the newsletter link, so an address
 * cannot be unsubscribed by someone who merely knows it.
 * GET (link in email) renders a page; POST returns JSON.
 */
export default withApi(
  async (req, res) => {
    const source = req.method === "GET" ? req.query : req.body || {};
    const email = typeof source.email === "string" ? source.email.toLowerCase().trim() : "";
    const token = typeof source.token === "string" ? source.token : "";

    if (!email || !token || !isValidUnsubscribeToken(email, token)) {
      return fail(res, "INVALID_TOKEN", "This unsubscribe link is invalid", 400);
    }

    const { error } = await getSupabaseAdminClient()
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", email);

    if (error) {
      logger.error("Failed to unsubscribe newsletter recipient", { error });
      return fail(res, "UNSUBSCRIBE_FAILED", "Unable to unsubscribe right now", 503);
    }

    if (req.method === "GET") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Unsubscribed — Grace Arena Resorts</title></head>
<body style="font-family: system-ui, sans-serif; background: #0F172A; color: #F8FAFC; text-align: center; padding: 64px 16px;">
<h1 style="color: #FCCA46;">You have been unsubscribed</h1>
<p>${escapeHtml(email)} will no longer receive Grace Arena Resorts newsletters.</p>
<p><a href="/" style="color: #FCCA46;">Return to Home</a></p>
</body></html>`);
    }

    return ok(res, {
      unsubscribed: true,
      email,
      message: "You have been successfully removed from our mailing list.",
    });
  },
  {
    allowedMethods: ["GET", "POST"],
    rateLimit: { keyPrefix: "newsletter-unsubscribe", maxRequests: 10, windowSeconds: 3600 },
  }
);
