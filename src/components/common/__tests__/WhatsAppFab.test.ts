import { describe, it, expect } from "vitest";
import { getContextAwareWhatsAppMessage } from "../WhatsAppFab";

describe("getContextAwareWhatsAppMessage", () => {
  it("returns default message for home or general page", () => {
    const msg = getContextAwareWhatsAppMessage("/");
    expect(msg).toContain("inquire about booking a stay");
  });

  it("returns room-specific message when on rooms page", () => {
    const msg = getContextAwareWhatsAppMessage("/rooms");
    expect(msg).toContain("inquire about your available rooms");
  });

  it("returns query-targeted message when room query parameter is present", () => {
    const msg = getContextAwareWhatsAppMessage("/rooms", { room: "Presidential Hut" });
    expect(msg).toContain("reserving Presidential Hut");
  });

  it("returns events inquiry message when on events page", () => {
    const msg = getContextAwareWhatsAppMessage("/events");
    expect(msg).toContain("church retreat, conference, or event");
  });

  it("returns dining message when on restaurants page", () => {
    const msg = getContextAwareWhatsAppMessage("/restaurants");
    expect(msg).toContain("dining menus and restaurant reservations");
  });

  it("returns contact message when on contact page", () => {
    const msg = getContextAwareWhatsAppMessage("/contact");
    expect(msg).toContain("Concierge");
  });
});
