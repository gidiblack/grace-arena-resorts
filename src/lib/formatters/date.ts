import dayjs from "dayjs";

/**
 * Date formatters for Grace Arena Resorts.
 * Date-only strings (YYYY-MM-DD) are parsed as calendar dates, so they never shift across timezones.
 */

type DateInput = string | number | Date | null | undefined;

export const LONG_DATE_FORMAT = "ddd, MMMM D, YYYY";
export const SHORT_DATE_FORMAT = "DD/MM/YYYY";
export const SHORT_DATE_TIME_FORMAT = "DD/MM/YYYY, HH:mm";

function formatWith(value: DateInput, pattern: string): string {
  if (value === null || value === undefined || value === "") return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(pattern) : String(value);
}

/**
 * Guest-facing full date.
 * @returns e.g. "Wed, October 21, 2026"
 */
export function formatLongDate(value: DateInput): string {
  return formatWith(value, LONG_DATE_FORMAT);
}

/**
 * Compact date for tables and secondary metadata.
 * @returns e.g. "21/10/2026"
 */
export function formatShortDate(value: DateInput): string {
  return formatWith(value, SHORT_DATE_FORMAT);
}

/**
 * Compact date with 24-hour time for audit timestamps.
 * @returns e.g. "21/10/2026, 14:05"
 */
export function formatShortDateTime(value: DateInput): string {
  return formatWith(value, SHORT_DATE_TIME_FORMAT);
}
