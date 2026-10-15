import { withApi } from "@/pages/api/v1/_shared/handler";
import { extractToken } from "@/pages/api/v1/_shared/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { clearSessionCookies } from "@/services/auth/session";
import { ok } from "@/lib/http/response";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res) => {
    const accessToken = extractToken(req);

    if (accessToken) {
      // Revokes this session's refresh tokens server-side; never signs out the admin client itself
      const { error } = await getSupabaseAdminClient().auth.admin.signOut(accessToken, "local");
      if (error) {
        logger.warn("Supabase session revocation failed during logout", { status: error.status });
      }
    }

    clearSessionCookies(res);
    return ok(res, { message: "Logged out successfully" });
  },
  {
    allowedMethods: ["POST"],
  }
);
