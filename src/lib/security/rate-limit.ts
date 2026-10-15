import type { NextApiRequest } from "next";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limiting table (keyed by prefix:identifier)
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Extracts client IP from incoming Next.js API request.
 * Platform-set headers (Vercel) are preferred because the first X-Forwarded-For entry is
 * client-controlled and could be rotated to evade rate limits.
 */
export function getClientIp(req: NextApiRequest): string {
  const vercelIp = req.headers["x-vercel-forwarded-for"];
  if (typeof vercelIp === "string" && vercelIp) {
    return vercelIp.split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp) {
    return realIp.trim();
  }
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
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

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Shared-store rate limit via the Vercel KV / Upstash Redis REST API, so limits hold across
 * serverless instances. Falls back to the in-memory limiter when KV is not configured
 * (local development, tests) or temporarily unreachable.
 */
export async function consumeRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const url = env.VERCEL_KV_REST_API_URL;
  const token = env.VERCEL_KV_REST_API_TOKEN;
  if (!url || !token) {
    return checkRateLimit(key, maxRequests, windowSeconds);
  }

  const redisKey = `gar:rl:${key}`;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["SET", redisKey, "0", "PX", String(windowSeconds * 1000), "NX"],
        ["INCR", redisKey],
        ["PTTL", redisKey],
      ]),
    });
    if (!response.ok) throw new Error(`KV responded ${response.status}`);

    const results = (await response.json()) as Array<{ result?: number; error?: string }>;
    const count = Number(results[1]?.result);
    const ttlMs = Number(results[2]?.result);
    if (!Number.isFinite(count)) throw new Error("Malformed KV response");

    const resetAt = Date.now() + (ttlMs > 0 ? ttlMs : windowSeconds * 1000);
    return { success: count <= maxRequests, remaining: Math.max(0, maxRequests - count), resetAt };
  } catch (error) {
    logger.warn("Rate limit store unavailable; using in-memory limiter", {
      error: error instanceof Error ? error.message : String(error),
    });
    return checkRateLimit(key, maxRequests, windowSeconds);
  }
}
