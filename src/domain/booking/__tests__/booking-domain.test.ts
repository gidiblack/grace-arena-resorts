import { describe, it, expect } from "vitest";
import { canTransition, assertTransition, canMarkNoShow } from "../state-machine";
import { calculateCancellationRefund } from "../cancellation";
import { generateBookingReference } from "../reference";
import { calculateBookingPricing } from "@/services/pricing/pricing-engine";

describe("Step 8: Booking Engine Domain & Pricing Engine", () => {
  describe("State Machine Transitions", () => {
    it("permits standard lifecycle: pending -> confirmed -> checked_in -> checked_out", () => {
      expect(canTransition("pending", "confirmed")).toBe(true);
      expect(canTransition("confirmed", "checked_in")).toBe(true);
      expect(canTransition("checked_in", "checked_out")).toBe(true);
    });

    it("permits cancellation from pending and confirmed", () => {
      expect(canTransition("pending", "cancelled")).toBe(true);
      expect(canTransition("confirmed", "cancelled")).toBe(true);
    });

    it("permits no_show transition from confirmed", () => {
      expect(canTransition("confirmed", "no_show")).toBe(true);
    });

    it("rejects invalid transitions and throws assertTransition", () => {
      expect(canTransition("pending", "checked_in")).toBe(false);
      expect(canTransition("checked_out", "confirmed")).toBe(false);
      expect(canTransition("cancelled", "confirmed")).toBe(false);

      expect(() => assertTransition("cancelled", "confirmed")).toThrow(
        "Invalid booking transition"
      );
    });

    it("enforces no-show 24-hour guard based on 14:00 check-in time", () => {
      const checkInDate = "2026-06-01"; // Check-in is 2026-06-01 14:00

      // Before check-in: not allowed
      const beforeCheckIn = new Date("2026-06-01T12:00:00Z");
      expect(canMarkNoShow(beforeCheckIn, checkInDate)).toBe(false);

      // 10 hours after check-in (2026-06-02 00:00): not allowed
      const tenHoursAfter = new Date("2026-06-02T00:00:00+01:00");
      expect(canMarkNoShow(tenHoursAfter, checkInDate)).toBe(false);

      // 23 hours after check-in (2026-06-02 13:00): not allowed
      const twentyThreeHoursAfter = new Date("2026-06-02T13:00:00+01:00");
      expect(canMarkNoShow(twentyThreeHoursAfter, checkInDate)).toBe(false);

      // Exactly 24 hours after check-in (2026-06-02 14:00): allowed
      const twentyFourHoursAfter = new Date("2026-06-02T14:00:00+01:00");
      expect(canMarkNoShow(twentyFourHoursAfter, checkInDate)).toBe(true);

      // 48 hours after: allowed
      const fortyEightHoursAfter = new Date("2026-06-03T14:00:00+01:00");
      expect(canMarkNoShow(fortyEightHoursAfter, checkInDate)).toBe(true);
    });
  });

  describe("Cancellation & Refund Rules", () => {
    const totalPaid = 100000;
    const checkInDate = "2026-06-10"; // 14:00

    it("gives 100% full refund when cancelled >= 72 hours before check-in", () => {
      const cancellationDate = new Date("2026-06-07T13:00:00+01:00"); // 73 hours prior
      const result = calculateCancellationRefund(totalPaid, checkInDate, cancellationDate);

      expect(result.tier).toBe("full");
      expect(result.refundPercentage).toBe(1.0);
      expect(result.refundAmount).toBe(100000);
    });

    it("gives 50% half refund when cancelled between 24 and 72 hours before check-in", () => {
      const cancellationDate = new Date("2026-06-08T15:00:00+01:00"); // 47 hours prior
      const result = calculateCancellationRefund(totalPaid, checkInDate, cancellationDate);

      expect(result.tier).toBe("half");
      expect(result.refundPercentage).toBe(0.5);
      expect(result.refundAmount).toBe(50000);
    });

    it("gives 0% no refund when cancelled < 24 hours before check-in", () => {
      const cancellationDate = new Date("2026-06-09T18:00:00+01:00"); // 20 hours prior
      const result = calculateCancellationRefund(totalPaid, checkInDate, cancellationDate);

      expect(result.tier).toBe("none");
      expect(result.refundPercentage).toBe(0);
      expect(result.refundAmount).toBe(0);
    });
  });

  describe("Booking Reference Generator", () => {
    it("generates 8-character uppercase alphanumeric reference prefixed with GAR-", () => {
      const ref = generateBookingReference();
      expect(ref).toMatch(/^GAR-[A-Z0-9]{8}$/);
    });

    it("generates distinct references on successive calls", () => {
      const ref1 = generateBookingReference();
      const ref2 = generateBookingReference();
      expect(ref1).not.toBe(ref2);
    });
  });

  describe("Pricing Engine Calculations", () => {
    it("calculates multi-room multi-night stays with VAT accurately", () => {
      const quote = calculateBookingPricing({
        checkInDate: "2026-05-01",
        checkOutDate: "2026-05-03", // 2 nights
        selections: [
          { roomTypeId: "room-a", quantity: 1 }, // 50,000 * 2 = 100,000
          { roomTypeId: "room-b", quantity: 2 }, // (80,000 * 2) * 2 = 320,000
        ],
        basePrices: {
          "room-a": 50000,
          "room-b": 80000,
        },
        taxRate: 0.075,
      });

      expect(quote.nights).toBe(2);
      expect(quote.subtotal).toBe(420000);
      expect(quote.dealDiscount).toBe(0);
      expect(quote.tax).toBe(31500); // 420000 * 0.075
      expect(quote.total).toBe(451500);
    });

    it("applies seasonal price overrides on matching dates", () => {
      const quote = calculateBookingPricing({
        checkInDate: "2026-12-24",
        checkOutDate: "2026-12-26", // 2 nights: Dec 24 and Dec 25
        selections: [{ roomTypeId: "room-suite", quantity: 1 }],
        basePrices: { "room-suite": 60000 },
        seasonalPrices: [
          {
            roomTypeId: "room-suite",
            startDate: "2026-12-24",
            endDate: "2026-12-25", // Overrides both nights to 90,000
            price: 90000,
          },
        ],
        taxRate: 0.075,
      });

      expect(quote.subtotal).toBe(180000); // 90,000 + 90,000
      expect(quote.tax).toBe(13500);
      expect(quote.total).toBe(193500);
    });

    it("applies percentage deal discount ONLY to applicable room types", () => {
      const quote = calculateBookingPricing({
        checkInDate: "2026-05-10",
        checkOutDate: "2026-05-11", // 1 night
        selections: [
          { roomTypeId: "room-applicable", quantity: 1 }, // 100,000
          { roomTypeId: "room-excluded", quantity: 1 }, // 200,000
        ],
        basePrices: {
          "room-applicable": 100000,
          "room-excluded": 200000,
        },
        deal: {
          id: "deal-10pct",
          discountType: "percentage",
          discountValue: 10,
          applicableRoomTypeIds: ["room-applicable"], // Only applies to room-applicable
        },
        taxRate: 0.075,
      });

      expect(quote.subtotal).toBe(300000);
      expect(quote.dealDiscount).toBe(10000); // 10% of 100,000, NOT 300,000
      const discountedSubtotal = 290000;
      expect(quote.subtotal - quote.dealDiscount).toBe(discountedSubtotal);
      expect(quote.tax).toBe(21750); // 290,000 * 0.075
      expect(quote.total).toBe(311750);
    });

    it("applies fixed deal discount to the entire subtotal", () => {
      const quote = calculateBookingPricing({
        checkInDate: "2026-05-10",
        checkOutDate: "2026-05-11",
        selections: [{ roomTypeId: "room-1", quantity: 1 }],
        basePrices: { "room-1": 80000 },
        deal: {
          id: "deal-fixed",
          discountType: "fixed",
          discountValue: 5000,
        },
        taxRate: 0.075,
      });

      expect(quote.subtotal).toBe(80000);
      expect(quote.dealDiscount).toBe(5000);
      expect(quote.tax).toBe(5625); // (80000 - 5000) * 0.075
      expect(quote.total).toBe(80625);
    });
  });
});
