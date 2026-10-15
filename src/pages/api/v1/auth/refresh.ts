import { withApi } from "@/pages/api/v1/_shared/handler";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { REFRESH_COOKIE, setSessionCookies, clearSessionCookies } from "@/services/auth/session";
import { ok, fail } from "@/lib/http/response";

export default withApi(
  async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
      return fail(res, "MISSING_REFRESH_TOKEN", "Refresh token is required", 401);
    }

    const { data, error } = await createSupabaseAuthClient().auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      clearSessionCookies(res);
      return fail(res, "INVALID_REFRESH_TOKEN", "Session expired or invalid refresh token", 401);
    }

    // Supabase rotates refresh tokens, so both cookies must be rewritten
    setSessionCookies(res, data.session);

    return ok(res, { expiresIn: data.session.expires_in });
  },
  {
    allowedMethods: ["POST"],
  }
);
