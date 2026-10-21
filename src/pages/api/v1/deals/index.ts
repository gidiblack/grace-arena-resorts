import { z } from "zod";
import { withApi } from "../_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_DEALS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { isValidCalendarDate } from "@/domain/booking/time";
import type { DealCategory, DiscountType } from "@/types/db";

const createDealSchema = z.object({
  title: z.string().trim().min(2, "Deal title is required").max(120),
  slug: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(5),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().positive("Discount value must be greater than 0"),
  promo_code: z.string().trim().min(2).max(30).optional().nullable(),
  start_date: z.string().refine(isValidCalendarDate, "Invalid start date (YYYY-MM-DD)"),
  end_date: z.string().refine(isValidCalendarDate, "Invalid end date (YYYY-MM-DD)"),
  is_active: z.boolean().default(true),
  category: z.enum(["room", "dining", "package", "seasonal"]).default("room"),
  applicable_room_type_ids: z.array(z.string()).default([]),
  images: z.array(z.any()).default([]),
  terms: z.string().trim().max(2000).optional().nullable(),
});

export default withApi(
  async (req, res, ctx) => {
    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: List deals
    // ==========================================
    if (req.method === "GET") {
      const { data: dbDeals } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbDeals && dbDeals.length > 0) {
        return ok(res, dbDeals, 200, { total: dbDeals.length });
      }

      return ok(res, MOCK_DEALS, 200, { total: MOCK_DEALS.length });
    }

    // ==========================================
    // POST: Create deal (Content Manager+)
    // ==========================================
    if (req.method === "POST") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only content managers and administrators can create deals", 403);
      }

      const body = req.body as z.infer<typeof createDealSchema>;

      if (body.start_date > body.end_date) {
        return fail(res, "INVALID_DATE_RANGE", "End date must be after or equal to start date", 400);
      }

      if (body.discount_type === "percentage" && body.discount_value > 100) {
        return fail(res, "INVALID_DISCOUNT", "Percentage discount cannot exceed 100%", 400);
      }

      const promoCode = body.promo_code ? body.promo_code.toUpperCase().trim() : null;

      if (promoCode) {
        const { data: existingCode } = await supabase
          .from("deals")
          .select("id")
          .eq("promo_code", promoCode)
          .maybeSingle();

        if (existingCode) {
          return fail(res, "PROMO_CODE_EXISTS", `Promo code '${promoCode}' is already in use`, 409);
        }
      }

      const slug =
        body.slug ||
        body.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const { data: newDeal, error: insertErr } = await supabase
        .from("deals")
        .insert({
          title: body.title,
          slug,
          description: body.description,
          discount_type: body.discount_type as DiscountType,
          discount_value: body.discount_value,
          promo_code: promoCode,
          start_date: body.start_date,
          end_date: body.end_date,
          is_active: body.is_active,
          category: body.category as DealCategory,
          applicable_room_type_ids: body.applicable_room_type_ids,
          images: body.images,
          terms: body.terms || null,
        })
        .select()
        .single();

      if (insertErr || !newDeal) {
        return fail(res, "CREATE_FAILED", insertErr?.message || "Failed to create deal", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "CREATE_DEAL",
        entity: "deals",
        entityId: newDeal.id,
        previousData: null,
        newData: newDeal,
        req,
      });

      return ok(res, newDeal, 201);
    }
  },
  {
    allowedMethods: ["GET", "POST"],
    bodySchema: createDealSchema,
  }
);
