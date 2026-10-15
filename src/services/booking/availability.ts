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

interface RoomTypeWithResort {
  id: string;
  slug: string;
  name: string;
  tier: string;
  base_price: number;
  max_guests: number;
  total_units: number;
  status: string;
  images: unknown;
  buildings: { name: string; resorts: { slug: string; name: string } };
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

export async function getStayAvailability(
  supabase: Db,
  options: { checkIn: string; checkOut: string; resort?: string }
): Promise<StayAvailabilityRoom[]> {
  let roomQuery = supabase
    .from("room_types")
    .select(
      "id, slug, name, tier, base_price, max_guests, total_units, status, images, buildings!inner(name, resorts!inner(slug, name))"
    )
    .order("base_price", { ascending: true });

  if (options.resort) {
    roomQuery = roomQuery.eq("buildings.resorts.slug", options.resort);
  }

  const { data: roomData, error: roomError } = await roomQuery;
  if (roomError) throw new Error(`Failed to load room types: ${roomError.message}`);
  const roomTypes = (roomData || []) as unknown as RoomTypeWithResort[];
  if (roomTypes.length === 0) return [];

  const roomTypeIds = roomTypes.map((rt) => rt.id);
  const blockingIds = await getBlockingBookingIds(supabase, options.checkIn, options.checkOut);

  const [lineItemsRes, maintenanceRes, seasonalRes] = await Promise.all([
    blockingIds.length
      ? supabase
          .from("booking_line_items")
          .select("room_type_id, quantity")
          .in("booking_id", blockingIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("rooms").select("room_type_id").eq("status", "maintenance"),
    supabase
      .from("seasonal_prices")
      .select("room_type_id, start_date, end_date, price, created_at")
      .in("room_type_id", roomTypeIds)
      .lte("start_date", options.checkOut)
      .gte("end_date", options.checkIn),
  ]);

  for (const r of [lineItemsRes, maintenanceRes, seasonalRes]) {
    if (r.error) throw new Error(`Failed to load availability data: ${r.error.message}`);
  }

  const booked: Record<string, number> = {};
  for (const item of lineItemsRes.data || []) {
    booked[item.room_type_id] = (booked[item.room_type_id] || 0) + item.quantity;
  }
  const maintenance: Record<string, number> = {};
  for (const r of maintenanceRes.data || []) {
    maintenance[r.room_type_id] = (maintenance[r.room_type_id] || 0) + 1;
  }
  const seasonalPrices = (seasonalRes.data || []).map((sp) => ({
    roomTypeId: sp.room_type_id,
    startDate: sp.start_date,
    endDate: sp.end_date,
    price: sp.price,
    createdAt: sp.created_at,
  }));

  return roomTypes.map((rt) => {
    const quote = calculateBookingPricing({
      checkInDate: options.checkIn,
      checkOutDate: options.checkOut,
      selections: [{ roomTypeId: rt.id, quantity: 1 }],
      basePrices: { [rt.id]: rt.base_price },
      seasonalPrices,
      taxRate: 0,
    });
    const isUnderConstruction = rt.status === "under_construction";
    const availableUnits = isUnderConstruction
      ? 0
      : Math.max(0, rt.total_units - (booked[rt.id] || 0) - (maintenance[rt.id] || 0));

    return {
      id: rt.id,
      slug: rt.slug,
      name: rt.name,
      tier: rt.tier,
      campus: rt.buildings.resorts.slug,
      campusTitle: rt.buildings.resorts.name,
      buildingName: rt.buildings.name,
      maxGuests: rt.max_guests,
      totalUnits: rt.total_units,
      availableUnits,
      isAvailable: availableUnits > 0,
      status: rt.status,
      basePrice: rt.base_price,
      stayPrice: quote.subtotal,
      averageNightlyRate: Math.round(quote.subtotal / quote.nights),
      images: Array.isArray(rt.images) ? (rt.images as string[]) : [],
    };
  });
}
