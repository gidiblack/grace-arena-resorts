import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";

export default withApi(
  async (req, res, ctx) => {
    const { id, pricingId } = req.query;

    if (!id || typeof id !== "string" || !pricingId || typeof pricingId !== "string") {
      return fail(res, "BAD_REQUEST", "Room ID and Pricing ID are required", 400);
    }

    const user = ctx.user;
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }
    if (!["resort_admin", "super_admin"].includes(user.role)) {
      return fail(res, "FORBIDDEN", "Only resort administrators can delete seasonal pricing", 403);
    }

    const supabase = getSupabaseAdminClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("seasonal_prices")
      .select("*")
      .eq("id", pricingId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return fail(res, "NOT_FOUND", "Seasonal price record not found", 404);
    }

    const { error: deleteErr } = await supabase
      .from("seasonal_prices")
      .delete()
      .eq("id", pricingId);

    if (deleteErr) {
      return fail(res, "DELETE_FAILED", "Failed to delete seasonal price", 500);
    }

    await recordAuditLog({
      userId: user.id,
      action: "DELETE_SEASONAL_PRICE",
      entity: "seasonal_prices",
      entityId: pricingId,
      previousData: existing,
      newData: null,
      req,
    });

    return ok(res, { message: "Seasonal price override deleted." });
  },
  {
    allowedMethods: ["DELETE"],
  }
);
