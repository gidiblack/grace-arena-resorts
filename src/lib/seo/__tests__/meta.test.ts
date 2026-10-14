import { describe, it, expect } from "vitest";
import { getMetaTags, generateHotelJsonLd, DEFAULT_SITE_TITLE } from "../meta";

describe("SEO meta utilities", () => {
  it("generates default meta tags when no overrides are given", () => {
    const meta = getMetaTags();
    expect(meta.title).toBe(DEFAULT_SITE_TITLE);
    expect(meta.description).toContain("Grace Arena Resorts");
    expect(meta.noIndex).toBe(false);
  });

  it("appends brand name when specific page title is provided", () => {
    const meta = getMetaTags({ title: "Rooms & Thatched Huts" });
    expect(meta.title).toBe("Rooms & Thatched Huts | Grace Arena Resorts");
  });

  it("generates Schema.org Hotel JSON-LD with essential amenities", () => {
    const jsonLd = generateHotelJsonLd();
    expect(jsonLd["@type"]).toBe("Hotel");
    expect(jsonLd.name).toBe("Grace Arena Resorts");
    expect(jsonLd.address.addressCountry).toBe("NG");
    expect(jsonLd.amenityFeature.some((f) => f.name === "Prayer Hut")).toBe(true);
  });
});
