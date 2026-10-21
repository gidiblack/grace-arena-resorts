import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import type { Json } from "@/types/db";

export interface BookingTimelineEntry {
  id: string;
  kind: "status" | "admin_action";
  at: string;
  /** null means a system transition (payment webhook, hold-expiry job) */
  actor: { id: string; name: string } | null;
  fromStatus?: string | null;
  toStatus?: string;
  action?: string;
  note?: string | null;
}

export interface BookingUnitAssignment {
  id: string;
  bookingLineItemId: string;
  roomId: string;
  unitNumber: string | null;
  floor: string | null;
  assignedAt: string;
  releasedAt: string | null;
}

function noteFromAudit(data: Json | null): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, Json>;
  const note = record.note ?? record.overrideReason ?? record.reason ?? null;
  return typeof note === "string" && note.trim() ? note : null;
}

/**
 * Staff view of a booking's operational history (SRS 3.14.3): the status timeline from
 * booking_status_history (webhook and cron transitions included) merged with admin audit_logs
 * entries for the booking and its payments, plus the booking's own unit assignments.
 */
export default withApi(
  async (req, res) => {
    const ref = String(req.query.ref || "")
      .toUpperCase()
      .trim();
    const supabase = getSupabaseAdminClient();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("reference", ref)
      .maybeSingle();

    if (bookingError) {
      logger.error("Failed to load booking for history", { error: bookingError, ref });
      return fail(res, "DB_ERROR", "Failed to load booking history", 500);
    }
    if (!booking) {
      return fail(res, "NOT_FOUND", "Booking not found", 404);
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("id")
      .eq("booking_id", booking.id);

    const paymentIds = (payments || []).map((p) => p.id);

    const [historyResult, bookingAuditResult, paymentAuditResult, assignmentsResult] =
      await Promise.all([
        supabase
          .from("booking_status_history")
          .select("id, from_status, to_status, changed_by, note, created_at")
          .eq("booking_id", booking.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("audit_logs")
          .select("id, user_id, action, new_data, created_at")
          .eq("entity", "booking")
          .eq("entity_id", booking.id),
        paymentIds.length > 0
          ? supabase
              .from("audit_logs")
              .select("id, user_id, action, new_data, created_at")
              .eq("entity", "payment")
              .in("entity_id", paymentIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("booking_room_assignments")
          .select(
            "id, booking_line_item_id, room_id, assigned_at, released_at, room:rooms(unit_number, floor)"
          )
          .eq("booking_id", booking.id)
          .order("assigned_at", { ascending: true }),
      ]);

    const firstError =
      paymentsError ||
      historyResult.error ||
      bookingAuditResult.error ||
      paymentAuditResult.error ||
      assignmentsResult.error;
    if (firstError) {
      logger.error("Failed to load booking history", { error: firstError, ref });
      return fail(res, "DB_ERROR", "Failed to load booking history", 500);
    }

    const history = historyResult.data || [];
    const audits = [...(bookingAuditResult.data || []), ...(paymentAuditResult.data || [])];

    const actorIds = Array.from(
      new Set(
        [...history.map((h) => h.changed_by), ...audits.map((a) => a.user_id)].filter(
          (id): id is string => Boolean(id)
        )
      )
    );
    const names = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", actorIds);
      for (const u of users || []) names.set(u.id, u.full_name);
    }
    const actor = (id: string | null) => (id ? { id, name: names.get(id) || "Staff" } : null);

    const timeline: BookingTimelineEntry[] = [
      ...history.map((h) => ({
        id: h.id,
        kind: "status" as const,
        at: h.created_at,
        actor: actor(h.changed_by),
        fromStatus: h.from_status,
        toStatus: h.to_status,
        note: h.note,
      })),
      ...audits.map((a) => ({
        id: a.id,
        kind: "admin_action" as const,
        at: a.created_at,
        actor: actor(a.user_id),
        action: a.action,
        note: noteFromAudit(a.new_data),
      })),
    ].sort((a, b) => a.at.localeCompare(b.at));

    const assignments: BookingUnitAssignment[] = (assignmentsResult.data || []).map((a) => {
      const room = (a as Record<string, unknown>).room as
        { unit_number?: string | null; floor?: string | null } | null | undefined;
      return {
        id: a.id,
        bookingLineItemId: a.booking_line_item_id,
        roomId: a.room_id,
        unitNumber: room?.unit_number ?? null,
        floor: room?.floor ?? null,
        assignedAt: a.assigned_at,
        releasedAt: a.released_at,
      };
    });

    return ok(res, { timeline, assignments });
  },
  {
    allowedMethods: ["GET"],
    requireAuth: true,
    requiredRoles: ["content_manager", "resort_admin", "super_admin"],
  }
);
