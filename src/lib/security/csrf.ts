import type { NextApiRequest } from "next";
import crypto from "node:crypto";
import { env } from "@/config/env";

export const CSRF_COOKIE_NAME = "gar_csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generates a cryptographically random CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function requestOrigin(req: NextApiRequest): string | null {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (typeof host !== "string" || !host) return null;
  const proto = req.headers["x-forwarded-proto"] === "http" ? "http" : "https";
  return `${proto}://${host}`;
}

function isTrustedOrigin(origin: string, req: NextApiRequest): boolean {
  const allowed = new Set<string>([new URL(env.NEXT_PUBLIC_APP_URL).origin]);
  const own = requestOrigin(req);
  if (own) {
    allowed.add(own);
    allowed.add(own.replace(/^https:/, "http:"));
  }
  return allowed.has(origin);
}

function tokensMatch(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length === 0) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates mutating requests (POST, PUT, PATCH, DELETE) against cross-site request forgery.
 * Browsers always send Sec-Fetch-Site and/or Origin on such requests, so a request is accepted when
 * it is provably same-origin. Non-browser clients must use bearer auth or the double-submit token.
 */
export function validateCsrf(req: NextApiRequest): boolean {
  const method = (req.method || "").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  // Paystack webhook is authenticated by its HMAC-SHA512 signature instead
  if (req.url?.split("?")[0] === "/api/v1/payments/webhook") {
    return true;
  }

  const secFetchSite = req.headers["sec-fetch-site"];
  if (typeof secFetchSite === "string") {
    return secFetchSite === "same-origin";
  }

  const origin = req.headers.origin;
  if (typeof origin === "string" && origin !== "null") {
    return isTrustedOrigin(origin, req);
  }

  // Bearer-token API clients do not use ambient cookies, so CSRF does not apply
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return true;
  }

  return tokensMatch(req.cookies?.[CSRF_COOKIE_NAME], req.headers[CSRF_HEADER_NAME]);
}
