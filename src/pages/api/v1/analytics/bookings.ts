import { withApi } from "../_shared/handler";
import { ok, fail } from "@/lib/http/response";
import { getBookingsAnalytics } from "@/services/analytics/analytics-service";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res, ctx) => {
    try {
      const data = await getBookingsAnalytics();
      return ok(res, data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to load bookings analytics", {
        error: msg,
        requestId: ctx.requestId,
      });
      return fail(res, "ANALYTICS_ERROR", "Failed to retrieve bookings analytics", 500);
    }
  },
  {
    allowedMethods: ["GET"],
    requiredRoles: ["resort_admin", "super_admin"],
  }
);
