import type { NextApiResponse } from "next";
import { stringifySetCookie } from "cookie";

export const ACCESS_COOKIE = "gar_access_token";
export const REFRESH_COOKIE = "gar_refresh_token";

const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;
const DEFAULT_REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

/**
 * Appends Set-Cookie headers without clobbering cookies set earlier in the request.
 */
function appendSetCookie(res: NextApiResponse, cookies: string[]) {
  const existing = res.getHeader("Set-Cookie");
  const current = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
  res.setHeader("Set-Cookie", [...current, ...cookies]);
}

/**
 * Persists a Supabase session as HttpOnly cookies. Both tokens are always rewritten
 * because Supabase rotates the refresh token on every refresh.
 */
export function setSessionCookies(
  res: NextApiResponse,
  session: { access_token: string; refresh_token: string; expires_in?: number },
  rememberMe = false
) {
  const options = baseCookieOptions();
  appendSetCookie(res, [
    stringifySetCookie({
      name: ACCESS_COOKIE,
      value: session.access_token,
      ...options,
      maxAge: session.expires_in ?? 3600,
    }),
    stringifySetCookie({
      name: REFRESH_COOKIE,
      value: session.refresh_token,
      ...options,
      maxAge: rememberMe ? REMEMBER_ME_MAX_AGE : DEFAULT_REFRESH_MAX_AGE,
    }),
  ]);
}

export function clearSessionCookies(res: NextApiResponse) {
  const options = baseCookieOptions();
  appendSetCookie(res, [
    stringifySetCookie({ name: ACCESS_COOKIE, value: "", ...options, maxAge: 0 }),
    stringifySetCookie({ name: REFRESH_COOKIE, value: "", ...options, maxAge: 0 }),
  ]);
}
