import { withApi } from "../../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";

export default withApi(
  async (req, res) => {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      return fail(res, "MISSING_PROMO_CODE", "Promo code is required", 400);
    }

    const normalizedCode = code.toUpperCase().trim();
    const supabase = getSupabaseAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: deal, error } = await supabase
      .from("deals")
      .select("id, title, slug, description, discount_type, discount_value, promo_code, start_date, end_date, is_active, applicable_room_type_ids, terms")
      .ilike("promo_code", normalizedCode)
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .maybeSingle();

    if (error || !deal) {
      return fail(res, "INVALID_PROMO_CODE", "The promo code entered is invalid or has expired", 404);
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
