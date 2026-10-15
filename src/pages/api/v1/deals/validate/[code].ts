import { withApi } from "../../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { env } from "@/config/env";
import { MOCK_DEALS } from "@/data/mock/resort-data";
import { isValidCalendarDate, resortToday } from "@/domain/booking/time";
import { normalizePromoCode } from "@/services/booking/booking-data";

export default withApi(
  async (req, res) => {
    const { code, checkIn } = req.query;

    if (!code || typeof code !== "string" || code.length > 40) {
      return fail(res, "MISSING_PROMO_CODE", "Promo code is required", 400);
    }

    const normalizedCode = normalizePromoCode(code);
    // Deals are validated against the check-in date when known (same rule as booking creation)
    const onDate = isValidCalendarDate(checkIn) ? checkIn : resortToday();

    if (env.NEXT_PUBLIC_USE_MOCK_DATA) {
      const mock = MOCK_DEALS.find((d) => d.promoCode.toUpperCase() === normalizedCode);
      if (!mock || mock.validFrom > onDate || mock.validTo < onDate) {
        return fail(
          res,
          "INVALID_PROMO_CODE",
          "The promo code entered is invalid or has expired",
          404
        );
      }
      return ok(res, {
        id: mock.id,
        title: mock.title,
        code: mock.promoCode,
        discountType: mock.discountType,
        discountValue: mock.discountValue,
        applicableRoomTypeIds: mock.applicableRooms,
        terms: mock.terms,
      });
    }

    const { data: deal, error } = await getSupabaseAdminClient()
      .from("deals")
      .select(
        "id, title, slug, discount_type, discount_value, promo_code, applicable_room_type_ids, terms"
      )
      .eq("promo_code", normalizedCode)
      .eq("is_active", true)
      .lte("start_date", onDate)
      .gte("end_date", onDate)
      .maybeSingle();

    if (error) {
      return fail(res, "DEALS_UNAVAILABLE", "Unable to validate promo codes right now", 503);
    }

    if (!deal) {
      return fail(
        res,
        "INVALID_PROMO_CODE",
        "The promo code entered is invalid or has expired",
        404
      );
    }

    return ok(res, {
      id: deal.id,
      title: deal.title,
      code: deal.promo_code,
      discountType: deal.discount_type,
      discountValue: deal.discount_value,
      applicableRoomTypeIds: Array.isArray(deal.applicable_room_type_ids)
        ? (deal.applicable_room_type_ids as string[])
        : [],
      terms: deal.terms ? [deal.terms] : [],
    });
  },
  {
    allowedMethods: ["GET"],
    rateLimit: {
      keyPrefix: "deal-validate",
      maxRequests: 20,
      windowSeconds: 300,
    },
  }
);
