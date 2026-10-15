import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { env } from "@/config/env";
import { MOCK_ROOMS } from "@/data/mock/resort-data";
import { addCalendarDays } from "@/domain/booking/time";
import { getBlockingBookingIds } from "@/services/booking/availability";
import { pickLatestSeasonalPrice } from "@/services/pricing/pricing-engine";
import { logger } from "@/lib/logger";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default withApi(
  async (req, res) => {
    const { month, roomTypeId } = req.query;

    if (!month || typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return fail(res, "INVALID_MONTH", "month query parameter is required in format YYYY-MM", 400);
    }
    if (roomTypeId !== undefined && (typeof roomTypeId !== "string" || !UUID.test(roomTypeId))) {
      if (!env.NEXT_PUBLIC_USE_MOCK_DATA) {
        return fail(res, "INVALID_ROOM_TYPE", "roomTypeId must be a valid room type id", 400);
      }
    }

    const [yearStr, monthStr] = month.split("-");
    const daysInMonth = new Date(Date.UTC(Number(yearStr), Number(monthStr), 0)).getUTCDate();
    const startDateStr = `${month}-01`;
    const endDateStr = `${month}-${String(daysInMonth).padStart(2, "0")}`;
    const days = Array.from({ length: daysInMonth }, (_, i) => addCalendarDays(startDateStr, i));

    if (env.NEXT_PUBLIC_USE_MOCK_DATA) {
      const rooms = MOCK_ROOMS.filter(
        (r) => !r.isUnderConstruction && (!roomTypeId || r.id === roomTypeId)
      );
      const total = rooms.length * 5;
      return ok(
        res,
        days.map((date) => ({ date, available: total, total, price: rooms[0]?.basePriceNgn ?? 0 }))
      );
    }

    const supabase = getSupabaseAdminClient();

    try {
      let roomTypeQuery = supabase
        .from("room_types")
        .select("id, base_price, total_units")
        .eq("status", "available");
      if (typeof roomTypeId === "string") {
        roomTypeQuery = roomTypeQuery.eq("id", roomTypeId);
      }

      const { data: roomTypes, error: rtError } = await roomTypeQuery;
      if (rtError) throw new Error(rtError.message);
      if (!roomTypes || roomTypes.length === 0) {
        return fail(res, "NOT_FOUND", "No bookable room types found for requested criteria", 404);
      }

      const roomTypeIds = roomTypes.map((rt) => rt.id);
      const monthEnd = addCalendarDays(endDateStr, 1);

      const [blockingIds, maintenanceRes, seasonalRes] = await Promise.all([
        getBlockingBookingIds(supabase, startDateStr, monthEnd),
        supabase
          .from("rooms")
          .select("room_type_id")
          .eq("status", "maintenance")
          .in("room_type_id", roomTypeIds),
        supabase
          .from("seasonal_prices")
          .select("room_type_id, start_date, end_date, price, created_at")
          .in("room_type_id", roomTypeIds)
          .lte("start_date", endDateStr)
          .gte("end_date", startDateStr),
      ]);
      if (maintenanceRes.error) throw new Error(maintenanceRes.error.message);
      if (seasonalRes.error) throw new Error(seasonalRes.error.message);

      const [bookingsRes, lineItemsRes] = blockingIds.length
        ? await Promise.all([
            supabase
              .from("bookings")
              .select("id, check_in_date, check_out_date")
              .in("id", blockingIds),
            supabase
              .from("booking_line_items")
              .select("booking_id, room_type_id, quantity")
              .in("booking_id", blockingIds)
              .in("room_type_id", roomTypeIds),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
          ];
      if (bookingsRes.error) throw new Error(bookingsRes.error.message);
      if (lineItemsRes.error) throw new Error(lineItemsRes.error.message);

      const totalUnits =
        roomTypes.reduce((acc, rt) => acc + rt.total_units, 0) - (maintenanceRes.data || []).length;
      const stays = new Map((bookingsRes.data || []).map((b) => [b.id, b]));
      const seasonal = seasonalRes.data || [];
      const singleRoom = typeof roomTypeId === "string" ? roomTypes[0] : null;

      const calendarDays = days.map((day) => {
        let dayBooked = 0;
        for (const item of lineItemsRes.data || []) {
          const stay = stays.get(item.booking_id);
          if (stay && stay.check_in_date <= day && day < stay.check_out_date) {
            dayBooked += item.quantity;
          }
        }

        let price = singleRoom?.base_price ?? Math.min(...roomTypes.map((rt) => rt.base_price));
        if (singleRoom) {
          const matching = seasonal
            .filter((sp) => day >= sp.start_date && day <= sp.end_date)
            .map((sp) => ({ ...sp, createdAt: sp.created_at }));
          if (matching.length > 0) price = pickLatestSeasonalPrice(matching).price;
        }

        return {
          date: day,
          available: Math.max(0, totalUnits - dayBooked),
          total: Math.max(0, totalUnits),
          price,
        };
      });

      return ok(res, calendarDays);
    } catch (error) {
      logger.error("Availability calendar lookup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(res, "AVAILABILITY_UNAVAILABLE", "Availability calendar is unavailable", 503);
    }
  },
  {
    allowedMethods: ["GET"],
  }
);
