import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";

export default withApi(
  async (req, res, ctx) => {
    const user = ctx.user;
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }
    if (!["resort_admin", "super_admin"].includes(user.role)) {
      return fail(res, "FORBIDDEN", "Only resort administrators can view newsletter subscribers", 403);
    }

    const { confirmed, search, format, page = "1", limit = "50" } = req.query;
    const supabase = getSupabaseAdminClient();

    let query = supabase.from("newsletter_subscribers").select("*", { count: "exact" });

    if (confirmed === "true") {
      query = query.eq("is_confirmed", true);
    } else if (confirmed === "false") {
      query = query.eq("is_confirmed", false);
    }

    if (search && typeof search === "string" && search.trim()) {
      query = query.ilike("email", `%${search.trim()}%`);
    }

    // CSV Export option
    if (format === "csv") {
      const { data: allSubscribers, error } = await query.order("created_at", { ascending: false });
      if (error) {
        return fail(res, "FETCH_FAILED", "Failed to export subscribers", 500);
      }

      const headers = "ID,Email,Confirmed,Confirmed At,Unsubscribed At,Subscribed At\n";
      const rows = (allSubscribers || [])
        .map((s) => `"${s.id}","${s.email}",${s.is_confirmed},"${s.confirmed_at || ""}","${s.unsubscribed_at || ""}","${s.created_at}"`)
        .join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="newsletter-subscribers-${Date.now()}.csv"`);
      res.status(200).send(headers + rows);
      return;
    }

    const pageNum = Math.max(1, parseInt(typeof page === "string" ? page : "1", 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(typeof limit === "string" ? limit : "50", 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const { data: subscribers, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      return fail(res, "FETCH_FAILED", "Failed to retrieve subscribers", 500);
    }

    return ok(res, subscribers || [], 200, {
      total: count ?? 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count ?? 0) / limitNum),
    });
  },
  {
    allowedMethods: ["GET"],
    requiredRoles: ["resort_admin", "super_admin"],
  }
);
