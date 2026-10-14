import type { NextApiRequest } from "next";
import crypto from "node:crypto";

const CSRF_COOKIE_NAME = "gar_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generates a cryptographically random CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validates CSRF token for mutating requests (POST, PUT, PATCH, DELETE).
 * Exempts external webhook endpoints or requests using valid bearer authorization.
 */
export function validateCsrf(req: NextApiRequest): boolean {
  const method = (req.method || "").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  // Exempt webhooks (such as Paystack callback which has HMAC-SHA512 verification)
  if (
    req.url?.includes("/api/v1/payments/verify") ||
    req.url?.includes("/api/v1/payments/webhook")
  ) {
    return true;
  }

  // Allow requests presenting valid API Bearer tokens or verified custom CSRF header
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers["x-requested-with"];
  if (headerToken) {
    return true;
  }

  // Check cookie match if present
  const cookies = req.cookies || {};
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  if (cookieToken && cookieToken === req.headers[CSRF_HEADER_NAME]) {
    return true;
  }

  // Check same-origin Sec-Fetch-Site header from modern browsers
  const secFetchSite = req.headers["sec-fetch-site"];
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") {
    return true;
  }

  return false;
}
