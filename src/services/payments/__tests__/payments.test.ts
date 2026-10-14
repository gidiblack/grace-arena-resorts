import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { isValidPaystackSignature } from "../signature";
import {
  isGatewayDowntime,
  STANDARD_HOLD_WINDOW_MS,
  DOWNTIME_HOLD_WINDOW_MS,
} from "@/domain/payment/types";
import { initializePayment, verifyPayment } from "../paystack";
import { initiatePaystackRefund } from "../refund";

describe("Step 9: Payment Integration & Webhook Security", () => {
  const secretKey = "whsec_test_secret_for_unit_tests";

  describe("HMAC-SHA512 Signature Verification", () => {
    it("returns true for a valid signature matching payload and secret", () => {
      const payload = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "GAR-12345" } }));
      const validSignature = crypto.createHmac("sha512", secretKey).update(payload).digest("hex");

      const isValid = isValidPaystackSignature(payload, validSignature, secretKey);
      expect(isValid).toBe(true);
    });

    it("rejects tampered webhook payload", () => {
      const originalPayload = Buffer.from(JSON.stringify({ event: "charge.success", data: { amount: 50000 } }));
      const tamperedPayload = Buffer.from(JSON.stringify({ event: "charge.success", data: { amount: 1000 } }));
      const signature = crypto.createHmac("sha512", secretKey).update(originalPayload).digest("hex");

      const isValid = isValidPaystackSignature(tamperedPayload, signature, secretKey);
      expect(isValid).toBe(false);
    });

    it("rejects tampered or malformed signature string", () => {
      const payload = Buffer.from(JSON.stringify({ event: "charge.success" }));
      const tamperedSignature = "invalid_hex_string_that_does_not_match";

      const isValid = isValidPaystackSignature(payload, tamperedSignature, secretKey);
      expect(isValid).toBe(false);
    });

    it("rejects missing, undefined, or array signatures", () => {
      const payload = Buffer.from(JSON.stringify({ event: "charge.success" }));

      expect(isValidPaystackSignature(payload, undefined, secretKey)).toBe(false);
      expect(isValidPaystackSignature(payload, ["sig1", "sig2"], secretKey)).toBe(false);
      expect(isValidPaystackSignature(Buffer.from(""), "sig", secretKey)).toBe(false);
    });
  });

  describe("Gateway Downtime & Inventory Hold Calculation", () => {
    it("returns true only for recognized active downtime flags", () => {
      expect(isGatewayDowntime("true")).toBe(true);
      expect(isGatewayDowntime("1")).toBe(true);
      expect(isGatewayDowntime("active")).toBe(true);

      expect(isGatewayDowntime("false")).toBe(false);
      expect(isGatewayDowntime("0")).toBe(false);
      expect(isGatewayDowntime(null)).toBe(false);
      expect(isGatewayDowntime(undefined)).toBe(false);
    });

    it("evaluates correct standard vs downtime hold windows", () => {
      expect(STANDARD_HOLD_WINDOW_MS).toBe(30 * 60 * 1000); // 30 minutes
      expect(DOWNTIME_HOLD_WINDOW_MS).toBe(120 * 60 * 1000); // 2 hours
    });
  });

  describe("Paystack API Client", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("initializes payment with amount in kobo and returns authorization url", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          message: "Authorization URL created",
          data: {
            authorization_url: "https://checkout.paystack.com/access-code-123",
            access_code: "access-code-123",
            reference: "GAR-REF-001",
          },
        }),
      });

      global.fetch = mockFetch;

      const result = await initializePayment({
        email: "guest@example.com",
        amountKobo: 25000000,
        reference: "GAR-REF-001",
        callbackUrl: "https://gracearena.ng/booking/confirmation",
      });

      expect(result.authorizationUrl).toBe("https://checkout.paystack.com/access-code-123");
      expect(result.accessCode).toBe("access-code-123");
      expect(result.reference).toBe("GAR-REF-001");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.paystack.co/transaction/initialize",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "guest@example.com",
            amount: 25000000,
            reference: "GAR-REF-001",
            callback_url: "https://gracearena.ng/booking/confirmation",
          }),
        })
      );
    });

    it("verifies payment status and normalizes successful transaction data", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            status: "success",
            reference: "GAR-REF-001",
            amount: 25000000,
            currency: "NGN",
            channel: "card",
            paid_at: "2026-05-10T12:00:00.000Z",
            gateway_response: "Successful",
            customer: { email: "guest@example.com" },
          },
        }),
      });

      global.fetch = mockFetch;

      const verification = await verifyPayment("GAR-REF-001");
      expect(verification.status).toBe("success");
      expect(verification.reference).toBe("GAR-REF-001");
      expect(verification.amountKobo).toBe(25000000);
      expect(verification.paidAt).toBe("2026-05-10T12:00:00.000Z");
    });

    it("initiates refund with proper parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            id: 999123,
            status: "processed",
            amount: 25000000,
            transaction_reference: "GAR-REF-001",
            deducted_amount: 25000000,
          },
        }),
      });

      global.fetch = mockFetch;

      const refund = await initiatePaystackRefund({
        transactionReferenceOrId: "GAR-REF-001",
        amountKobo: 25000000,
        customerNote: "Booking cancelled within full refund window",
      });

      expect(refund.refundId).toBe(999123);
      expect(refund.status).toBe("processed");
      expect(refund.amountKobo).toBe(25000000);
    });
  });
});
