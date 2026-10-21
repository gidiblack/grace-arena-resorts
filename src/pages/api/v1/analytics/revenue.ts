import { withApi } from "../_shared/handler";
import { ok, fail } from "@/lib/http/response";
import { getRevenueAnalytics } from "@/services/analytics/analytics-service";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res, ctx) => {
    try {
      const data = await getRevenueAnalytics();
      return ok(res, data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to load revenue analytics", {
        error: msg,
        requestId: ctx.requestId,
      });
      return fail(res, "ANALYTICS_ERROR", "Failed to retrieve revenue analytics", 500);
    }
  },
  {
    allowedMethods: ["GET"],
    requiredRoles: ["resort_admin", "super_admin"],
  }
);
