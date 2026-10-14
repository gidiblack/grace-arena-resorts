import type { NextApiResponse } from "next";

/**
 * Applies security headers to the API response according to GAR-SRS Section 5.3
 */
export function setSecurityHeaders(res: NextApiResponse): void {
  // Enforce HSTS (2 years with subdomains and preload)
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Prevent MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Cross-site scripting / content security baseline
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.paystack.co https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; frame-src 'self' https://js.paystack.co https://www.google.com/ https://www.google.com/maps/; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https:;"
  );
}
