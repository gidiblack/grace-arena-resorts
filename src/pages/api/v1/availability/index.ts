import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { env } from "@/config/env";
import { MOCK_ROOMS } from "@/data/mock/resort-data";
import {
  addCalendarDays,
  isValidCalendarDate,
  nightsBetween,
  resortToday,
} from "@/domain/booking/time";
import { getStayAvailability, type StayAvailabilityRoom } from "@/services/booking/availability";
import { getTaxRate } from "@/services/booking/booking-data";
import { logger } from "@/lib/logger";

function mockAvailability(nights: number, resort?: string): StayAvailabilityRoom[] {
  return MOCK_ROOMS.filter((r) => !resort || r.campus === resort).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    tier: r.tier.toLowerCase(),
    campus: r.campus,
    campusTitle: r.campusTitle,
    buildingName: r.buildingName,
    maxGuests: r.maxGuests ?? 2,
    totalUnits: 5,
    availableUnits: r.isUnderConstruction ? 0 : 5,
    isAvailable: !r.isUnderConstruction,
    status: r.isUnderConstruction ? "under_construction" : "available",
    basePrice: r.basePriceNgn ?? 0,
    stayPrice: (r.basePriceNgn ?? 0) * nights,
    averageNightlyRate: r.basePriceNgn ?? 0,
    images: r.images,
  }));
}

export default withApi(
  async (req, res) => {
    const { checkIn, nights: nightsParam, checkOut: checkOutParam, resort } = req.query;

    if (!isValidCalendarDate(checkIn)) {
      return fail(res, "INVALID_DATE", "checkIn date (YYYY-MM-DD) is required", 400);
    }
    if (checkIn < resortToday()) {
      return fail(res, "PAST_DATE", "Check-in date cannot be in the past", 400);
    }

    let nights = 1;
    if (typeof nightsParam === "string") {
      nights = parseInt(nightsParam, 10);
    } else if (isValidCalendarDate(checkOutParam)) {
      nights = nightsBetween(checkIn, checkOutParam);
    }
    if (!Number.isInteger(nights) || nights < 1 || nights > 30) {
      return fail(res, "INVALID_NIGHTS", "Stay length must be between 1 and 30 nights", 400);
    }

    const resortSlug =
      typeof resort === "string" && ["elysian", "village"].includes(resort) ? resort : undefined;
    const checkOutStr = addCalendarDays(checkIn, nights);

    if (env.NEXT_PUBLIC_USE_MOCK_DATA) {
      return ok(res, {
        checkIn,
        checkOut: checkOutStr,
        nights,
        taxRate: 0.075,
        rooms: mockAvailability(nights, resortSlug),
      });
    }

    const supabase = getSupabaseAdminClient();
    try {
      const [rooms, taxRate] = await Promise.all([
        getStayAvailability(supabase, { checkIn, checkOut: checkOutStr, resort: resortSlug }),
        getTaxRate(supabase),
      ]);
      return ok(res, { checkIn, checkOut: checkOutStr, nights, taxRate, rooms });
    } catch (error) {
      logger.error("Availability lookup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return fail(
        res,
        "AVAILABILITY_UNAVAILABLE",
        "Live availability is temporarily unavailable. Please try again or contact us on WhatsApp.",
        503
      );
    }
  },
  {
    allowedMethods: ["GET"],
  }
);
