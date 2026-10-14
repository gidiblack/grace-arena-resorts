import { stringifySetCookie } from "cookie";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok } from "@/lib/http/response";

export default withApi(
  async (req, res) => {
    const supabase = getSupabaseAdminClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore if session already dead
    }

    res.setHeader("Set-Cookie", [
      stringifySetCookie({
        name: "gar_access_token",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }),
      stringifySetCookie({
        name: "gar_refresh_token",
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }),
    ]);

    return ok(res, { message: "Logged out successfully" });
  },
  {
    allowedMethods: ["POST"],
  }
);
