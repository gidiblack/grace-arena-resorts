export interface PaystackInitializeOptions {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: "success" | "failed" | "abandoned";
  reference: string;
  amountKobo: number;
  currency: string;
  channel: string;
  paidAt: string | null;
  gatewayResponse: string;
  customer: {
    email: string;
  };
  metadata?: Record<string, unknown>;
}

export interface PaystackRefundOptions {
  transactionReferenceOrId: string;
  amountKobo?: number;
  currency?: string;
  customerNote?: string;
  merchantNote?: string;
}

export interface PaystackRefundResponse {
  refundId: number | string;
  status: string;
  amountKobo: number;
  transactionReference: string;
  deductedAmount?: number;
}

export interface PaystackWebhookPayload {
  event: "charge.success" | "refund.processed" | "refund.failed" | "refund.pending" | string;
  data: {
    id?: number;
    domain?: string;
    status: string;
    reference: string;
    amount: number; // in kobo
    message?: string | null;
    gateway_response?: string;
    paid_at?: string | null;
    created_at?: string;
    channel?: string;
    currency?: string;
    ip_address?: string;
    metadata?: Record<string, unknown>;
    customer?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      email: string;
      customer_code?: string;
      phone?: string;
    };
    transaction_reference?: string;
    refund?: {
      id: number;
      amount: number;
      status: string;
    };
  };
}

/**
 * Returns true if gateway downtime fallback is active.
 * When downtime fallback is active, inventory holds are extended from 30m to 120m (2 hours)
 * and WhatsApp manual reservation fallback is advertised per GAR-SRS Section 4.3.
 */
export function isGatewayDowntime(activeSettingValue?: string | null): boolean {
  if (!activeSettingValue) return false;
  return (
    activeSettingValue === "true" || activeSettingValue === "1" || activeSettingValue === "active"
  );
}

export const STANDARD_HOLD_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
export const DOWNTIME_HOLD_WINDOW_MS = 120 * 60 * 1000; // 2 hours (120 minutes)
