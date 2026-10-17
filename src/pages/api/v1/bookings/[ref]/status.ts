import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { assertTransition, canMarkNoShow } from "@/domain/booking/state-machine";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { mapRpcError } from "@/lib/supabase/rpc-errors";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";
import type { BookingStatus, Json } from "@/types/db";

const updateStatusSchema = z.object({
  status: z.enum(["checked_in", "checked_out", "no_show"]),
  assignments: z
    .array(
      z.object({
        bookingLineItemId: z.guid("Invalid bookingLineItemId"),
        roomId: z.guid("Invalid roomId"),
      })
    )
    .optional(),
  note: z.string().optional(),
});

const CHECK_IN_ERRORS = {
  BOOKING_NOT_FOUND: { message: "Booking not found", status: 404 },
  INVALID_TRANSITION: { message: "Only confirmed bookings can be checked in", status: 400 },
  MISSING_ASSIGNMENTS: { message: "Room unit assignments are required", status: 400 },
  ROOM_NOT_FOUND: { message: "Assigned room unit does not exist", status: 400 },
  ROOM_NOT_AVAILABLE: { message: "Assigned room unit is not available", status: 409 },
  ROOM_TYPE_MISMATCH: {
    message: "Assigned room unit does not match the booked room type",
    status: 400,
  },
  INVALID_LINE_ITEM: { message: "Line item does not belong to this booking", status: 400 },
  UNIQUE_VIOLATION: {
    code: "ROOM_NOT_AVAILABLE",
    message: "Assigned room unit is already assigned to another stay",
    status: 409,
  },
};

const CHECK_OUT_ERRORS = {
  BOOKING_NOT_FOUND: { message: "Booking not found", status: 404 },
  INVALID_TRANSITION: { message: "Only checked-in bookings can be checked out", status: 400 },
};

export default withApi(
  async (req, res, ctx) => {
    const { ref } = req.query;
    const {
      status: targetStatus,
      assignments,
      note,
    } = req.body as z.infer<typeof updateStatusSchema>;
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

    // 3. Status-specific validation & handling. booking_status_history is written by the
    // trg_booking_status_history trigger, never here.
    if (targetStatus === "checked_in") {
      if (currentStatus !== "confirmed") {
        return fail(res, "INVALID_TRANSITION", "Only confirmed bookings can be checked in", 400);
      }

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

      const lineItemsById = new Map((lineItems || []).map((li) => [li.id, li]));
      const perLineItem = new Map<string, number>();
      for (const assignment of assignments) {
        if (!lineItemsById.has(assignment.bookingLineItemId)) {
          return fail(
            res,
            "INVALID_LINE_ITEM",
            `Line item ${assignment.bookingLineItemId} does not belong to this booking`,
            400
          );
        }
        perLineItem.set(
          assignment.bookingLineItemId,
          (perLineItem.get(assignment.bookingLineItemId) || 0) + 1
        );
      }

      for (const li of lineItems || []) {
        if ((perLineItem.get(li.id) || 0) !== li.quantity) {
          return fail(
            res,
            "INVALID_ASSIGNMENTS",
            `Line item ${li.id} requires ${li.quantity} room unit assignment(s)`,
            400
          );
        }
      }

      if (new Set(assignments.map((a) => a.roomId)).size !== assignments.length) {
        return fail(
          res,
          "DUPLICATE_UNIT",
          "Each booked room must be assigned a different unit",
          400
        );
      }

      const { error: rpcError } = await supabase.rpc("check_in_booking", {
        p_booking_id: booking.id,
        p_assignments: assignments.map((a) => ({
          booking_line_item_id: a.bookingLineItemId,
          room_id: a.roomId,
        })) as unknown as Json,
        p_actor: user.id,
      });

      if (rpcError) {
        logger.error("check_in_booking failed", { error: rpcError, bookingId: booking.id });
        const failure = mapRpcError(rpcError, CHECK_IN_ERRORS, "Failed to check in booking");
        return fail(res, failure.code, failure.message, failure.status);
      }
    } else if (targetStatus === "checked_out") {
      if (currentStatus !== "checked_in") {
        return fail(res, "INVALID_TRANSITION", "Only checked-in bookings can be checked out", 400);
      }

      const { error: rpcError } = await supabase.rpc("check_out_booking", {
        p_booking_id: booking.id,
        p_actor: user.id,
      });

      if (rpcError) {
        logger.error("check_out_booking failed", { error: rpcError, bookingId: booking.id });
        const failure = mapRpcError(rpcError, CHECK_OUT_ERRORS, "Failed to check out booking");
        return fail(res, failure.code, failure.message, failure.status);
      }
    } else if (targetStatus === "no_show") {
      if (currentStatus !== "confirmed") {
        return fail(
          res,
          "INVALID_TRANSITION",
          "Only confirmed bookings can be marked as no-show",
          400
        );
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

      const { data: updated, error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "no_show",
          status_changed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)
        .eq("status", "confirmed")
        .select("id")
        .maybeSingle();

      if (updateError) {
        logger.error("no_show update failed", { error: updateError, bookingId: booking.id });
        return fail(res, "DB_ERROR", "Failed to mark booking as no-show", 500);
      }
      if (!updated) {
        return fail(
          res,
          "CONFLICT",
          "Booking status changed while processing; reload and retry",
          409
        );
      }
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
