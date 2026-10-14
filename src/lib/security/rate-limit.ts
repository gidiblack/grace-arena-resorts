import type { NextApiRequest } from "next";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limiting table (keyed by prefix:identifier)
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Extracts client IP from incoming Next.js API request
 */
export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string") {
    return realIp.trim();
  }
  return req.socket.remoteAddress || "127.0.0.1";
}

/**
 * Checks and increments rate limit for a given key.
 *
 * @param key Unique key, e.g. "contact:127.0.0.1"
 * @param maxRequests Maximum requests allowed within window
 * @param windowSeconds Window length in seconds
 * @returns { success: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = rateLimitMap.get(key);

  if (!existing || now >= existing.resetAt) {
    const record: RateLimitRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitMap.set(key, record);
    return {
      success: true,
      remaining: maxRequests - 1,
      resetAt: record.resetAt,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    success: true,
    remaining: maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Helper to reset rate limits (useful for unit tests)
 */
export function resetRateLimits(): void {
  rateLimitMap.clear();
}
