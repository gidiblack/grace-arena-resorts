import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import type { BookingPdfData } from "@/services/pdf/booking-pdf";
import type { DealRecord } from "@/services/pricing/pricing-engine";

type Db = SupabaseClient<Database>;
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export const DEFAULT_TAX_RATE = 0.075;

/**
 * VAT rate from system settings (SRS 3.14 "Tax Configuration"), falling back to 7.5%.
 */
export async function getTaxRate(supabase: Db): Promise<number> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "tax_rate")
    .maybeSingle();
  const parsed = Number(data?.value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed < 1 ? parsed : DEFAULT_TAX_RATE;
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Looks up an active deal by exact (case-insensitive) promo code or id, valid on `onDate`.
 * Promo codes are stored upper-case, so an exact match avoids ilike wildcard injection.
 */
export async function findValidDeal(
  supabase: Db,
  options: { promoCode?: string; dealId?: string; onDate: string }
): Promise<DealRecord | null> {
  if (!options.promoCode && !options.dealId) return null;

  let query = supabase
    .from("deals")
    .select("id, discount_type, discount_value, applicable_room_type_ids, start_date, end_date")
    .eq("is_active", true)
    .lte("start_date", options.onDate)
    .gte("end_date", options.onDate);

  query = options.promoCode
    ? query.eq("promo_code", normalizePromoCode(options.promoCode))
    : query.eq("id", options.dealId!);

  const { data: deal } = await query.maybeSingle();
  if (!deal) return null;

  return {
    id: deal.id,
    discountType: deal.discount_type,
    discountValue: deal.discount_value,
    applicableRoomTypeIds: Array.isArray(deal.applicable_room_type_ids)
      ? (deal.applicable_room_type_ids as string[])
      : [],
    startDate: deal.start_date,
    endDate: deal.end_date,
    isActive: true,
  };
}

/**
 * Builds the confirmation/receipt PDF payload from stored booking data, with real room names.
 */
export async function buildBookingPdfInput(
  supabase: Db,
  booking: BookingRow,
  statusLabel: string = booking.status.toUpperCase()
): Promise<BookingPdfData> {
  const [{ data: lineItems }, { data: payments }] = await Promise.all([
    supabase.from("booking_line_items").select("*").eq("booking_id", booking.id),
    supabase.from("payments").select("gateway, status").eq("booking_id", booking.id),
  ]);

  const roomTypeIds = (lineItems || []).map((li) => li.room_type_id);
  const { data: roomTypes } = roomTypeIds.length
    ? await supabase.from("room_types").select("id, name").in("id", roomTypeIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const roomNames = new Map((roomTypes || []).map((rt) => [rt.id, rt.name]));

  const settledPayment = (payments || []).find((p) =>
    ["success", "refund_pending", "refunded", "partially_refunded"].includes(p.status)
  );

  return {
    reference: booking.reference,
    status: statusLabel,
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    guestPhone: booking.guest_phone,
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    nights: booking.nights,
    rooms: (lineItems || []).map((li) => ({
      name: roomNames.get(li.room_type_id) || "Room",
      quantity: li.quantity,
      unitPrice: li.unit_price,
      lineTotal: li.line_total,
    })),
    subtotal: booking.subtotal,
    dealDiscount: booking.deal_discount,
    tax: booking.tax,
    total: booking.total,
    createdAt: booking.created_at,
    paymentGateway: settledPayment ? settledPayment.gateway.toUpperCase() : undefined,
  };
}
