export interface RoomAmenitiesJson {
  inRoom: string[];
  resort: string[];
}

export interface RoomType {
  id: string;
  slug: string;
  name: string;
  buildingId: string;
  buildingName: string;
  campus: "elysian" | "village";
  campusTitle: string;
  tier: "Standard" | "Deluxe" | "Premium" | "Executive" | "Presidential" | "Royal";
  tierColor: string;
  basePriceNgn: number | null;
  maxGuests: number | null;
  image: string;
  images: string[];
  isUnderConstruction: boolean;
  shortDesc: string;
  keyAmenities: string[];
  amenities: RoomAmenitiesJson | string;
}

export interface Building {
  id: string;
  name: string;
  campus: "elysian" | "village";
  campusTitle: string;
  description: string;
  totalRooms: number;
}

export interface NotifyMeRequest {
  email: string;
  roomTypeId?: string;
  roomTitle?: string;
  phone?: string;
}

export interface NotifyMeResponse {
  success: boolean;
  message: string;
  isDuplicate?: boolean;
}

/**
 * Parses RoomType.amenities which could be a raw JSON string or pre-parsed object.
 */
export function parseRoomAmenities(
  amenities: RoomAmenitiesJson | string | undefined | null
): RoomAmenitiesJson {
  if (!amenities) {
    return { inRoom: [], resort: [] };
  }
  if (typeof amenities === "string") {
    try {
      const parsed = JSON.parse(amenities);
      return {
        inRoom: Array.isArray(parsed?.inRoom) ? parsed.inRoom : [],
        resort: Array.isArray(parsed?.resort) ? parsed.resort : [],
      };
    } catch {
      return { inRoom: [], resort: [] };
    }
  }
  return {
    inRoom: Array.isArray(amenities.inRoom) ? amenities.inRoom : [],
    resort: Array.isArray(amenities.resort) ? amenities.resort : [],
  };
}
