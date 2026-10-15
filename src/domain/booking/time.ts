/**
 * Resort-local time helpers. Both campuses are in Nigeria (West Africa Time, UTC+1,
 * no daylight saving), so a fixed offset is exact. Server code must never rely on the
 * host's local timezone: Vercel functions run in UTC.
 */
export const RESORT_UTC_OFFSET_HOURS = 1;
export const DEFAULT_CHECK_IN_HOUR = 14;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a YYYY-MM-DD calendar date (or a Date/ISO string, using its UTC calendar date).
 */
function toCalendarParts(date: string | Date): [number, number, number] {
  if (typeof date === "string") {
    const match = DATE_ONLY.exec(date.slice(0, 10));
    if (match) return [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const d = new Date(date);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
}

/**
 * The instant at which `hour`:00 resort time occurs on the given calendar date.
 */
export function resortDateTime(date: string | Date, hour = DEFAULT_CHECK_IN_HOUR): Date {
  const [y, m, d] = toCalendarParts(date);
  return new Date(Date.UTC(y, m - 1, d, hour - RESORT_UTC_OFFSET_HOURS, 0, 0, 0));
}

/**
 * Today's calendar date at the resort, as YYYY-MM-DD.
 */
export function resortToday(now: Date = new Date()): string {
  return new Date(now.getTime() + RESORT_UTC_OFFSET_HOURS * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Adds whole days to a YYYY-MM-DD date, returning YYYY-MM-DD (timezone-independent).
 */
export function addCalendarDays(date: string, days: number): string {
  const [y, m, d] = toCalendarParts(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Whole nights between two YYYY-MM-DD dates.
 */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = toCalendarParts(checkIn);
  const [y2, m2, d2] = toCalendarParts(checkOut);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return false;
  const [y, m, d] = toCalendarParts(value);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d
  );
}
