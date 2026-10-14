import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";

export default withApi(
  async (req, res, ctx) => {
    const { ref } = req.query;
    const user = ctx.user!;

    if (!ref || typeof ref !== "string") {
      return fail(res, "MISSING_REF", "Booking reference is required", 400);
    }

    const supabase = getSupabaseAdminClient();
    const isAdmin = ["resort_admin", "super_admin", "content_manager"].includes(user.role);

    let query = supabase
      .from("bookings")
      .select("*")
      .eq("reference", ref.toUpperCase().trim());

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error) {
      return fail(res, "DB_ERROR", "Error retrieving booking", 500);
    }

    if (!booking) {
      return fail(res, "NOT_FOUND", "Booking reservation not found or access denied", 404);
    }

    // Fetch associated line items and payments
    const { data: lineItems } = await supabase
      .from("booking_line_items")
      .select("*")
      .eq("booking_id", booking.id);

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", booking.id);

    return ok(res, {
      ...booking,
      booking_line_items: lineItems || [],
      payments: payments || [],
    });
  },
  {
    allowedMethods: ["GET"],
    requireAuth: true,
  }
);
