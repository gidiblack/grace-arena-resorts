import { describe, it, expect } from "vitest";
import { formatLongDate, formatShortDate, formatShortDateTime } from "../date";

describe("formatLongDate", () => {
  it("formats date-only strings as a readable full date", () => {
    expect(formatLongDate("2026-10-21")).toBe("Wed, October 21, 2026");
  });

  it("formats Date objects", () => {
    expect(formatLongDate(new Date(2026, 0, 5))).toBe("Mon, January 5, 2026");
  });

  it("returns an empty string for missing values", () => {
    expect(formatLongDate(null)).toBe("");
    expect(formatLongDate(undefined)).toBe("");
    expect(formatLongDate("")).toBe("");
  });

  it("returns invalid input unchanged", () => {
    expect(formatLongDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatShortDate", () => {
  it("formats as DD/MM/YYYY", () => {
    expect(formatShortDate("2026-10-21")).toBe("21/10/2026");
    expect(formatShortDate(new Date(2026, 2, 7))).toBe("07/03/2026");
  });
});

describe("formatShortDateTime", () => {
  it("formats as DD/MM/YYYY, HH:mm", () => {
    expect(formatShortDateTime(new Date(2026, 9, 21, 14, 5))).toBe("21/10/2026, 14:05");
  });
});
