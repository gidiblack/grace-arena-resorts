import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";

export default withApi(
  async (req, res, { user }) => {
    if (!user) {
      return fail(res, "UNAUTHORIZED", "Authentication required", 401);
    }

    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return fail(res, "VALIDATION_ERROR", "Payment ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    const { data: payment, error } = await supabase
      .from("payments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !payment) {
      return fail(res, "NOT_FOUND", "Payment record not found", 404);
    }

    const isAdmin = ["resort_admin", "super_admin"].includes(user.role);

    // Fetch associated booking to verify guest ownership
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, reference, user_id, guest_email, guest_name")
      .eq("id", payment.booking_id)
      .maybeSingle();

    if (!isAdmin && booking && booking.user_id && booking.user_id !== user.id) {
      return fail(res, "FORBIDDEN", "Access denied", 403);
    }

    return ok(res, {
      ...payment,
      booking: booking || null,
    });
  },
  {
    allowedMethods: ["GET"],
    requireAuth: true,
  }
);
