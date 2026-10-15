import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { authorizeBookingAccess } from "@/services/booking/access";
import { ok, fail } from "@/lib/http/response";

export default withApi(
  async (req, res, ctx) => {
    const ref = String(req.query.ref || "")
      .toUpperCase()
      .trim();

    if (!ref) {
      return fail(res, "MISSING_REF", "Booking reference is required", 400);
    }

    const supabase = getSupabaseAdminClient();
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("reference", ref)
      .maybeSingle();

    if (error) {
      return fail(res, "DB_ERROR", "Error retrieving booking", 500);
    }

    // Same 404 for "missing" and "not yours" so references cannot be probed
    const access = booking
      ? await authorizeBookingAccess(req, booking, ctx.user, [
          "resort_admin",
          "super_admin",
          "content_manager",
        ])
      : null;
    if (!booking || !access) {
      return fail(res, "NOT_FOUND", "Booking reservation not found or access denied", 404);
    }

    const [{ data: lineItems }, { data: payments }] = await Promise.all([
      supabase.from("booking_line_items").select("*").eq("booking_id", booking.id),
      supabase
        .from("payments")
        .select("id, gateway, amount, currency, status, refund_amount, refunded_at, paid_at")
        .eq("booking_id", booking.id),
    ]);

    const roomTypeIds = (lineItems || []).map((li) => li.room_type_id);
    const { data: roomTypes } = roomTypeIds.length
      ? await supabase.from("room_types").select("id, name").in("id", roomTypeIds)
      : { data: [] as Array<{ id: string; name: string }> };
    const roomNames = new Map((roomTypes || []).map((rt) => [rt.id, rt.name]));

    return ok(res, {
      ...booking,
      booking_line_items: (lineItems || []).map((li) => ({
        ...li,
        room_name: roomNames.get(li.room_type_id) || "Room",
      })),
      payments: payments || [],
      isLinkedToAccount: Boolean(booking.user_id),
      accessVia: access,
    });
  },
  {
    allowedMethods: ["GET"],
  }
);
