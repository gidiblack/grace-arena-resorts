import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient, createSupabaseAuthClient } from "@/lib/supabase/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, setSessionCookies } from "@/services/auth/session";
import { fail } from "@/lib/http/response";
import type { UserRole } from "@/types/db";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  isEmailVerified: boolean;
}

/**
 * Extracts Bearer token from Authorization header or cookies
 */
export function extractToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  const cookies = req.cookies || {};
  return cookies[ACCESS_COOKIE] || null;
}

/**
 * Exchanges the refresh cookie for a new session and rewrites both cookies.
 * Returns the new access token, or null if there is no valid refresh token.
 */
async function refreshSessionFromCookie(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<string | null> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) return null;

  const { data, error } = await createSupabaseAuthClient().auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session) return null;

  setSessionCookies(res, data.session);
  return data.session.access_token;
}

/**
 * Validates token and returns authenticated user and role, or null if unauthenticated.
 * When `res` is supplied and the access token is missing or expired, the session is
 * transparently refreshed from the refresh cookie.
 */
export async function getAuthUser(
  req: NextApiRequest,
  res?: NextApiResponse
): Promise<AuthUser | null> {
  try {
    const supabase = getSupabaseAdminClient();
    let token = extractToken(req);
    let user = token ? (await supabase.auth.getUser(token)).data.user : null;

    if (!user && res && !req.headers.authorization) {
      token = await refreshSessionFromCookie(req, res);
      user = token ? (await supabase.auth.getUser(token)).data.user : null;
    }

    if (!user) {
      return null;
    }

    // Query user profile for role, email verification, and lockout status
    const { data: profile } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role, is_email_verified, is_locked")
      .eq("id", user.id)
      .maybeSingle();

    // No profile means no account in our system; never derive roles from user-editable metadata
    if (!profile || profile.is_locked) {
      return null;
    }

    return {
      id: user.id,
      email: profile.email,
      fullName: profile.full_name,
      phone: profile.phone,
      role: profile.role as UserRole,
      isEmailVerified: profile.is_email_verified,
    };
  } catch {
    return null;
  }
}

/**
 * Guard requiring a valid authenticated session. Rejects with 401 if missing/invalid.
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthUser | null> {
  const user = await getAuthUser(req, res);
  if (!user) {
    fail(res, "UNAUTHORIZED", "Authentication required to access this resource", 401);
    return null;
  }
  return user;
}

/**
 * Guard requiring specific authorized roles (e.g. ['resort_admin', 'super_admin']).
 * Rejects with 401 if unauthenticated, 403 if unauthorized.
 */
export async function requireRole(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: UserRole[]
): Promise<AuthUser | null> {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (!allowedRoles.includes(user.role)) {
    fail(res, "FORBIDDEN", "You do not possess the required permissions for this action", 403, {
      requiredRoles: allowedRoles,
      currentRole: user.role,
    });
    return null;
  }

  return user;
}

export default function notFound(_req: NextApiRequest, res: NextApiResponse) {
  res.status(404).end();
}
