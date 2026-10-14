export type CancellationRefundTier = "full" | "half" | "none";

export interface RefundCalculationResult {
  refundAmount: number;
  refundPercentage: number;
  tier: CancellationRefundTier;
  hoursUntilCheckIn: number;
}

/**
 * Calculates refund amount and percentage according to GAR-SRS Section 4.3:
 * - >= 72h before check-in (14:00): 100% refund
 * - 24h to 72h before check-in (14:00): 50% refund
 * - < 24h before check-in (14:00): 0% refund
 */
export function calculateCancellationRefund(
  totalPaid: number,
  checkInDate: string | Date,
  cancellationDate: Date = new Date(),
  checkInHour = 14
): RefundCalculationResult {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(checkInHour, 0, 0, 0);

  const diffMs = checkIn.getTime() - cancellationDate.getTime();
  const hoursUntilCheckIn = diffMs / (1000 * 60 * 60);

  if (hoursUntilCheckIn >= 72) {
    return {
      refundAmount: totalPaid,
      refundPercentage: 1.0,
      tier: "full",
      hoursUntilCheckIn,
    };
  }

  if (hoursUntilCheckIn >= 24) {
    const halfAmount = Math.floor(totalPaid * 0.5);
    return {
      refundAmount: halfAmount,
      refundPercentage: 0.5,
      tier: "half",
      hoursUntilCheckIn,
    };
  }

  return {
    refundAmount: 0,
    refundPercentage: 0,
    tier: "none",
    hoursUntilCheckIn,
  };
}
