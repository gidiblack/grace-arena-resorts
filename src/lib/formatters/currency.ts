/**
 * Currency formatter for Grace Arena Resorts.
 * Formats values consistently in Nigerian Naira (NGN) with the official ₦ symbol.
 * Complies with SRS Section 5.6.
 */

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const nairaFormatterWithDecimals = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format an amount in NGN (Nigerian Naira).
 * @param amount - Numeric amount in Naira
 * @param options - Optional formatting configuration (showDecimals: boolean)
 * @returns Formatted currency string with ₦ symbol (e.g., "₦50,000" or "₦50,000.00")
 */
export function formatCurrency(
  amount: number | null | undefined,
  options?: { showDecimals?: boolean }
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "₦0";
  }

  // If amount has decimal parts or showDecimals is forced
  const hasDecimals = amount % 1 !== 0;
  if (options?.showDecimals || hasDecimals) {
    return nairaFormatterWithDecimals.format(amount);
  }

  return nairaFormatter.format(amount);
}
