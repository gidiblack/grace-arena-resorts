import { z } from "zod";
import { withApi } from "@/pages/api/v1/_shared/handler";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { MOCK_DEALS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";
import { recordAuditLog } from "@/pages/api/v1/_shared/audit-log";
import { isValidCalendarDate } from "@/domain/booking/time";
import type { DealCategory, DiscountType } from "@/types/db";

const updateDealSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(5).optional(),
  discount_type: z.enum(["percentage", "fixed"]).optional(),
  discount_value: z.number().positive().optional(),
  promo_code: z.string().trim().min(2).max(30).optional().nullable(),
  start_date: z.string().refine(isValidCalendarDate, "Invalid start date").optional(),
  end_date: z.string().refine(isValidCalendarDate, "Invalid end date").optional(),
  is_active: z.boolean().optional(),
  category: z.enum(["room", "dining", "package", "seasonal"]).optional(),
  applicable_room_type_ids: z.array(z.string()).optional(),
  images: z.array(z.any()).optional(),
  terms: z.string().trim().max(2000).optional().nullable(),
});

export default withApi(
  async (req, res, ctx) => {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return fail(res, "BAD_REQUEST", "Deal ID is required", 400);
    }

    const supabase = getSupabaseAdminClient();

    // ==========================================
    // GET: Single deal
    // ==========================================
    if (req.method === "GET") {
      const { data: dbDeal } = await supabase
        .from("deals")
        .select("*")
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      if (dbDeal) {
        return ok(res, dbDeal);
      }

      const mockDeal = MOCK_DEALS.find((d) => d.id === id || d.slug === id);
      if (!mockDeal) {
        return fail(res, "NOT_FOUND", `Deal with identifier '${id}' not found`, 404);
      }

      return ok(res, mockDeal);
    }

    // ==========================================
    // PUT: Update deal (Content Manager+)
    // ==========================================
    if (req.method === "PUT") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["content_manager", "resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only content managers and administrators can edit deals", 403);
      }

      const updates = req.body as z.infer<typeof updateDealSchema>;

      const { data: existing, error: fetchErr } = await supabase
        .from("deals")
        .select("*")
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      if (fetchErr || !existing) {
        return fail(res, "NOT_FOUND", `Deal '${id}' not found`, 404);
      }

      const promoCode = updates.promo_code !== undefined
        ? (updates.promo_code ? updates.promo_code.toUpperCase().trim() : null)
        : existing.promo_code;

      if (promoCode && promoCode !== existing.promo_code) {
        const { data: existingCode } = await supabase
          .from("deals")
          .select("id")
          .eq("promo_code", promoCode)
          .neq("id", existing.id)
          .maybeSingle();

        if (existingCode) {
          return fail(res, "PROMO_CODE_EXISTS", `Promo code '${promoCode}' is already in use`, 409);
        }
      }

      const { data: updated, error: updateErr } = await supabase
        .from("deals")
        .update({
          ...(updates.title ? { title: updates.title } : {}),
          ...(updates.description ? { description: updates.description } : {}),
          ...(updates.discount_type ? { discount_type: updates.discount_type as DiscountType } : {}),
          ...(updates.discount_value !== undefined ? { discount_value: updates.discount_value } : {}),
          ...(updates.promo_code !== undefined ? { promo_code: promoCode } : {}),
          ...(updates.start_date ? { start_date: updates.start_date } : {}),
          ...(updates.end_date ? { end_date: updates.end_date } : {}),
          ...(updates.is_active !== undefined ? { is_active: updates.is_active } : {}),
          ...(updates.category ? { category: updates.category as DealCategory } : {}),
          ...(updates.applicable_room_type_ids ? { applicable_room_type_ids: updates.applicable_room_type_ids } : {}),
          ...(updates.images ? { images: updates.images } : {}),
          ...(updates.terms !== undefined ? { terms: updates.terms } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateErr || !updated) {
        return fail(res, "UPDATE_FAILED", "Failed to update deal", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "UPDATE_DEAL",
        entity: "deals",
        entityId: existing.id,
        previousData: existing,
        newData: updated,
        req,
      });

      return ok(res, updated);
    }

    // ==========================================
    // DELETE: Delete deal (Resort Admin+ only per SRS)
    // ==========================================
    if (req.method === "DELETE") {
      const user = ctx.user;
      if (!user) {
        return fail(res, "UNAUTHORIZED", "Authentication required", 401);
      }
      if (!["resort_admin", "super_admin"].includes(user.role)) {
        return fail(res, "FORBIDDEN", "Only resort administrators can delete deals", 403);
      }

      const { data: existing } = await supabase
        .from("deals")
        .select("id, title")
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      if (!existing) {
        return fail(res, "NOT_FOUND", `Deal '${id}' not found`, 404);
      }

      const { error: deleteErr } = await supabase
        .from("deals")
        .delete()
        .eq("id", existing.id);

      if (deleteErr) {
        return fail(res, "DELETE_FAILED", "Failed to delete deal", 500);
      }

      await recordAuditLog({
        userId: user.id,
        action: "DELETE_DEAL",
        entity: "deals",
        entityId: existing.id,
        previousData: existing,
        newData: null,
        req,
      });

      return ok(res, { message: `Deal '${existing.title}' has been deleted.` });
    }
  },
  {
    allowedMethods: ["GET", "PUT", "DELETE"],
    bodySchema: updateDealSchema,
  }
);
