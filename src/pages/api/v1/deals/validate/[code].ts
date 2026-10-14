import { withApi } from "../../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { MOCK_DEALS } from "@/data/mock/resort-data";

export default withApi(
  async (req, res) => {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return fail(res, "MISSING_PROMO_CODE", "Promo code is required", 400);
    }

    const normalizedCode = code.toUpperCase().trim();
    const supabase = getSupabaseAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    let deal: {
      id: string;
      title: string;
      slug: string;
      promo_code: string;
      discount_type: "percentage" | "fixed";
      discount_value: number;
      applicable_room_type_ids: string[];
      terms: string[];
    } | null = null;

    try {
      const { data, error } = await supabase
        .from("deals")
        .select(
          "id, title, slug, description, discount_type, discount_value, promo_code, start_date, end_date, is_active, applicable_room_type_ids, terms"
        )
        .ilike("promo_code", normalizedCode)
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .maybeSingle();

      if (!error && data) {
        deal = {
          id: data.id,
          title: data.title,
          slug: data.slug,
          promo_code: data.promo_code || normalizedCode,
          discount_type: data.discount_type as "percentage" | "fixed",
          discount_value: data.discount_value,
          applicable_room_type_ids: Array.isArray(data.applicable_room_type_ids)
            ? (data.applicable_room_type_ids as unknown as string[])
            : [],
          terms: data.terms ? [data.terms] : [],
        };
      }
    } catch {
      // Fallback below
    }

    if (!deal) {
      const mock = MOCK_DEALS.find((d) => d.promoCode.toUpperCase() === normalizedCode);
      if (mock && mock.validFrom <= today && mock.validTo >= today) {
        deal = {
          id: mock.id,
          title: mock.title,
          slug: mock.slug,
          promo_code: mock.promoCode,
          discount_type: mock.discountType,
          discount_value: mock.discountValue,
          applicable_room_type_ids: mock.applicableRooms,
          terms: mock.terms,
        };
      }
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
      slug: deal.slug,
      promoCode: deal.promo_code,
      discountType: deal.discount_type,
      discountValue: deal.discount_value,
      applicableRoomTypeIds: deal.applicable_room_type_ids,
      terms: deal.terms,
    });
  },
  {
    allowedMethods: ["GET"],
  }
);
