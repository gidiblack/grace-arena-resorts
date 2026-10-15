import type { NextApiResponse } from "next";

/**
 * Applies security headers to the API response according to GAR-SRS Section 5.3
 */
export function setSecurityHeaders(res: NextApiResponse): void {
  // Enforce HSTS (2 years with subdomains and preload)
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // Prevent MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  // API responses are JSON only: nothing may be loaded or framed
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
}
