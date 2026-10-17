import type { GetServerSidePropsContext, GetServerSidePropsResult, NextApiResponse } from "next";
import type { ServerResponse } from "node:http";
import { stringifySetCookie } from "cookie";
import { getSupabaseAdminClient, createSupabaseAuthClient } from "@/lib/supabase/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, setSessionCookies } from "@/services/auth/session";
import { ADMIN_ACCESS_DENIED_NOTICE } from "./admin-notices";
import type { UserRole } from "@/types/db";

export interface AdminUserSession {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
}

export const ADMIN_LAST_SEEN_COOKIE = "gar_admin_last_seen";
export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const ALL_ADMIN_ROLES: UserRole[] = ["content_manager", "resort_admin", "super_admin"];

function updateAdminLastSeenCookie(res: ServerResponse) {
  const now = Date.now().toString();
  const cookieStr = stringifySetCookie({
    name: ADMIN_LAST_SEEN_COOKIE,
    value: now,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60, // 30 minutes
  });

  const existing = res.getHeader("Set-Cookie");
  const current = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
  res.setHeader("Set-Cookie", [...current, cookieStr]);
}

/**
 * Server-side guard for admin pages (Next.js Pages Router).
 * Validates Supabase authentication session, verifies the user's role in public.users,
 * and enforces the 30-minute admin idle timeout.
 */
export async function requireAdminPage<P extends { adminUser: AdminUserSession }>(
  ctx: GetServerSidePropsContext,
  allowedRoles: UserRole[] = ALL_ADMIN_ROLES
): Promise<GetServerSidePropsResult<P>> {
  const { req, res, resolvedUrl } = ctx;
  const redirectTarget = encodeURIComponent(resolvedUrl || "/admin");

  // 1. Check admin idle timeout
  const lastSeenStr = req.cookies?.[ADMIN_LAST_SEEN_COOKIE];
  if (lastSeenStr) {
    const lastSeen = parseInt(lastSeenStr, 10);
    if (!Number.isNaN(lastSeen) && Date.now() - lastSeen > ADMIN_IDLE_TIMEOUT_MS) {
      return {
        redirect: {
          destination: `/login?redirect=${redirectTarget}&reason=idle`,
          permanent: false,
        },
      };
    }
  }

  // 2. Extract or refresh session
  const supabase = getSupabaseAdminClient();
  let accessToken = req.cookies?.[ACCESS_COOKIE] || null;
  let authUser = accessToken ? (await supabase.auth.getUser(accessToken)).data.user : null;

  if (!authUser) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      try {
        const { data, error } = await createSupabaseAuthClient().auth.refreshSession({
          refresh_token: refreshToken,
        });
        if (!error && data.session) {
          setSessionCookies(res as unknown as NextApiResponse, data.session);
          accessToken = data.session.access_token;
          authUser = data.session.user;
        }
      } catch {
        authUser = null;
      }
    }
  }

  if (!authUser) {
    return {
      redirect: {
        destination: `/login?redirect=${redirectTarget}`,
        permanent: false,
      },
    };
  }

  // 3. Resolve user profile and role from database
  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, phone, role, is_locked")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!profile || profile.is_locked) {
    return {
      redirect: {
        destination: `/login?redirect=${redirectTarget}`,
        permanent: false,
      },
    };
  }

  // 4. Role authorization check
  const userRole = profile.role as UserRole;
  if (!ALL_ADMIN_ROLES.includes(userRole)) {
    // Signed-in guest: sending them back to /login would loop, so explain on their account page
    return {
      redirect: {
        destination: `/account?notice=${ADMIN_ACCESS_DENIED_NOTICE}`,
        permanent: false,
      },
    };
  }

  if (!allowedRoles.includes(userRole)) {
    // Authenticated admin role, but lacking permissions for this specific sub-page
    return {
      redirect: {
        destination: "/admin",
        permanent: false,
      },
    };
  }

  // 5. Update admin activity timestamp
  updateAdminLastSeenCookie(res);

  const adminUser: AdminUserSession = {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: userRole,
    phone: profile.phone,
  };

  return {
    props: {
      adminUser,
    } as unknown as P,
  };
}
