import { stringifySetCookie } from "cookie";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";

export default withApi(
  async (req, res) => {
    const cookies = req.cookies || {};
    const refreshToken = req.body?.refreshToken || cookies["gar_refresh_token"];

    if (!refreshToken) {
      return fail(res, "MISSING_REFRESH_TOKEN", "Refresh token is required", 401);
    }

    const supabase = getSupabaseAdminClient();
    try {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

      if (error || !data.session) {
        return fail(res, "INVALID_REFRESH_TOKEN", "Session expired or invalid refresh token", 401);
      }

      const accessMaxAge = 60 * 15;
      res.setHeader(
        "Set-Cookie",
        stringifySetCookie({
          name: "gar_access_token",
          value: data.session.access_token,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: accessMaxAge,
        })
      );

      return ok(res, {
        accessToken: data.session.access_token,
        expiresIn: accessMaxAge,
      });
    } catch {
      return fail(res, "REFRESH_FAILED", "Failed to refresh session", 401);
    }
  },
  {
    allowedMethods: ["POST"],
  }
);
