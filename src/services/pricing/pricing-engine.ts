import { addCalendarDays, nightsBetween } from "@/domain/booking/time";

export interface RoomSelection {
  roomTypeId: string;
  quantity: number;
  basePrice?: number;
}

export interface SeasonalPriceRecord {
  roomTypeId: string;
  startDate: string;
  endDate: string;
  price: number;
  createdAt?: string;
}

export interface DealRecord {
  id: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  applicableRoomTypeIds?: string[];
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface NightRateBreakdown {
  date: string;
  rate: number;
  isSeasonal: boolean;
}

export interface RoomLineItemPricing {
  roomTypeId: string;
  quantity: number;
  nightlyRates: NightRateBreakdown[];
  lineSubtotal: number;
}

export interface BookingPricingQuote {
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  rooms: RoomLineItemPricing[];
  subtotal: number;
  dealDiscount: number;
  tax: number;
  total: number;
  taxRate: number;
}

/**
 * Calculates deterministic pricing per GAR-SRS Section 4.3:
 * - Nightly rate evaluated per date against seasonal price overrides (latest createdAt takes precedence), fallback to base price
 * - Subtotal = SUM(per_night_rate * quantity) across all nights & rooms
 * - Deal percentage discount: applied ONLY to subtotal of applicable room types
 * - Deal fixed discount: subtracted from full subtotal
 * - Tax = (subtotal - dealDiscount) * taxRate (default 7.5% VAT)
 * - Total = subtotal - dealDiscount + tax
 */
export function calculateBookingPricing({
  checkInDate,
  checkOutDate,
  selections,
  basePrices,
  seasonalPrices = [],
  deal,
  taxRate = 0.075,
}: {
  checkInDate: string;
  checkOutDate: string;
  selections: RoomSelection[];
  basePrices: Record<string, number>;
  seasonalPrices?: SeasonalPriceRecord[];
  deal?: DealRecord | null;
  taxRate?: number;
}): BookingPricingQuote {
  const nights = Math.max(1, nightsBetween(checkInDate, checkOutDate));

  // Calendar date of each night of the stay
  const nightDates: string[] = [];
  for (let i = 0; i < nights; i++) {
    nightDates.push(addCalendarDays(checkInDate, i));
  }

  const roomLineItems: RoomLineItemPricing[] = [];
  let subtotal = 0;
  let applicableSubtotalForDeal = 0;

  for (const sel of selections) {
    const qty = Math.max(1, sel.quantity);
    const roomBasePrice = basePrices[sel.roomTypeId] ?? sel.basePrice ?? 0;
    const nightlyRates: NightRateBreakdown[] = [];
    let roomTotalPerUnit = 0;

    for (const night of nightDates) {
      // Find matching seasonal prices for this room type and night
      const matching = seasonalPrices.filter(
        (sp) => sp.roomTypeId === sel.roomTypeId && night >= sp.startDate && night <= sp.endDate
      );

      let effectiveRate = roomBasePrice;
      let isSeasonal = false;

      if (matching.length > 0) {
        // Overlapping seasons: the most recently created override wins
        const chosen = pickLatestSeasonalPrice(matching);
        effectiveRate = chosen.price;
        isSeasonal = true;
      }

      nightlyRates.push({
        date: night,
        rate: effectiveRate,
        isSeasonal,
      });

      roomTotalPerUnit += effectiveRate;
    }

    const lineSubtotal = roomTotalPerUnit * qty;
    subtotal += lineSubtotal;

    // Check if this room type is covered by the promotional deal
    const isApplicableToDeal =
      !deal ||
      !deal.applicableRoomTypeIds ||
      deal.applicableRoomTypeIds.length === 0 ||
      deal.applicableRoomTypeIds.includes(sel.roomTypeId);

    if (isApplicableToDeal) {
      applicableSubtotalForDeal += lineSubtotal;
    }

    roomLineItems.push({
      roomTypeId: sel.roomTypeId,
      quantity: qty,
      nightlyRates,
      lineSubtotal,
    });
  }

  // Calculate Deal Discount
  let dealDiscount = 0;
  if (deal && deal.discountValue > 0) {
    if (deal.discountType === "percentage") {
      // Percentage discounts apply ONLY to subtotal of applicable room types
      const discountFraction = deal.discountValue / 100;
      dealDiscount = Math.round(applicableSubtotalForDeal * discountFraction);
    } else if (deal.discountType === "fixed") {
      // Fixed discounts subtract from the total booking subtotal
      dealDiscount = Math.min(subtotal, deal.discountValue);
    }
  }

  // Ensure discount does not exceed subtotal
  dealDiscount = Math.min(subtotal, Math.max(0, dealDiscount));

  // Tax calculation (7.5% on discounted subtotal per SRS)
  const taxableAmount = Math.max(0, subtotal - dealDiscount);
  const tax = Math.round(taxableAmount * taxRate);

  // Total
  const total = taxableAmount + tax;

  return {
    checkInDate,
    checkOutDate,
    nights,
    rooms: roomLineItems,
    subtotal,
    dealDiscount,
    tax,
    total,
    taxRate,
  };
}

/**
 * Picks the most recently created seasonal price; records without createdAt rank lowest.
 */
export function pickLatestSeasonalPrice<T extends { createdAt?: string | null }>(matching: T[]): T {
  return [...matching].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  )[0];
}
