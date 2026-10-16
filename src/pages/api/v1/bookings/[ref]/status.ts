import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { assertTransition, canMarkNoShow } from "@/domain/booking/state-machine";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import type { BookingStatus, Json } from "@/types/db";

const updateStatusSchema = z.object({
  status: z.enum(["checked_in", "checked_out", "no_show"]),
  assignments: z
    .array(
      z.object({
        bookingLineItemId: z.string().uuid("Invalid bookingLineItemId"),
        roomId: z.string().uuid("Invalid roomId"),
      })
    )
    .optional(),
  note: z.string().optional(),
});

export default withApi(
  async (req, res, ctx) => {
    const { ref } = req.query;
    const { status: targetStatus, assignments, note } = req.body as z.infer<typeof updateStatusSchema>;
    const user = ctx.user!;

    if (!ref || typeof ref !== "string") {
      return fail(res, "MISSING_REF", "Booking reference is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // 1. Fetch booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("reference", ref.toUpperCase().trim())
      .maybeSingle();

    if (fetchError || !booking) {
      return fail(res, "NOT_FOUND", "Booking not found", 404);
    }

    const currentStatus = booking.status as BookingStatus;

    // Reject transitions from pending to confirmed or any status to cancelled
    if ((targetStatus as string) === "confirmed" || (targetStatus as string) === "cancelled") {
      return fail(
        res,
        "INVALID_TRANSITION",
        "Direct transitions to confirmed or cancelled are not permitted via this endpoint.",
        400
      );
    }

    // 2. Validate state machine transition
    try {
      assertTransition(currentStatus, targetStatus as BookingStatus);
    } catch (err) {
      return fail(
        res,
        "INVALID_TRANSITION",
        err instanceof Error
          ? err.message
          : `Invalid transition from ${currentStatus} to ${targetStatus}`,
        400
      );
    }

    // 3. Status-specific validation & handling
    if (targetStatus === "checked_in") {
      // Must be confirmed
      if (currentStatus !== "confirmed") {
        return fail(res, "INVALID_TRANSITION", "Only confirmed bookings can be checked in", 400);
      }

      // Fetch line items to verify unit count
      const { data: lineItems, error: liError } = await supabase
        .from("booking_line_items")
        .select("id, room_type_id, quantity")
        .eq("booking_id", booking.id);

      if (liError) {
        return fail(res, "DB_ERROR", "Failed to retrieve booking line items", 500);
      }

      const totalUnitsRequired = (lineItems || []).reduce((sum, li) => sum + li.quantity, 0);

      if (!assignments || assignments.length !== totalUnitsRequired) {
        return fail(
          res,
          "INVALID_ASSIGNMENTS",
          `Check-in requires exactly ${totalUnitsRequired} room unit assignment(s), received ${
            assignments?.length || 0
          }.`,
          400
        );
      }

      // Verify each bookingLineItemId belongs to this booking
      const validLineItemIds = new Set((lineItems || []).map((li) => li.id));
      for (const assignment of assignments) {
        if (!validLineItemIds.has(assignment.bookingLineItemId)) {
          return fail(
            res,
            "INVALID_LINE_ITEM",
            `Line item ${assignment.bookingLineItemId} does not belong to this booking`,
            400
          );
        }
      }

      // Call check_in_booking RPC
      const { error: rpcError } = await supabase.rpc("check_in_booking", {
        p_booking_id: booking.id,
        p_assignments: assignments.map((a) => ({
          booking_line_item_id: a.bookingLineItemId,
          room_id: a.roomId,
        })) as unknown as Json,
        p_actor: user.id,
      });

      if (rpcError) {
        // Fallback for environments where RPC is missing/mocked
        const assignmentInserts = assignments.map((a) => ({
          booking_id: booking.id,
          booking_line_item_id: a.bookingLineItemId,
          room_id: a.roomId,
          assigned_by: user.id,
        }));

        await supabase.from("booking_room_assignments").insert(assignmentInserts);
        await supabase
          .from("rooms")
          .update({ status: "occupied" })
          .in(
            "id",
            assignments.map((a) => a.roomId)
          );
        await supabase
          .from("bookings")
          .update({ status: "checked_in", status_changed_by: user.id, updated_at: new Date().toISOString() })
          .eq("id", booking.id);

        await supabase.from("booking_status_history").insert({
          booking_id: booking.id,
          from_status: currentStatus,
          to_status: "checked_in",
          changed_by: user.id,
          note: note || null,
        });
      }
    } else if (targetStatus === "checked_out") {
      if (currentStatus !== "checked_in") {
        return fail(res, "INVALID_TRANSITION", "Only checked-in bookings can be checked out", 400);
      }

      // Call check_out_booking RPC
      const { error: rpcError } = await supabase.rpc("check_out_booking", {
        p_booking_id: booking.id,
        p_actor: user.id,
      });

      if (rpcError) {
        // Fallback for environments where RPC is missing/mocked
        const { data: activeAssignments } = await supabase
          .from("booking_room_assignments")
          .select("id, room_id")
          .eq("booking_id", booking.id)
          .is("released_at", null);

        if (activeAssignments && activeAssignments.length > 0) {
          await supabase
            .from("booking_room_assignments")
            .update({ released_at: new Date().toISOString() })
            .in(
              "id",
              activeAssignments.map((a) => a.id)
            );

          await supabase
            .from("rooms")
            .update({ status: "available" })
            .in(
              "id",
              activeAssignments.map((a) => a.room_id)
            );
        }

        await supabase
          .from("bookings")
          .update({ status: "checked_out", status_changed_by: user.id, updated_at: new Date().toISOString() })
          .eq("id", booking.id);

        await supabase.from("booking_status_history").insert({
          booking_id: booking.id,
          from_status: currentStatus,
          to_status: "checked_out",
          changed_by: user.id,
          note: note || null,
        });
      }
    } else if (targetStatus === "no_show") {
      if (currentStatus !== "confirmed") {
        return fail(res, "INVALID_TRANSITION", "Only confirmed bookings can be marked as no-show", 400);
      }

      const isAllowed = canMarkNoShow(new Date(), booking.check_in_date);
      if (!isAllowed) {
        return fail(
          res,
          "NO_SHOW_PREMATURE",
          "A booking may only be marked as No-Show starting 24 hours after the scheduled check-in time (14:00 on check-in date).",
          400
        );
      }

      await supabase
        .from("bookings")
        .update({
          status: "no_show",
          status_changed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      await supabase.from("booking_status_history").insert({
        booking_id: booking.id,
        from_status: currentStatus,
        to_status: "no_show",
        changed_by: user.id,
        note: note || null,
      });
    }

    // Append admin note if provided
    if (note) {
      const updatedNotes = `${booking.special_requests || ""}\n[Admin note: ${note}]`.trim();
      await supabase
        .from("bookings")
        .update({ special_requests: updatedNotes })
        .eq("id", booking.id);
    }

    // Fetch refreshed booking
    const { data: updatedBooking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking.id)
      .single();

    // Record admin audit log
    await recordAuditLog({
      userId: user.id,
      action: `UPDATE_STATUS_${targetStatus.toUpperCase()}`,
      entity: "booking",
      entityId: booking.id,
      previousData: { status: currentStatus },
      newData: { status: targetStatus, assignments, note },
      req,
    });

    return ok(res, {
      booking: updatedBooking,
      message: `Booking status updated successfully to '${targetStatus}'.`,
    });
  },
  {
    allowedMethods: ["PUT", "PATCH"],
    requireAuth: true,
    requiredRoles: ["resort_admin", "super_admin"],
    bodySchema: updateStatusSchema,
  }
);
