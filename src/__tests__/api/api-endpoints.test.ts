/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

// Import Handlers
import amenitiesHandler from "@/pages/api/v1/amenities/index";
import facilitiesHandler from "@/pages/api/v1/facilities/index";
import facilityDetailHandler from "@/pages/api/v1/facilities/[id]";
import restaurantsHandler from "@/pages/api/v1/restaurants/index";
import restaurantDetailHandler from "@/pages/api/v1/restaurants/[id]";
import restaurantMenuHandler from "@/pages/api/v1/restaurants/[id]/menu";
import gemsHandler from "@/pages/api/v1/gems/index";
import eventsHandler from "@/pages/api/v1/events/index";
import eventInquiriesHandler from "@/pages/api/v1/events/inquiries";
import dealsHandler from "@/pages/api/v1/deals/index";
import dealDetailHandler from "@/pages/api/v1/deals/[id]";
import contactHandler from "@/pages/api/v1/contact/index";
import newsletterSubscribeHandler from "@/pages/api/v1/newsletter/subscribe";
import newsletterConfirmHandler from "@/pages/api/v1/newsletter/confirm";
import newsletterUnsubscribeHandler from "@/pages/api/v1/newsletter/unsubscribe";
import mediaHandler from "@/pages/api/v1/media/index";
import contentHandler from "@/pages/api/v1/content/[page]";
import { resetRateLimits } from "@/lib/security/rate-limit";

import { sendEmail } from "@/services/email";
import { newsletterUnsubscribeToken } from "@/services/newsletter/tokens";
import { FakeSupabase } from "@/test-utils/fake-supabase";

// Mock sendEmail to prevent network calls during testing
vi.mock("@/services/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: "mock-id" }),
}));

const db = vi.hoisted(() => ({ current: null as unknown as FakeSupabase }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => db.current.client,
  createSupabaseAuthClient: () => db.current.authClient,
}));

function createMockReqRes(options: {
  method?: string;
  query?: Record<string, string | string[]>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}) {
  const req = {
    method: options.method || "GET",
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || { "sec-fetch-site": "same-origin" },
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;

  let statusCode = 200;
  let responseData: Record<string, any> | null = null;
  const headersSet: Record<string, string> = {};

  const res = {
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((data: Record<string, unknown>) => {
      responseData = data;
      return res;
    }),
    send: vi.fn((data: unknown) => {
      responseData = data as Record<string, any>;
      return res;
    }),
    setHeader: vi.fn((key: string, val: string) => {
      headersSet[key] = val;
      return res;
    }),
    getHeader: vi.fn((key: string) => headersSet[key]),
  } as unknown as NextApiResponse;

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getData: () => responseData as any,
  };
}

describe("Public Content API Endpoints (Step 6)", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.clearAllMocks();
    db.current = new FakeSupabase();
  });

  describe("GET /api/v1/amenities", () => {
    it("returns sorted resort amenities", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({});
      await amenitiesHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0]).toHaveProperty("name");
    });
  });

  describe("GET /api/v1/facilities", () => {
    it("returns list of facilities and supports campus filter", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { campus: "elysian" },
      });
      await facilitiesHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      data.data.forEach((item: any) => {
        expect(["elysian", "central"]).toContain(item.campus);
      });
    });

    it("returns facility detail by id", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { id: "the-prayer-hut" },
      });
      await facilityDetailHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("the-prayer-hut");
    });

    it("returns 404 for unknown facility id", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { id: "unknown-fac" },
      });
      await facilityDetailHandler(req, res);

      expect(getStatusCode()).toBe(404);
      expect(getData().success).toBe(false);
    });
  });

  describe("GET /api/v1/restaurants", () => {
    it("returns restaurant venues", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({});
      await restaurantsHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it("returns restaurant detail and menu", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { id: "the-grand-palm" },
      });
      await restaurantDetailHandler(req, res);

      expect(getStatusCode()).toBe(200);
      expect(getData().data.id).toBe("the-grand-palm");

      // Menu endpoint
      const menuMock = createMockReqRes({ query: { id: "the-grand-palm" } });
      await restaurantMenuHandler(menuMock.req, menuMock.res);
      expect(menuMock.getStatusCode()).toBe(200);
      expect(Array.isArray(menuMock.getData().data)).toBe(true);
    });
  });

  describe("GET /api/v1/gems", () => {
    it("returns off-beat local gems", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({});
      await gemsHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.success).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/v1/events and POST /api/v1/events/inquiries", () => {
    it("returns event categories", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({});
      await eventsHandler(req, res);

      expect(getStatusCode()).toBe(200);
      expect(getData().data.length).toBeGreaterThan(0);
    });

    it("accepts valid event inquiry and sends acknowledgment", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        method: "POST",
        body: {
          fullName: "Pastor John",
          email: "john@church.org",
          phoneNumber: "+2348012345678",
          eventType: "Pastoral Retreat",
          estimatedGuests: 40,
        },
      });

      await eventInquiriesHandler(req, res);

      expect(getStatusCode()).toBe(201);
      const data = getData();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("inquiryId");
    });

    it("enforces 5 inquiries / hour rate limit per IP", async () => {
      for (let i = 0; i < 5; i++) {
        const mock = createMockReqRes({
          method: "POST",
          body: {
            fullName: `User ${i}`,
            email: `user${i}@example.com`,
            phoneNumber: "+2348012345678",
            eventType: "Church Retreat",
          },
        });
        await eventInquiriesHandler(mock.req, mock.res);
        expect(mock.getStatusCode()).toBe(201);
      }

      // 6th inquiry must be throttled with 429
      const throttledMock = createMockReqRes({
        method: "POST",
        body: {
          fullName: "User Throttled",
          email: "throttled@example.com",
          phoneNumber: "+2348012345678",
          eventType: "Church Retreat",
        },
      });
      await eventInquiriesHandler(throttledMock.req, throttledMock.res);
      expect(throttledMock.getStatusCode()).toBe(429);
      expect(throttledMock.getData().error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("GET /api/v1/deals and detail", () => {
    it("returns deals listing", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({});
      await dealsHandler(req, res);

      expect(getStatusCode()).toBe(200);
      expect(getData().data.length).toBeGreaterThan(0);
    });

    it("returns deal detail by id", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { id: "deal-spiritual-renewal" },
      });
      await dealDetailHandler(req, res);

      expect(getStatusCode()).toBe(200);
      expect(getData().data.promoCode).toBe("SERENITY15");
    });
  });

  describe("POST /api/v1/contact", () => {
    it("submits contact message and enforces 3/hr rate limit", async () => {
      for (let i = 0; i < 3; i++) {
        const mock = createMockReqRes({
          method: "POST",
          body: {
            fullName: "Samuel Ade",
            email: "samuel@example.com",
            subject: "Directions to Resort",
            message: "Hello, I will be visiting this Saturday with my family.",
          },
        });
        await contactHandler(mock.req, mock.res);
        expect(mock.getStatusCode()).toBe(201);
      }

      // 4th request must be throttled with 429
      const throttled = createMockReqRes({
        method: "POST",
        body: {
          fullName: "Samuel Ade",
          email: "samuel@example.com",
          subject: "Directions to Resort",
          message: "Hello, I will be visiting this Saturday with my family.",
        },
      });
      await contactHandler(throttled.req, throttled.res);
      expect(throttled.getStatusCode()).toBe(429);
      expect(throttled.getData().error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Newsletter Double Opt-In Flow", () => {
    it("handles subscribe, confirm, and unsubscribe end-to-end with single-use tokens", async () => {
      // 1. Subscribe: row stored unconfirmed, confirmation link emailed
      const subMock = createMockReqRes({ method: "POST", body: { email: "Guest@Example.com" } });
      await newsletterSubscribeHandler(subMock.req, subMock.res);
      expect(subMock.getStatusCode()).toBe(200);
      expect(subMock.res.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        expect.arrayContaining([expect.stringContaining("gar_newsletter_subscribed=true")])
      );
      const [subscriber] = db.current.rows("newsletter_subscribers");
      expect(subscriber.email).toBe("guest@example.com");
      expect(subscriber.is_confirmed).toBeFalsy();

      const confirmUrl = vi.mocked(sendEmail).mock.calls[0][0].templateData.confirmUrl as string;
      const token = new URL(confirmUrl).searchParams.get("token")!;

      // 2. Confirm with the emailed token
      const confirmMock = createMockReqRes({ method: "GET", query: { token } });
      await newsletterConfirmHandler(confirmMock.req, confirmMock.res);
      expect(confirmMock.getStatusCode()).toBe(200);
      expect(confirmMock.getData().data.confirmed).toBe(true);
      expect(db.current.rows("newsletter_subscribers")[0].is_confirmed).toBe(true);

      // Token is single-use
      const replayMock = createMockReqRes({ method: "GET", query: { token } });
      await newsletterConfirmHandler(replayMock.req, replayMock.res);
      expect(replayMock.getStatusCode()).toBe(400);

      // 3. Unsubscribe requires the signed token
      const forgedMock = createMockReqRes({
        method: "POST",
        body: { email: "guest@example.com", token: "forged" },
      });
      await newsletterUnsubscribeHandler(forgedMock.req, forgedMock.res);
      expect(forgedMock.getStatusCode()).toBe(400);

      const unsubMock = createMockReqRes({
        method: "POST",
        body: {
          email: "guest@example.com",
          token: newsletterUnsubscribeToken("guest@example.com"),
        },
      });
      await newsletterUnsubscribeHandler(unsubMock.req, unsubMock.res);
      expect(unsubMock.getStatusCode()).toBe(200);
      expect(unsubMock.getData().data.unsubscribed).toBe(true);
      expect(unsubMock.res.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        expect.arrayContaining([expect.stringContaining("gar_newsletter_subscribed=;")])
      );
      expect(db.current.rows("newsletter_subscribers")[0].unsubscribed_at).toBeTruthy();
    });

    it("rejects forged base64 confirmation tokens and escapes HTML output", async () => {
      const forged = Buffer.from("<script>alert(1)</script>:1").toString("base64url");
      const mock = createMockReqRes({
        method: "GET",
        query: { token: forged },
        headers: { accept: "text/html" },
      });
      await newsletterConfirmHandler(mock.req, mock.res);
      expect(mock.getStatusCode()).toBe(400);
      expect(String(mock.getData())).not.toContain("<script>");
    });
  });

  describe("GET /api/v1/media", () => {
    it("returns media filtered by category and page", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { category: "gallery", page: "home" },
      });
      await mediaHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.success).toBe(true);
      data.data.forEach((item: any) => {
        expect(item.category).toBe("gallery");
        expect(item.page).toBe("home");
      });
    });
  });

  describe("GET /api/v1/content/[page]", () => {
    it("returns content for about page", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { page: "about" },
      });
      await contentHandler(req, res);

      expect(getStatusCode()).toBe(200);
      expect(getData().data).toHaveProperty("heroTitle");
    });

    it("returns 404 for nonexistent content page", async () => {
      const { req, res, getStatusCode } = createMockReqRes({
        query: { page: "nonexistent-page-xyz" },
      });
      await contentHandler(req, res);

      expect(getStatusCode()).toBe(404);
    });
  });
});
