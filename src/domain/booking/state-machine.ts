import type { BookingStatus } from "@/types/db";

export { BookingStatus };

/**
 * Valid state transitions per GAR-SRS Section 4.3:
 * Pending -> Confirmed -> Checked-In -> Checked-Out
 * Pending -> Cancelled
 * Confirmed -> Cancelled
 * Confirmed -> No-Show
 */
const transitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

/**
 * Evaluates whether transitioning from a given status to a new status is allowed.
 */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

/**
 * Throws an informative error if a transition is unauthorized by business logic.
 */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid booking transition: cannot transition from '${from}' to '${to}'`);
  }
}

/**
 * No-show policy guard:
 * Admin can mark a booking as No-Show only starting 24 hours after the scheduled check-in time (14:00 on check-in date).
 */
export function canMarkNoShow(
  now: Date = new Date(),
  checkInDate: string | Date,
  checkInHour = 14
): boolean {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(checkInHour, 0, 0, 0);
  const threshold = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
  return now >= threshold;
}
