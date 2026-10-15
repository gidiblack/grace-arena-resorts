import crypto from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "@/config/env";
import { retryFailedEmails } from "@/services/email/retry";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

function isAuthorized(req: NextApiRequest): boolean {
  const secret = env.CRON_SECRET;
  const header = req.headers.authorization || "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

/**
 * Retries queued failed emails. Call every 10 minutes from Vercel Cron (GET) or pg_cron + pg_net
 * (POST) with "Authorization: Bearer $CRON_SECRET". Disabled when CRON_SECRET is not set.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!["GET", "POST"].includes(req.method || "")) {
    res.setHeader("Allow", "GET, POST");
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }
  if (!env.CRON_SECRET) {
    return fail(res, "JOB_DISABLED", "CRON_SECRET is not configured", 503);
  }
  if (!isAuthorized(req)) {
    return fail(res, "UNAUTHORIZED", "Invalid job credentials", 401);
  }

  try {
    const summary = await retryFailedEmails();
    logger.info("Failed email retry run complete", { ...summary });
    return ok(res, summary);
  } catch (error) {
    logger.error("Failed email retry run crashed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fail(res, "JOB_FAILED", "Retry run failed", 500);
  }
}
