import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail } from "@/lib/http/response";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return fail(res, "INVALID_TOKEN", "Confirmation token is missing or invalid", 400);
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [email] = decoded.split(":");

    // Return HTML or JSON confirmation response
    if (req.headers.accept?.includes("text/html")) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Subscription Confirmed — Grace Arena Resorts</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0F172A; color: #F8FAFC; text-align: center; }
              .card { background: #1E293B; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 480px; margin: 20px; }
              h1 { color: #FCCA46; margin-top: 0; font-size: 24px; }
              a { display: inline-block; margin-top: 24px; background: #FCCA46; color: #0F172A; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Subscription Confirmed!</h1>
              <p>Your email <strong>${email}</strong> has been successfully subscribed to Grace Arena Resorts updates.</p>
              <a href="/">Return to Home</a>
            </div>
          </body>
        </html>
      `);
    }

    return ok(res, {
      confirmed: true,
      email,
      message: "Your subscription has been successfully verified.",
    });
  } catch {
    return fail(res, "MALFORMED_TOKEN", "Unable to parse confirmation token", 400);
  }
}
