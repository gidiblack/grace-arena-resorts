import { withApi } from "@/pages/api/v1/_shared/handler";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { authorizeBookingAccess } from "@/services/booking/access";
import { ok, fail } from "@/lib/http/response";

/**
 * "Add to my account": a signed-in user who holds a guest booking's manage link (cookie or
 * ?t=) attaches that booking to their account, even if it was made with a different email.
 */
export default withApi(
  async (req, res, ctx) => {
    const user = ctx.user!;
    const ref = String(req.query.ref || "")
      .toUpperCase()
      .trim();
    const supabase = getSupabaseAdminClient();

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, reference, user_id, channel")
      .eq("reference", ref)
      .maybeSingle();

    if (!booking || (await authorizeBookingAccess(req, booking, user, [])) === null) {
      return fail(res, "NOT_FOUND", "Booking not found or access denied", 404);
    }

    if (booking.user_id === user.id) {
      return ok(res, { linked: true, alreadyLinked: true });
    }
    if (booking.user_id) {
      return fail(res, "ALREADY_LINKED", "This booking already belongs to another account", 409);
    }
    if (booking.channel !== "online_guest") {
      return fail(res, "NOT_CLAIMABLE", "This booking cannot be added to an account", 400);
    }

    const { data: claimed } = await supabase
      .from("bookings")
      .update({ user_id: user.id })
      .eq("id", booking.id)
      .is("user_id", null)
      .select("id")
      .maybeSingle();

    if (!claimed) {
      return fail(res, "CONFLICT", "This booking was just linked to another account", 409);
    }

    await recordAuditLog({
      userId: user.id,
      action: "CLAIM_GUEST_BOOKING",
      entity: "booking",
      entityId: booking.id,
      previousData: { user_id: null },
      newData: { user_id: user.id },
      req,
    });

    return ok(res, { linked: true, alreadyLinked: false });
  },
  {
    allowedMethods: ["POST"],
    requireAuth: true,
  }
);
