import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";
import { calculateBookingPricing } from "@/services/pricing/pricing-engine";

type Db = SupabaseClient<Database>;

export interface StayAvailabilityRoom {
  id: string;
  slug: string;
  name: string;
  tier: string;
  campus: string;
  campusTitle: string;
  buildingName: string;
  maxGuests: number;
  totalUnits: number;
  availableUnits: number;
  isAvailable: boolean;
  status: string;
  basePrice: number;
  /** Seasonal-aware room price for the whole stay, per unit, before deals and tax */
  stayPrice: number;
  averageNightlyRate: number;
  images: string[];
}

/**
 * Booking ids whose inventory is currently held for [checkIn, checkOut):
 * confirmed/checked-in stays plus pending bookings whose hold has not expired.
 */
export async function getBlockingBookingIds(
  supabase: Db,
  checkIn: string,
  checkOut: string
): Promise<string[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .lt("check_in_date", checkOut)
    .gt("check_out_date", checkIn)
    .or(`status.in.(confirmed,checked_in),and(status.eq.pending,hold_expires_at.gt.${nowIso})`);
  if (error) throw new Error(`Failed to load overlapping bookings: ${error.message}`);
  return (data || []).map((b) => b.id);
}

/**
 * Per-room-type availability and seasonal-aware stay prices for [checkIn, checkOut), from a
 * single database round-trip (get_stay_availability: live holds and maintenance included).
 */
export async function getStayAvailability(
  supabase: Db,
  options: { checkIn: string; checkOut: string; resort?: string }
): Promise<StayAvailabilityRoom[]> {
  const { data, error } = await supabase.rpc("get_stay_availability", {
    p_check_in: options.checkIn,
    p_check_out: options.checkOut,
    p_resort: options.resort ?? null,
  });
  if (error) throw new Error(`Failed to load availability: ${error.message}`);

  return (data || []).map((rt) => {
    const seasonal = Array.isArray(rt.seasonal_prices)
      ? (rt.seasonal_prices as Array<{
          start_date: string;
          end_date: string;
          price: number;
          created_at: string;
        }>)
      : [];
    const quote = calculateBookingPricing({
      checkInDate: options.checkIn,
      checkOutDate: options.checkOut,
      selections: [{ roomTypeId: rt.id, quantity: 1 }],
      basePrices: { [rt.id]: rt.base_price },
      seasonalPrices: seasonal.map((sp) => ({
        roomTypeId: rt.id,
        startDate: sp.start_date,
        endDate: sp.end_date,
        price: sp.price,
        createdAt: sp.created_at,
      })),
      taxRate: 0,
    });

    return {
      id: rt.id,
      slug: rt.slug,
      name: rt.name,
      tier: rt.tier,
      campus: rt.resort_slug,
      campusTitle: rt.resort_name,
      buildingName: rt.building_name,
      maxGuests: rt.max_guests,
      totalUnits: rt.total_units,
      availableUnits: rt.available_units,
      isAvailable: rt.available_units > 0,
      status: rt.status,
      basePrice: rt.base_price,
      stayPrice: quote.subtotal,
      averageNightlyRate: Math.round(quote.subtotal / quote.nights),
      images: Array.isArray(rt.images) ? (rt.images as string[]) : [],
    };
  });
}
