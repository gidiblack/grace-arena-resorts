/**
 * "Refunds to process" (SRS 3.14.4): refunds staff must act on by hand.
 * Paystack refunds in flight are excluded: the gateway completes them and the webhook updates status.
 */
export const MANUAL_REFUND_METHODS = ["bank_transfer", "cash", "pos_reversal"] as const;

/** PostgREST `or()` expression selecting payments in the refund queue. */
export const REFUND_QUEUE_FILTER = `status.eq.refund_failed,and(status.eq.refund_pending,refund_method.in.(${MANUAL_REFUND_METHODS.join(",")}))`;

export function isInRefundQueue(payment: {
  status?: string | null;
  refund_method?: string | null;
}): boolean {
  if (payment.status === "refund_failed") return true;
  return (
    payment.status === "refund_pending" &&
    (MANUAL_REFUND_METHODS as readonly string[]).includes(payment.refund_method ?? "")
  );
}
