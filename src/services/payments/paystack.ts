import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import type {
  PaystackInitializeOptions,
  PaystackInitializeResponse,
  PaystackVerifyResponse,
} from "@/domain/payment/types";

const PAYSTACK_API_BASE = "https://api.paystack.co";

export class PaystackError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseData?: unknown
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

/**
 * Initializes a transaction on Paystack.
 */
export async function initializePayment(
  options: PaystackInitializeOptions
): Promise<PaystackInitializeResponse> {
  const url = `${PAYSTACK_API_BASE}/transaction/initialize`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: options.email,
        amount: options.amountKobo,
        reference: options.reference,
        callback_url: options.callbackUrl,
        metadata: options.metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      logger.error("Paystack initialize error", {
        status: response.status,
        message: data.message,
      });
      throw new PaystackError(
        data.message || "Failed to initialize Paystack payment",
        response.status,
        data
      );
    }

    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  } catch (error) {
    if (error instanceof PaystackError) throw error;
    logger.error("Paystack initialize network exception", { error });
    throw new PaystackError("Network error while connecting to payment gateway");
  }
}

/**
 * Verifies a transaction on Paystack by its reference.
 */
export async function verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
  const url = `${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      logger.error("Paystack verification error", {
        reference,
        status: response.status,
        message: data.message,
      });
      throw new PaystackError(
        data.message || "Failed to verify Paystack payment",
        response.status,
        data
      );
    }

    const tx = data.data;

    let normalizedStatus: "success" | "failed" | "abandoned" = "failed";
    if (tx.status === "success") {
      normalizedStatus = "success";
    } else if (tx.status === "abandoned") {
      normalizedStatus = "abandoned";
    }

    return {
      status: normalizedStatus,
      reference: tx.reference,
      amountKobo: tx.amount,
      currency: tx.currency,
      channel: tx.channel,
      paidAt: tx.paid_at || null,
      gatewayResponse: tx.gateway_response || "",
      customer: {
        email: tx.customer?.email || "",
      },
      metadata: tx.metadata,
    };
  } catch (error) {
    if (error instanceof PaystackError) throw error;
    logger.error("Paystack verify network exception", { reference, error });
    throw new PaystackError("Network error while verifying payment with gateway");
  }
}
