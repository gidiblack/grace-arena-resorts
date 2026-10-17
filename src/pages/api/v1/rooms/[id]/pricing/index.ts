import { z } from "zod";
import { idOrSlugFilter } from "@/lib/supabase/filters";
import { withApi } from "../../../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { isValidCalendarDate } from "@/domain/booking/time";

const seasonalPriceSchema = z.object({
  start_date: z.string().refine(isValidCalendarDate, "Invalid start date (YYYY-MM-DD)"),
  end_date: z.string().refine(isValidCalendarDate, "Invalid end date (YYYY-MM-DD)"),
  price: z.number().positive("Price must be greater than 0"),
  label: z.string().trim().min(2, "Label is required").max(100),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Room ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // Check room type
    const { data: roomType } = await supabase
      .from("room_types")
      .select("id, name")
      .or(idOrSlugFilter(id))
      .maybeSingle();

    if (!roomType) {
      return fail(res, "NOT_FOUND", `Room type '${id}' not found`, 404);
    }

    // ==========================================
    // GET: List seasonal prices
    // ==========================================
    if (req.method === "GET") {
      const { data: prices, error } = await supabase
        .from("seasonal_prices")
        .select("*")
        .eq("room_type_id", roomType.id)
        .order("start_date", { ascending: true });

      if (error) {
        return fail(res, "FETCH_FAILED", "Failed to retrieve seasonal pricing", 500);
      }

      return ok(res, prices || []);
    }

    // ==========================================
    // POST: Add seasonal price override
    // ==========================================
    if (req.method === "POST") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(
          res,
          "FORBIDDEN",
          "Only resort administrators can manage seasonal pricing",
          403
        );
      }

      const body = req.body as z.infer<typeof seasonalPriceSchema>;

      if (body.start_date > body.end_date) {
        return fail(
          res,
          "INVALID_DATE_RANGE",
          "Start date must be before or equal to end date",
          400
        );
      }

      // Check for overlapping seasonal price records for this room type
      const { data: existingPrices } = await supabase
        .from("seasonal_prices")
        .select("id, label, start_date, end_date")
        .eq("room_type_id", roomType.id);

      const hasOverlap = (existingPrices || []).some((ep) => {
        return body.start_date <= ep.end_date && body.end_date >= ep.start_date;
      });

      if (hasOverlap) {
        return fail(
          res,
          "OVERLAPPING_DATE_RANGE",
          "This seasonal price date range overlaps with an existing seasonal price period for this suite",
          409
        );
      }

      const { data: newPrice, error: insertErr } = await supabase
        .from("seasonal_prices")
        .insert({
          room_type_id: roomType.id,
          start_date: body.start_date,
          end_date: body.end_date,
          price: body.price,
          label: body.label,
        })
        .select()
        .single();

      if (insertErr || !newPrice) {
        return fail(
          res,
          "CREATE_FAILED",
          insertErr?.message || "Failed to create seasonal price",
          500
        );
      }

      await recordAuditLog({
        userId: user.id,
        action: "CREATE_SEASONAL_PRICE",
        entity: "seasonal_prices",
        entityId: newPrice.id,
        previousData: null,
        newData: newPrice,
        req,
      });

      return ok(res, newPrice, 201);
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: seasonalPriceSchema,
  }
);
