import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/services/auth/session";

/**
 * Next.js 16 Proxy
 * Performs an optimistic redirect for /admin/:path* when no auth session cookie is present.
 * Proxy is not an authorization layer; strict RBAC is enforced in getServerSideProps via
 * requireAdminPage and in API endpoints with withApi.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const hasAccessToken = request.cookies.has(ACCESS_COOKIE);
    const hasRefreshToken = request.cookies.has(REFRESH_COOKIE);

    if (!hasAccessToken && !hasRefreshToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/admin/:path*"],
};
