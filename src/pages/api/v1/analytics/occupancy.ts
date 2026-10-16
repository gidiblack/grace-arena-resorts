import { withApi } from "../_shared/handler";
import { ok, fail } from "@/lib/http/response";
import { getOccupancyAnalytics } from "@/services/analytics/analytics-service";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res, ctx) => {
    try {
      const data = await getOccupancyAnalytics();
      return ok(res, data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to load occupancy analytics", {
        error: msg,
        requestId: ctx.requestId,
      });
      return fail(res, "ANALYTICS_ERROR", "Failed to retrieve occupancy analytics", 500);
    }
  },
  {
    allowedMethods: ["GET"],
    requiredRoles: ["resort_admin", "super_admin"],
  }
);
