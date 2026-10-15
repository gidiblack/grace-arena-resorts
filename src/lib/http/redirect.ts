/**
 * Returns `candidate` only if it is a same-site relative path ("/account", "/booking?x=1").
 * Rejects absolute URLs, protocol-relative ("//evil.com") and backslash tricks ("/\evil.com")
 * to prevent open redirects via ?redirect=.
 */
export function safeRedirectPath(candidate: unknown, fallback = "/account"): string {
  if (typeof candidate !== "string" || candidate.length === 0) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }
  return candidate;
}
