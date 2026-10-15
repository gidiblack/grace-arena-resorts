import type { NextApiResponse } from "next";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { consumeToken } from "@/services/auth/tokens";
import { newsletterUnsubscribeUrl } from "@/services/newsletter/tokens";
import { escapeHtml } from "@/services/email/templates";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

function renderPage(res: NextApiResponse, status: number, heading: string, body: string) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(status).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(heading)} — Grace Arena Resorts</title>
    <style>
      body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0F172A; color: #F8FAFC; text-align: center; }
      .card { background: #1E293B; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 480px; margin: 20px; }
      h1 { color: #FCCA46; margin-top: 0; font-size: 24px; }
      a { color: #FCCA46; }
      .home { display: inline-block; margin-top: 24px; background: #FCCA46; color: #0F172A; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${escapeHtml(heading)}</h1>
      ${body}
      <a class="home" href="/">Return to Home</a>
    </main>
  </body>
</html>`);
}

export default withApi(
  async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const wantsHtml = Boolean(req.headers.accept?.includes("text/html"));

    const consumed = await consumeToken("newsletter_confirm", token);
    if (!consumed) {
      if (wantsHtml) {
        return renderPage(
          res,
          400,
          "Link Expired",
          "<p>This confirmation link is invalid or has already been used. Please subscribe again from our website.</p>"
        );
      }
      return fail(res, "INVALID_TOKEN", "Confirmation token is missing, invalid, or expired", 400);
    }

    const { error } = await getSupabaseAdminClient().from("newsletter_subscribers").upsert(
      {
        email: consumed.email,
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
        unsubscribed_at: null,
      },
      { onConflict: "email" }
    );

    if (error) {
      logger.error("Failed to confirm newsletter subscription", { error });
      return fail(res, "CONFIRM_FAILED", "Unable to confirm your subscription right now", 503);
    }

    if (wantsHtml) {
      return renderPage(
        res,
        200,
        "Subscription Confirmed!",
        `<p>Your email <strong>${escapeHtml(consumed.email)}</strong> is now subscribed to Grace Arena Resorts updates.</p>
      <p style="font-size: 13px; color: #94A3B8;">Changed your mind? <a href="${escapeHtml(newsletterUnsubscribeUrl(consumed.email))}">Unsubscribe</a></p>`
      );
    }

    return ok(res, {
      confirmed: true,
      email: consumed.email,
      message: "Your subscription has been successfully verified.",
    });
  },
  {
    allowedMethods: ["GET"],
  }
);
