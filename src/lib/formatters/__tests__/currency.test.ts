import { describe, it, expect } from "vitest";
import { formatCurrency } from "../currency";

describe("formatCurrency", () => {
  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("₦0");
  });

  it("handles null and undefined gracefully", () => {
    expect(formatCurrency(null)).toBe("₦0");
    expect(formatCurrency(undefined)).toBe("₦0");
    expect(formatCurrency(NaN)).toBe("₦0");
  });

  it("formats integer amounts without decimals by default", () => {
    const formatted = formatCurrency(50000);
    // Standard NGN format includes ₦ and thousands separators
    expect(formatted).toContain("₦");
    expect(formatted).toContain("50,000");
  });

  it("formats large numbers correctly", () => {
    const formatted = formatCurrency(1500000);
    expect(formatted).toContain("1,500,000");
  });

  it("formats decimal amounts when showDecimals is forced or decimals exist", () => {
    const formatted = formatCurrency(12500.5, { showDecimals: true });
    expect(formatted).toContain("12,500.50");
  });
});
