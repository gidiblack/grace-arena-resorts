import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { PaystackError } from "./paystack";
import type { PaystackRefundOptions, PaystackRefundResponse } from "@/domain/payment/types";

const PAYSTACK_API_BASE = "https://api.paystack.co";

/**
 * Initiates a full or partial refund on Paystack for a completed transaction.
 * Aligned with GAR-SRS Section 4.3 refund automation and cancellation policies.
 */
export async function initiatePaystackRefund(
  options: PaystackRefundOptions
): Promise<PaystackRefundResponse> {
  const url = `${PAYSTACK_API_BASE}/refund`;

  const payload: Record<string, unknown> = {
    transaction: options.transactionReferenceOrId,
    currency: options.currency || "NGN",
    customer_note: options.customerNote || "Grace Arena Resorts booking cancellation/refund",
    merchant_note: options.merchantNote || "Automated reservation refund",
  };

  if (options.amountKobo !== undefined) {
    payload.amount = options.amountKobo;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      logger.error("Paystack refund initiation error", {
        transaction: options.transactionReferenceOrId,
        status: response.status,
        message: data.message,
      });
      throw new PaystackError(data.message || "Failed to initiate Paystack refund", response.status, data);
    }

    const refund = data.data;

    return {
      refundId: refund.id,
      status: refund.status,
      amountKobo: refund.amount,
      transactionReference: refund.transaction_reference || options.transactionReferenceOrId,
      deductedAmount: refund.deducted_amount,
    };
  } catch (error) {
    if (error instanceof PaystackError) throw error;
    logger.error("Paystack refund network exception", {
      transaction: options.transactionReferenceOrId,
      error,
    });
    throw new PaystackError("Network error while communicating refund to gateway");
  }
}
