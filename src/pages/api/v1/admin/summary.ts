import { withApi } from "../_shared/handler";
import { ok, fail } from "@/lib/http/response";
import { getAdminSummary } from "@/services/analytics/analytics-service";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res, ctx) => {
    try {
      const userRole = ctx.user?.role || "content_manager";
      const summary = await getAdminSummary(userRole);
      return ok(res, summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to load admin summary", { error: msg, requestId: ctx.requestId });
      return fail(res, "ADMIN_SUMMARY_ERROR", "Failed to retrieve admin summary KPIs", 500);
    }
  },
  {
    allowedMethods: ["GET"],
    requiredRoles: ["content_manager", "resort_admin", "super_admin"],
  }
);
