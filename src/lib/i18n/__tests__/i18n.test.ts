import { describe, it, expect } from "vitest";
import { t } from "../index";

describe("i18n t helper", () => {
  it("resolves top-level and nested keys correctly", () => {
    expect(t("brand.name")).toBe("Grace Arena Resorts");
    expect(t("nav.rooms")).toBe("Rooms & Suites");
  });

  it("falls back to returning the key when key is not found", () => {
    expect(t("non.existent.key")).toBe("non.existent.key");
  });

  it("interpolates parameters in translation strings", () => {
    expect(t("notifyMe.modalDescription", { roomName: "Presidential Hut" })).toContain(
      "Presidential Hut"
    );
  });
});
