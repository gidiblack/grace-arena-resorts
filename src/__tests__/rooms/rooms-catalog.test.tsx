import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import {
  parseRoomAmenities,
  RoomCard,
  RoomFilterBar,
  RoomType,
} from "@/features/rooms";
import { generateRoomsPageJsonLd } from "@/lib/seo/meta";

const mockActiveRoom: RoomType = {
  id: "elysian-fountain-standard",
  slug: "elysian-fountain-standard",
  name: "Standard Room",
  buildingId: "building-fountain-haven",
  buildingName: "The Fountain Haven",
  campus: "elysian",
  campusTitle: "GAR Elysian",
  tier: "Standard",
  tierColor: "#3B82F6",
  basePriceNgn: 60000,
  maxGuests: 2,
  image: "/assets/suite2.jpg",
  images: ["/assets/suite2.jpg"],
  isUnderConstruction: false,
  shortDesc: "Cozy refined room with comfortable king bed.",
  keyAmenities: ["King Bed", "Prayer Hut Access", "Free Wi-Fi"],
  amenities: {
    inRoom: ["King Bed", "Air Conditioner"],
    resort: ["The Prayer Hut", "Swimming Pool"],
  },
};

const mockUnderConstructionRoom: RoomType = {
  id: "village-presidential-hut",
  slug: "village-presidential-hut",
  name: "Presidential Thatched Hut",
  buildingId: "building-presidential-huts",
  buildingName: "Presidential Huts",
  campus: "village",
  campusTitle: "GAR Village",
  tier: "Presidential",
  tierColor: "#DC2626",
  basePriceNgn: null,
  maxGuests: null,
  image: "/assets/gar-village.jpg",
  images: ["/assets/gar-village.jpg"],
  isUnderConstruction: true,
  shortDesc: "Grand presidential pavilion featuring dual master bedrooms.",
  keyAmenities: ["Private Dipping Pool", "Prayer Hut Reservation", "Under Construction"],
  amenities: JSON.stringify({
    inRoom: ["Plunge pool", "Chef pantry"],
    resort: ["The Prayer Hut", "VIP Grounds"],
  }),
};

describe("Step 7 Rooms Catalog & Under-Construction Features", () => {
  describe("parseRoomAmenities Utility", () => {
    it("parses object amenity representation correctly", () => {
      const result = parseRoomAmenities({
        inRoom: ["Bed", "AC"],
        resort: ["Pool"],
      });
      expect(result.inRoom).toEqual(["Bed", "AC"]);
      expect(result.resort).toEqual(["Pool"]);
    });

    it("parses serialized JSON string amenity representation correctly", () => {
      const jsonStr = JSON.stringify({
        inRoom: ["Plunge pool", "Chef pantry"],
        resort: ["The Prayer Hut"],
      });
      const result = parseRoomAmenities(jsonStr);
      expect(result.inRoom).toEqual(["Plunge pool", "Chef pantry"]);
      expect(result.resort).toEqual(["The Prayer Hut"]);
    });

    it("handles invalid or null inputs gracefully", () => {
      expect(parseRoomAmenities(null)).toEqual({ inRoom: [], resort: [] });
      expect(parseRoomAmenities("invalid-json{")).toEqual({ inRoom: [], resort: [] });
    });
  });

  describe("generateRoomsPageJsonLd Structured Data", () => {
    it("excludes under-construction rooms from makesOffer structured data", () => {
      const jsonLd = generateRoomsPageJsonLd([mockActiveRoom, mockUnderConstructionRoom]);

      expect(jsonLd["@type"]).toBe("Hotel");
      expect(Array.isArray(jsonLd.makesOffer)).toBe(true);

      // Should only contain the active room, excluding the under-construction room
      expect(jsonLd.makesOffer.length).toBe(1);
      expect(jsonLd.makesOffer[0].name).toBe("Standard Room");
      expect(jsonLd.makesOffer[0].price).toBe(60000);

      const hasUnderConstructionOffer = jsonLd.makesOffer.some(
        (offer: { name: string }) => offer.name === "Presidential Thatched Hut"
      );
      expect(hasUnderConstructionOffer).toBe(false);
    });
  });

  describe("RoomCard Component", () => {
    it("renders available room with numeric price, guest capacity, and Book CTA", () => {
      const onOpenDetails = vi.fn();
      const onOpenNotify = vi.fn();

      renderWithChakra(
        <RoomCard
          room={mockActiveRoom}
          onOpenDetails={onOpenDetails}
          onOpenNotify={onOpenNotify}
        />
      );

      expect(screen.getByText("Standard Room")).toBeInTheDocument();
      expect(screen.getByText("₦60,000")).toBeInTheDocument();
      expect(screen.getByText("Up to 2 Guests")).toBeInTheDocument();
      expect(screen.getByText("Book This Room")).toBeInTheDocument();
    });

    it("renders under-construction room with Under Construction badge, Price TBD, and Notify Me CTA", () => {
      const onOpenDetails = vi.fn();
      const onOpenNotify = vi.fn();

      renderWithChakra(
        <RoomCard
          room={mockUnderConstructionRoom}
          onOpenDetails={onOpenDetails}
          onOpenNotify={onOpenNotify}
        />
      );

      expect(screen.getByText("Presidential Thatched Hut")).toBeInTheDocument();
      expect(screen.getByTestId("under-construction-badge")).toHaveTextContent("Under Construction");
      expect(screen.getByText("Price TBD")).toBeInTheDocument();

      const notifyButton = screen.getByTestId("notify-me-button");
      expect(notifyButton).toBeInTheDocument();
      fireEvent.click(notifyButton);
      expect(onOpenNotify).toHaveBeenCalledWith(mockUnderConstructionRoom);
    });
  });

  describe("RoomFilterBar Component", () => {
    it("renders campus tabs with full width support and invokes callback", () => {
      const onCampusChange = vi.fn();
      const onTierChange = vi.fn();

      renderWithChakra(
        <RoomFilterBar
          selectedCampus="all"
          onCampusChange={onCampusChange}
          selectedTier="all"
          onTierChange={onTierChange}
          totalRoomsCount={9}
          elysianCount={6}
          villageCount={3}
        />
      );

      expect(screen.getByText("All (9)")).toBeInTheDocument();
      expect(screen.getByText("Elysian (6)")).toBeInTheDocument();
      expect(screen.getByText("Village (3)")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Village (3)"));
      expect(onCampusChange).toHaveBeenCalledWith("village");
    });
  });
});
