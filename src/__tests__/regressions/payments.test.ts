// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import type { NextApiRequest } from "next";
import { FakeSupabase } from "@/test-utils/fake-supabase";
import { mockApiCall } from "@/test-utils/api";
import { resetRateLimits } from "@/lib/security/rate-limit";

vi.mock("@/services/email/sendgrid", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/services/booking/notifications", () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/services/payments/refund", () => ({
  initiatePaystackRefund: vi.fn().mockResolvedValue({ refundId: 991, status: "pending" }),
}));

const db = vi.hoisted(() => ({ current: null as unknown as FakeSupabase }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => db.current.client,
  createSupabaseAuthClient: () => db.current.authClient,
}));

import { initiatePaystackRefund } from "@/services/payments/refund";
import { sendBookingConfirmationEmail } from "@/services/booking/notifications";
import { settleSuccessfulCharge } from "@/services/payments/settlement";
import webhookHandler from "@/pages/api/v1/payments/webhook";
import cancelHandler from "@/pages/api/v1/bookings/[ref]/cancel";
import { env } from "@/config/env";

function resetRefundMock() {
  vi.mocked(initiatePaystackRefund).mockReset().mockResolvedValue({
    refundId: 991,
    status: "pending",
    amountKobo: 0,
    transactionReference: "",
  });
}

const GUEST_ID = "11111111-0000-0000-0000-000000000001";
const future = (ms: number) => new Date(Date.now() + ms).toISOString();

function seedBooking(overrides: Record<string, unknown> = {}) {
  db.current.seed("bookings", [
    {
      id: "booking-1",
      reference: "GAR-ABCDEFGH",
      user_id: GUEST_ID,
      guest_name: "Ada Obi",
      guest_email: "ada@example.com",
      guest_phone: "+2348012345678",
      check_in_date: "2099-06-10",
      check_out_date: "2099-06-12",
      nights: 2,
      subtotal: 120000,
      deal_discount: 0,
      tax: 9000,
      total: 129000,
      status: "pending",
      hold_expires_at: future(20 * 60_000),
      special_requests: null,
      ...overrides,
    },
  ]);
  db.current.seed("payments", [
    {
      id: "payment-1",
      booking_id: "booking-1",
      gateway: "paystack",
      gateway_reference: "GAR-ABCDEFGH-0001",
      amount: 129000,
      currency: "NGN",
      status: "pending",
      metadata: {},
    },
  ]);
}

const charge = (overrides: Record<string, unknown> = {}) => ({
  reference: "GAR-ABCDEFGH-0001",
  amountKobo: 129000 * 100,
  currency: "NGN",
  ...overrides,
});

describe("Regression: payment settlement (audit C1, C2, C5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRefundMock();
    db.current = new FakeSupabase();
  });

  it("confirms a pending booking exactly once even if verify and webhook both settle", async () => {
    seedBooking();

    const first = await settleSuccessfulCharge(db.current.client, charge());
    const second = await settleSuccessfulCharge(db.current.client, charge());

    expect(first.outcome).toBe("confirmed");
    expect(second.outcome).toBe("already_processed");
    expect(db.current.rows("bookings")[0].status).toBe("confirmed");
    expect(db.current.rows("payments")[0].status).toBe("success");
    expect(sendBookingConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it("refunds and does not confirm when the amount paid is less than the booking total", async () => {
    seedBooking();

    const result = await settleSuccessfulCharge(db.current.client, charge({ amountKobo: 10000 }));

    expect(result.outcome).toBe("refunded_amount_mismatch");
    expect(db.current.rows("bookings")[0].status).toBe("pending");
    expect(db.current.rows("payments")[0].status).toBe("refund_pending");
    expect(initiatePaystackRefund).toHaveBeenCalledWith(
      expect.objectContaining({ transactionReferenceOrId: "GAR-ABCDEFGH-0001", amountKobo: 10000 })
    );
  });

  it("ignores charges whose reference merely starts with a booking reference", async () => {
    seedBooking();

    const result = await settleSuccessfulCharge(
      db.current.client,
      charge({ reference: "GAR-ABCDEFGH-attacker" })
    );

    expect(result.outcome).toBe("not_found");
    expect(db.current.rows("bookings")[0].status).toBe("pending");
  });

  it("refunds a payment that arrives after the expiry job cancelled the booking", async () => {
    seedBooking({ status: "cancelled", hold_expires_at: future(-60_000) });

    const result = await settleSuccessfulCharge(db.current.client, charge());

    expect(result.outcome).toBe("refunded_late_payment");
    expect(db.current.rows("bookings")[0].status).toBe("cancelled");
    expect(db.current.rows("payments")[0].status).toBe("refund_pending");
    expect(initiatePaystackRefund).toHaveBeenCalledTimes(1);
  });

  it("refunds and cancels when the hold expired but the cron has not run yet", async () => {
    seedBooking({ hold_expires_at: future(-60_000) });

    const result = await settleSuccessfulCharge(db.current.client, charge());

    expect(result.outcome).toBe("refunded_late_payment");
    expect(db.current.rows("bookings")[0].status).toBe("cancelled");
  });

  it("retries a refund that failed at the gateway on the next delivery", async () => {
    seedBooking({ status: "cancelled", hold_expires_at: future(-60_000) });
    vi.mocked(initiatePaystackRefund).mockRejectedValueOnce(new Error("gateway down"));

    await expect(settleSuccessfulCharge(db.current.client, charge())).rejects.toThrow(
      "gateway down"
    );
    expect(db.current.rows("payments")[0].status).toBe("success");

    const retry = await settleSuccessfulCharge(db.current.client, charge());
    expect(retry.outcome).toBe("refunded_late_payment");
    expect(db.current.rows("payments")[0].status).toBe("refund_pending");
    expect(initiatePaystackRefund).toHaveBeenCalledTimes(2);
  });
});

function webhookRequest(payload: unknown, secret = env.PAYSTACK_WEBHOOK_SECRET) {
  const raw = Buffer.from(JSON.stringify(payload));
  const signature = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  const req = new Readable({
    read() {
      this.push(raw);
      this.push(null);
    },
  }) as unknown as NextApiRequest;
  Object.assign(req, {
    method: "POST",
    url: "/api/v1/payments/webhook",
    headers: { "x-paystack-signature": signature, "content-length": String(raw.length) },
    socket: { remoteAddress: "127.0.0.1" },
  });
  const call = mockApiCall({ method: "POST" });
  return { ...call, req };
}

describe("Regression: webhook ledger (audit C4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRefundMock();
    db.current = new FakeSupabase();
  });

  const event = {
    event: "charge.success",
    data: {
      id: 42,
      reference: "GAR-ABCDEFGH-0001",
      amount: 12900000,
      currency: "NGN",
      status: "success",
    },
  };

  it("rejects an invalid signature", async () => {
    const call = webhookRequest(event, "wrong-secret");
    await webhookHandler(call.req, call.res);
    expect(call.status()).toBe(401);
  });

  it("does not mark a failed event as processed, so Paystack's retry is handled", async () => {
    seedBooking({ status: "cancelled", hold_expires_at: future(-60_000) });
    vi.mocked(initiatePaystackRefund).mockRejectedValueOnce(new Error("gateway down"));

    const first = webhookRequest(event);
    await webhookHandler(first.req, first.res);
    expect(first.status()).toBe(500);
    expect(db.current.rows("webhook_events")[0].processed_at).toBeFalsy();

    const retry = webhookRequest(event);
    await webhookHandler(retry.req, retry.res);
    expect(retry.status()).toBe(200);
    expect(db.current.rows("payments")[0].status).toBe("refund_pending");

    const duplicate = webhookRequest(event);
    await webhookHandler(duplicate.req, duplicate.res);
    expect(duplicate.body().message).toMatch(/Duplicate/);
    expect(initiatePaystackRefund).toHaveBeenCalledTimes(2);
  });

  it("confirms a valid charge", async () => {
    seedBooking();
    const call = webhookRequest(event);
    await webhookHandler(call.req, call.res);
    expect(call.status()).toBe(200);
    expect(db.current.rows("bookings")[0].status).toBe("confirmed");
  });
});

describe("Regression: guest cancellation refunds (audit C3, E1)", () => {
  let accessToken: string;

  beforeEach(() => {
    resetRateLimits();
    vi.clearAllMocks();
    resetRefundMock();
    db.current = new FakeSupabase();
    db.current.authUsers.push({
      id: GUEST_ID,
      email: "ada@example.com",
      password: "x",
      user_metadata: {},
      email_confirmed_at: new Date().toISOString(),
    });
    db.current.seed("users", [
      {
        id: GUEST_ID,
        email: "ada@example.com",
        full_name: "Ada Obi",
        phone: null,
        role: "guest",
        is_email_verified: true,
        is_locked: false,
      },
    ]);
    accessToken = db.current.issueSession(GUEST_ID).access_token;
  });

  const cancelCall = (method: "GET" | "PUT") =>
    mockApiCall({
      method,
      query: { ref: "GAR-ABCDEFGH" },
      cookies: { gar_access_token: accessToken },
    });

  it("GET previews the refund without changing anything", async () => {
    seedBooking({ status: "confirmed", hold_expires_at: null });
    db.current.rows("payments")[0].status = "success";

    const call = cancelCall("GET");
    await cancelHandler(call.req, call.res);

    expect(call.status()).toBe(200);
    expect(call.body().data).toMatchObject({
      refundPercentage: 100,
      estimatedRefundAmount: 129000,
    });
    expect(db.current.rows("bookings")[0].status).toBe("confirmed");
    expect(initiatePaystackRefund).not.toHaveBeenCalled();
  });

  it("PUT cancels and actually requests the refund from Paystack", async () => {
    seedBooking({ status: "confirmed", hold_expires_at: null });
    db.current.rows("payments")[0].status = "success";

    const call = cancelCall("PUT");
    await cancelHandler(call.req, call.res);

    expect(call.status()).toBe(200);
    expect(initiatePaystackRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionReferenceOrId: "GAR-ABCDEFGH-0001",
        amountKobo: 12900000,
      })
    );
    expect(db.current.rows("bookings")[0].status).toBe("cancelled");
    expect(db.current.rows("payments")[0].status).toBe("refund_pending");
  });

  it("leaves the booking confirmed if the gateway refuses the refund", async () => {
    seedBooking({ status: "confirmed", hold_expires_at: null });
    db.current.rows("payments")[0].status = "success";
    vi.mocked(initiatePaystackRefund).mockRejectedValueOnce(new Error("gateway down"));

    const call = cancelCall("PUT");
    await cancelHandler(call.req, call.res);

    expect(call.status()).toBe(502);
    expect(db.current.rows("bookings")[0].status).toBe("confirmed");
    expect(db.current.rows("payments")[0].status).toBe("success");
  });

  it("cannot cancel another guest's booking", async () => {
    seedBooking({ user_id: "someone-else", status: "confirmed" });
    const call = cancelCall("PUT");
    await cancelHandler(call.req, call.res);
    expect(call.status()).toBe(404);
  });
});
