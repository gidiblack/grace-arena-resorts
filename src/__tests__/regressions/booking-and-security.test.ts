import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest } from "next";
import { FakeSupabase } from "@/test-utils/fake-supabase";
import { mockApiCall } from "@/test-utils/api";
import { resetRateLimits, getClientIp } from "@/lib/security/rate-limit";
import { validateCsrf } from "@/lib/security/csrf";
import { renderEmailTemplate } from "@/services/email/templates";
import { calculateBookingPricing } from "@/services/pricing/pricing-engine";
import { calculateCancellationRefund } from "@/domain/booking/cancellation";
import { canMarkNoShow } from "@/domain/booking/state-machine";
import { addCalendarDays, resortDateTime, resortToday } from "@/domain/booking/time";

vi.mock("@/services/email/sendgrid", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

const db = vi.hoisted(() => ({ current: null as unknown as FakeSupabase }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => db.current.client,
  createSupabaseAuthClient: () => db.current.authClient,
}));

import bookingsHandler from "@/pages/api/v1/bookings/index";

const GUEST_ID = "11111111-0000-0000-0000-000000000001";
const ROOM_A = "44444444-4444-4444-4444-444444444401";
const ROOM_B = "44444444-4444-4444-4444-444444444407";

function seedGuest(verified = true) {
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
      is_email_verified: verified,
      is_locked: false,
    },
  ]);
  return db.current.issueSession(GUEST_ID).access_token;
}

function seedCatalog() {
  db.current.seed("room_types", [
    { id: ROOM_A, name: "Standard Room", base_price: 60000, status: "available" },
    { id: ROOM_B, name: "Executive Thatched Hut", base_price: 100000, status: "available" },
  ]);
  db.current.seed("system_settings", [{ key: "tax_rate", value: "0.1" }]);
  db.current.seed("deals", [
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01",
      promo_code: "SERENITY15",
      discount_type: "percentage",
      discount_value: 15,
      applicable_room_type_ids: [ROOM_B],
      start_date: "2000-01-01",
      end_date: "2099-12-31",
      is_active: true,
    },
  ]);
}

const checkIn = addCalendarDays(resortToday(), 7);

function bookingBody(overrides: Record<string, unknown> = {}) {
  return {
    checkInDate: checkIn,
    nights: 2,
    rooms: [
      { roomTypeId: ROOM_A, quantity: 1 },
      { roomTypeId: ROOM_B, quantity: 1 },
    ],
    adults: 2,
    children: 0,
    guest: { fullName: "Ada Obi", email: "ada@example.com", phone: "+2348012345678" },
    ...overrides,
  };
}

describe("Regression: booking creation (audit D1, D4, D6, D8, E2)", () => {
  let token: string;
  let rpcArgs: Record<string, unknown> | null;

  beforeEach(() => {
    resetRateLimits();
    vi.clearAllMocks();
    db.current = new FakeSupabase();
    rpcArgs = null;
    db.current.rpcHandlers.create_booking_with_lock = (args) => {
      rpcArgs = args;
      return {
        data: { id: "booking-1", reference: args.p_reference, status: args.p_status },
        error: null,
        status: 200,
      };
    };
    seedCatalog();
    token = seedGuest();
  });

  const post = async (body: unknown, accessToken = token) => {
    const call = mockApiCall({
      method: "POST",
      body,
      cookies: { gar_access_token: accessToken },
    });
    await bookingsHandler(call.req, call.res);
    return call;
  };

  it("prices with the configured tax rate and applies a valid promo only to eligible rooms", async () => {
    const call = await post(bookingBody({ promoCode: "serenity15" }));

    expect(call.status()).toBe(201);
    // Subtotal 2 nights × (60,000 + 100,000) = 320,000; 15% off the hut only = 30,000
    expect(rpcArgs).toMatchObject({
      p_subtotal: 320000,
      p_deal_discount: 30000,
      p_tax: 29000,
      p_total: 319000,
      p_status: "pending",
      p_user_id: GUEST_ID,
      p_deal_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01",
    });
    expect(rpcArgs!.p_line_items).toEqual([
      { room_type_id: ROOM_A, quantity: 1, unit_price: 60000, line_total: 120000 },
      { room_type_id: ROOM_B, quantity: 1, unit_price: 100000, line_total: 200000 },
    ]);
  });

  it("rejects an unknown or wildcard promo code instead of silently charging full price", async () => {
    for (const promoCode of ["NOPE", "%"]) {
      const call = await post(bookingBody({ promoCode }));
      expect(call.status()).toBe(400);
      expect(call.body().error.code).toBe("INVALID_PROMO_CODE");
    }
    expect(rpcArgs).toBeNull();
  });

  it("requires a verified email for online bookings", async () => {
    db.current.rows("users")[0].is_email_verified = false;
    const call = await post(bookingBody());
    expect(call.status()).toBe(403);
    expect(call.body().error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("rejects non-UUID room ids from the static catalogue with a validation error", async () => {
    const call = await post(
      bookingBody({ rooms: [{ roomTypeId: "elysian-fountain-standard", quantity: 1 }] })
    );
    expect(call.status()).toBe(400);
  });

  it("merges duplicate selections of the same room type", async () => {
    await post(
      bookingBody({
        rooms: [
          { roomTypeId: ROOM_A, quantity: 1 },
          { roomTypeId: ROOM_A, quantity: 2 },
        ],
      })
    );
    expect(rpcArgs!.p_line_items).toEqual([
      { room_type_id: ROOM_A, quantity: 3, unit_price: 60000, line_total: 360000 },
    ]);
  });

  it("maps the locked availability check failure to a 409", async () => {
    db.current.rpcHandlers.create_booking_with_lock = () => ({
      data: null,
      error: { message: "INSUFFICIENT_AVAILABILITY", details: `${ROOM_B}:0` },
      status: 400,
    });

    const call = await post(bookingBody());

    expect(call.status()).toBe(409);
    expect(call.body().error.details).toEqual({ roomTypeId: ROOM_B, available: 0 });
  });

  it("rejects past check-in dates in resort time", async () => {
    const call = await post(bookingBody({ checkInDate: addCalendarDays(resortToday(), -1) }));
    expect(call.status()).toBe(400);
    expect(call.body().error.code).toBe("PAST_DATE");
  });
});

describe("Regression: pricing and resort timezone (audit D5, D7)", () => {
  it("uses the most recently created overlapping seasonal price regardless of array order", () => {
    const quote = calculateBookingPricing({
      checkInDate: "2026-12-20",
      checkOutDate: "2026-12-21",
      selections: [{ roomTypeId: "r", quantity: 1 }],
      basePrices: { r: 50000 },
      seasonalPrices: [
        {
          roomTypeId: "r",
          startDate: "2026-12-01",
          endDate: "2026-12-31",
          price: 90000,
          createdAt: "2026-10-02T00:00:00Z",
        },
        {
          roomTypeId: "r",
          startDate: "2026-12-15",
          endDate: "2026-12-25",
          price: 70000,
          createdAt: "2026-09-01T00:00:00Z",
        },
      ],
    });
    expect(quote.subtotal).toBe(90000);
  });

  it("anchors check-in at 14:00 WAT (13:00 UTC) independent of server timezone", () => {
    expect(resortDateTime("2026-06-10").toISOString()).toBe("2026-06-10T13:00:00.000Z");
  });

  it("applies refund tiers against WAT check-in time", () => {
    // Exactly 72h before 14:00 WAT on 10 June = 13:00 UTC on 7 June
    expect(
      calculateCancellationRefund(1000, "2026-06-10", new Date("2026-06-07T13:00:00Z")).tier
    ).toBe("full");
    expect(
      calculateCancellationRefund(1000, "2026-06-10", new Date("2026-06-07T13:00:01Z")).tier
    ).toBe("half");
  });

  it("allows No-Show from 24h after WAT check-in time", () => {
    expect(canMarkNoShow(new Date("2026-06-11T12:59:59Z"), "2026-06-10")).toBe(false);
    expect(canMarkNoShow(new Date("2026-06-11T13:00:00Z"), "2026-06-10")).toBe(true);
  });

  it("computes resort 'today' in WAT near UTC midnight", () => {
    expect(resortToday(new Date("2026-06-10T23:30:00Z"))).toBe("2026-06-11");
  });
});

describe("Regression: CSRF, IP extraction and email escaping (audit F2, F4, F6)", () => {
  const req = (headers: Record<string, string>, method = "POST") =>
    ({ method, url: "/api/v1/contact", headers, cookies: {} }) as unknown as NextApiRequest;

  it("accepts same-origin browser requests and rejects cross-site ones", () => {
    expect(validateCsrf(req({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(validateCsrf(req({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(validateCsrf(req({ origin: "https://evil.example", host: "gracearena.test" }))).toBe(
      false
    );
    expect(validateCsrf(req({ origin: "http://localhost:3000" }))).toBe(true);
  });

  it("no longer lets any X-Requested-With header bypass CSRF", () => {
    expect(validateCsrf(req({ "x-requested-with": "XMLHttpRequest" }))).toBe(false);
  });

  it("prefers the platform-set client IP over a spoofable X-Forwarded-For", () => {
    const r = {
      headers: { "x-forwarded-for": "1.2.3.4", "x-real-ip": "203.0.113.9" },
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as NextApiRequest;
    expect(getClientIp(r)).toBe("203.0.113.9");
  });

  it("escapes user-supplied values and rejects non-http links in emails", () => {
    const rendered = renderEmailTemplate("inquiry_acknowledgment", {
      name: '<a href="https://phish.example">Click</a>',
    });
    expect(rendered.html).not.toContain('<a href="https://phish.example"');
    expect(rendered.html).toContain("&lt;a href=");

    const link = renderEmailTemplate("email_verification", { verifyUrl: "javascript:alert(1)" });
    expect(link.html).not.toContain("javascript:");
  });
});
