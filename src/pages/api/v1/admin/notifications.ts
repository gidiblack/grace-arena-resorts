import { withApi } from "../_shared/handler";
import { ok, fail } from "@/lib/http/response";
import { getNotificationCounts } from "@/services/analytics/analytics-service";
import { logger } from "@/lib/logger";

/** Notification bell counts for the admin topbar (all staff roles; refunds for Resort Admin+). */
export default withApi(
  async (req, res, ctx) => {
    try {
      const counts = await getNotificationCounts(ctx.user!.role);
      return ok(res, counts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to load admin notifications", { error: msg, requestId: ctx.requestId });
      return fail(res, "ADMIN_NOTIFICATIONS_ERROR", "Failed to retrieve notification counts", 500);
    }
  },
  {
    allowedMethods: ["GET"],
    requiredRoles: ["content_manager", "resort_admin", "super_admin"],
  }
);
