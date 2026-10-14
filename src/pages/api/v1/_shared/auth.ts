import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
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
  if (cookies["gar_access_token"]) {
    return cookies["gar_access_token"];
  }
  if (cookies["sb-access-token"]) {
    return cookies["sb-access-token"];
  }

  return null;
}

/**
 * Validates token and returns authenticated user and role, or null if unauthenticated.
 */
export async function getAuthUser(req: NextApiRequest): Promise<AuthUser | null> {
  const token = extractToken(req);
  if (!token) return null;

  try {
    const supabase = getSupabaseAdminClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Query user profile for role, email verification, and lockout status
    const { data: profile } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role, is_email_verified, is_locked")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_locked) {
      return null;
    }

    const role: UserRole = (profile?.role as UserRole) || (user.user_metadata?.role as UserRole) || "guest";

    return {
      id: user.id,
      email: user.email || profile?.email || "",
      fullName: profile?.full_name || (user.user_metadata?.full_name as string) || "Guest",
      phone: profile?.phone || (user.user_metadata?.phone as string) || null,
      role,
      isEmailVerified: profile?.is_email_verified ?? Boolean(user.email_confirmed_at),
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
  const user = await getAuthUser(req);
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
    fail(
      res,
      "FORBIDDEN",
      "You do not possess the required permissions for this action",
      403,
      { requiredRoles: allowedRoles, currentRole: user.role }
    );
    return null;
  }

  return user;
}
