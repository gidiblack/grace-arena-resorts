import type { NextApiRequest, NextApiResponse } from "next";
import { consumeRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { fail } from "@/lib/http/response";

export interface RateLimitOptions {
  keyPrefix: string;
  maxRequests: number;
  windowSeconds: number;
  identifierExtractor?: (req: NextApiRequest) => string;
}

/**
 * Express/Next.js API middleware for per-endpoint rate limiting.
 * Returns true if allowed, or sends 429 response and returns false.
 */
export async function enforceRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options: RateLimitOptions
): Promise<boolean> {
  const identifier = options.identifierExtractor
    ? options.identifierExtractor(req)
    : getClientIp(req);

  const key = `${options.keyPrefix}:${identifier}`;
  const result = await consumeRateLimit(key, options.maxRequests, options.windowSeconds);

  res.setHeader("X-RateLimit-Limit", options.maxRequests.toString());
  res.setHeader("X-RateLimit-Remaining", Math.max(0, result.remaining).toString());
  res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());

  if (!result.success) {
    fail(
      res,
      "RATE_LIMIT_EXCEEDED",
      `Too many requests. Please try again after ${new Date(result.resetAt).toLocaleTimeString()}.`,
      429,
      { resetAt: result.resetAt }
    );
    return false;
  }

  return true;
}

export default function notFound(_req: NextApiRequest, res: NextApiResponse) {
  res.status(404).end();
}
