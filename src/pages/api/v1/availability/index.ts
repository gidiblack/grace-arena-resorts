import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { MOCK_ROOMS } from "@/data/mock/resort-data";

export default withApi(
  async (req, res) => {
    const { checkIn, nights: nightsParam, checkOut: checkOutParam, resort } = req.query;

    if (!checkIn) {
      return fail(res, "MISSING_PARAM", "checkIn date (YYYY-MM-DD) is required", 400);
    }

    const checkInDate = new Date(checkIn as string);
    if (isNaN(checkInDate.getTime())) {
      return fail(res, "INVALID_DATE", "Invalid checkIn date format", 400);
    }

    let nights = 1;
    if (nightsParam) {
      nights = Math.max(1, parseInt(nightsParam as string, 10) || 1);
    } else if (checkOutParam) {
      const checkOutDate = new Date(checkOutParam as string);
      const diff = checkOutDate.getTime() - checkInDate.getTime();
      nights = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
    }

    const checkOutDate = new Date(checkInDate.getTime() + nights * 24 * 60 * 60 * 1000);
    const checkInStr = checkInDate.toISOString().slice(0, 10);
    const checkOutStr = checkOutDate.toISOString().slice(0, 10);

    const supabase = getSupabaseAdminClient();

    // 1. Fetch room types, optionally filtered by resort campus
    let roomTypes: Array<{
      id: string;
      name: string;
      tier: string;
      base_price: number | null;
      max_guests: number | null;
      total_units: number;
      status: string;
      amenities: unknown;
      images: string[];
      buildings?: unknown;
    }> = [];

    try {
      let roomTypesQuery = supabase
        .from("room_types")
        .select(
          "id, name, tier, base_price, max_guests, total_units, status, amenities, images, buildings(id, name, resorts(id, name, slug))"
        );

      if (resort && typeof resort === "string") {
        roomTypesQuery = roomTypesQuery.eq("buildings.resorts.slug", resort);
      }

      const { data, error: rtError } = await roomTypesQuery;
      if (!rtError && data && data.length > 0) {
        roomTypes = data as unknown as typeof roomTypes;
      }
    } catch {
      // Fallback below
    }

    if (roomTypes.length === 0) {
      let filtered = [...MOCK_ROOMS];
      if (resort && typeof resort === "string") {
        filtered = filtered.filter((r) => r.campus.toLowerCase() === resort.toLowerCase());
      }
      roomTypes = filtered.map((r) => ({
        id: r.id,
        name: r.name,
        tier: r.tier,
        base_price: r.basePriceNgn,
        max_guests: r.maxGuests,
        total_units: 5,
        status: r.isUnderConstruction ? "under_construction" : "available",
        amenities: r.amenities,
        images: r.images,
        buildings: {
          id: r.buildingId,
          name: r.buildingName,
          resorts: {
            id: r.campus,
            name: r.campusTitle,
            slug: r.campus,
          },
        },
      }));
    }

    // 2. Fetch active overlapping bookings
    const { data: overlappingBookings } = await supabase
      .from("bookings")
      .select("id, status, created_at")
      .lt("check_in_date", checkOutStr)
      .gt("check_out_date", checkInStr)
      .in("status", ["confirmed", "checked_in", "pending"]);

    // Calculate booked units per room type
    const bookedMap: Record<string, number> = {};
    const now = Date.now();
    const expiryWindowMs = 30 * 60 * 1000;

    const validBookingIds = (overlappingBookings || [])
      .filter((b) => {
        if (b.status === "pending") {
          const createdAt = new Date(b.created_at).getTime();
          return now - createdAt <= expiryWindowMs;
        }
        return true;
      })
      .map((b) => b.id);

    if (validBookingIds.length > 0) {
      const { data: items } = await supabase
        .from("booking_line_items")
        .select("room_type_id, quantity")
        .in("booking_id", validBookingIds);

      (items || []).forEach((item) => {
        bookedMap[item.room_type_id] = (bookedMap[item.room_type_id] || 0) + item.quantity;
      });
    }

    // 3. Fetch maintenance units per room type
    const { data: maintenanceRooms } = await supabase
      .from("rooms")
      .select("room_type_id")
      .eq("status", "maintenance");

    const maintenanceMap: Record<string, number> = {};
    (maintenanceRooms || []).forEach((r) => {
      maintenanceMap[r.room_type_id] = (maintenanceMap[r.room_type_id] || 0) + 1;
    });

    // 4. Calculate available count for each room type
    const results = roomTypes.map((rt) => {
      if (rt.status === "under_construction") {
        return {
          ...rt,
          availableUnits: 0,
          isAvailable: false,
        };
      }

      const bookedCount = bookedMap[rt.id] || 0;
      const maintenanceCount = maintenanceMap[rt.id] || 0;
      const availableUnits = Math.max(0, rt.total_units - bookedCount - maintenanceCount);

      return {
        ...rt,
        availableUnits,
        isAvailable: availableUnits > 0,
      };
    });

    return ok(res, {
      checkIn: checkInStr,
      checkOut: checkOutStr,
      nights,
      rooms: results,
    });
  },
  {
    allowedMethods: ["GET"],
  }
);
