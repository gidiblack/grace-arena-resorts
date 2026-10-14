import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { MOCK_ROOMS } from "@/data/mock/resort-data";

export default withApi(
  async (req, res) => {
    const { month, roomTypeId } = req.query;

    if (!month || typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
      return fail(res, "INVALID_MONTH", "month query parameter is required in format YYYY-MM", 400);
    }

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10); // 1-12

    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const startDateStr = `${month}-01`;
    const endDateStr = `${month}-${String(daysInMonth).padStart(2, "0")}`;

    const supabase = getSupabaseAdminClient();

    // 1. Fetch room types
    let roomTypes: Array<{
      id: string;
      name: string;
      base_price: number | null;
      total_units: number;
      status: string;
    }> = [];

    try {
      let roomTypeQuery = supabase
        .from("room_types")
        .select("id, name, base_price, total_units, status");

      if (roomTypeId) {
        roomTypeQuery = roomTypeQuery.eq("id", String(roomTypeId));
      }

      const { data, error: rtError } = await roomTypeQuery;
      if (!rtError && data && data.length > 0) {
        roomTypes = data;
      }
    } catch {
      // Fallback below
    }

    if (roomTypes.length === 0) {
      let filtered = [...MOCK_ROOMS];
      if (roomTypeId) {
        filtered = filtered.filter((r) => r.id === String(roomTypeId));
      }
      roomTypes = filtered.map((r) => ({
        id: r.id,
        name: r.name,
        base_price: r.basePriceNgn,
        total_units: 5,
        status: r.isUnderConstruction ? "under_construction" : "available",
      }));
    }

    if (roomTypes.length === 0) {
      return fail(res, "NOT_FOUND", "No room types found for requested criteria", 404);
    }

    const targetRoomTypes = roomTypes.filter((rt) => rt.status !== "under_construction");
    const roomTypeIds = targetRoomTypes.map((rt) => rt.id);
    const totalUnitsCount = targetRoomTypes.reduce((acc, rt) => acc + rt.total_units, 0);

    // 2. Fetch seasonal prices overlapping the month
    const { data: seasonalPrices } = await supabase
      .from("seasonal_prices")
      .select("room_type_id, start_date, end_date, price, created_at")
      .in("room_type_id", roomTypeIds)
      .lte("start_date", endDateStr)
      .gte("end_date", startDateStr);

    // 3. Fetch active bookings overlapping the month
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id, status, created_at, check_in_date, check_out_date")
      .in("status", ["confirmed", "checked_in", "pending"])
      .lte("check_in_date", endDateStr)
      .gte("check_out_date", startDateStr);

    const bookingIds = (activeBookings || []).map((b) => b.id);
    let lineItems: Array<{ booking_id: string; room_type_id: string; quantity: number }> = [];
    if (bookingIds.length > 0) {
      const { data: items } = await supabase
        .from("booking_line_items")
        .select("booking_id, room_type_id, quantity")
        .in("booking_id", bookingIds);
      lineItems = items || [];
    }

    const itemsByBooking: Record<string, Array<{ room_type_id: string; quantity: number }>> = {};
    lineItems.forEach((item) => {
      if (!itemsByBooking[item.booking_id]) itemsByBooking[item.booking_id] = [];
      itemsByBooking[item.booking_id].push(item);
    });

    // 4. Calculate for every day in the month
    const calendarDays = [];
    const now = Date.now();
    const expiryWindowMs = 30 * 60 * 1000;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${month}-${String(day).padStart(2, "0")}`;

      // Calculate booked units on this day
      let dayBooked = 0;
      (activeBookings || []).forEach((b) => {
        if (b.status === "pending") {
          const createdAt = new Date(b.created_at).getTime();
          if (now - createdAt > expiryWindowMs) return;
        }

        // Booking active on day if: check_in_date <= day < check_out_date
        if (b.check_in_date <= dayStr && dayStr < b.check_out_date) {
          const items = itemsByBooking[b.id] || [];
          items.forEach((item) => {
            if (roomTypeIds.includes(item.room_type_id)) {
              dayBooked += item.quantity;
            }
          });
        }
      });

      // Calculate effective price for this day
      let dayPrice = targetRoomTypes[0]?.base_price || 0;
      if (roomTypeId) {
        const rt = targetRoomTypes[0];
        const matchingSeasonal = (seasonalPrices || []).filter(
          (sp) => sp.room_type_id === rt?.id && dayStr >= sp.start_date && dayStr <= sp.end_date
        );
        if (matchingSeasonal.length > 0) {
          dayPrice = matchingSeasonal[matchingSeasonal.length - 1].price;
        }
      }

      calendarDays.push({
        date: dayStr,
        available: Math.max(0, totalUnitsCount - dayBooked),
        total: totalUnitsCount,
        price: dayPrice,
      });
    }

    return ok(res, calendarDays);
  },
  {
    allowedMethods: ["GET"],
  }
);
