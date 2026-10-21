import { stringifySetCookie } from "cookie";

export const NEWSLETTER_SUBSCRIBED_COOKIE = "gar_newsletter_subscribed";
export const NEWSLETTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Checks if the user has already subscribed to the newsletter based on the cookie.
 * Safely handles SSR/non-browser contexts by returning false if document is undefined.
 * Optionally accepts a raw cookie string (useful for SSR or test environments).
 */
export function isNewsletterSubscribed(cookieSource?: string): boolean {
  const cookieString =
    cookieSource !== undefined
      ? cookieSource
      : typeof document !== "undefined"
        ? document.cookie
        : "";

  if (!cookieString) return false;

  const match = cookieString.match(
    new RegExp(`(?:^|;\\s*)${NEWSLETTER_SUBSCRIBED_COOKIE}=([^;]*)`)
  );
  if (!match) return false;

  try {
    return decodeURIComponent(match[1]).trim() === "true";
  } catch {
    return match[1].trim() === "true";
  }
}

/**
 * Sets the newsletter subscribed cookie on the client side.
 */
export function setNewsletterSubscribedCookie(): void {
  if (typeof document === "undefined") return;

  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";

  document.cookie = `${NEWSLETTER_SUBSCRIBED_COOKIE}=true; path=/; max-age=${NEWSLETTER_COOKIE_MAX_AGE}; SameSite=Lax${
    isSecure ? "; Secure" : ""
  }`;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gar:newsletter-subscribed"));
  }
}

/**
 * Clears the newsletter subscribed cookie on the client side.
 */
export function clearNewsletterSubscribedCookie(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${NEWSLETTER_SUBSCRIBED_COOKIE}=; path=/; max-age=0; SameSite=Lax`;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gar:newsletter-unsubscribed"));
  }
}

/**
 * Generates the Set-Cookie response header value for the newsletter subscribed cookie.
 * Defaults to setting it to "true" for 1 year, or clearing it if subscribed is false.
 * Note: httpOnly is false so client-side JavaScript can read it to hide the CTA.
 */
export function createNewsletterSubscribedSetCookie(subscribed: boolean = true): string {
  return stringifySetCookie({
    name: NEWSLETTER_SUBSCRIBED_COOKIE,
    value: subscribed ? "true" : "",
    path: "/",
    maxAge: subscribed ? NEWSLETTER_COOKIE_MAX_AGE : 0,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
