import crypto from "node:crypto";
import { env } from "@/config/env";

/**
 * Stateless, non-expiring unsubscribe token: HMAC of the email with a server-only key.
 * Lets every newsletter carry a working one-click unsubscribe link without storing tokens,
 * while preventing anyone from unsubscribing an address they do not control.
 */
export function newsletterUnsubscribeToken(email: string): string {
  return crypto
    .createHmac("sha256", env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`newsletter-unsubscribe:${email.toLowerCase().trim()}`)
    .digest("base64url");
}

export function isValidUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(newsletterUnsubscribeToken(email));
  const provided = Buffer.from(token);
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

export function newsletterUnsubscribeUrl(email: string): string {
  const params = new URLSearchParams({
    email: email.toLowerCase().trim(),
    token: newsletterUnsubscribeToken(email),
  });
  return `${env.NEXT_PUBLIC_APP_URL}/api/v1/newsletter/unsubscribe?${params.toString()}`;
}
