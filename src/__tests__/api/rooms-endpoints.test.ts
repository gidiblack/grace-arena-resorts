/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

import buildingsHandler from "@/pages/api/v1/buildings/index";
import roomsHandler from "@/pages/api/v1/rooms/index";
import roomDetailHandler from "@/pages/api/v1/rooms/[id]";
import notifyMeHandler, { resetNotifyMeStore, notifyMeStore } from "@/pages/api/v1/notify-me";
import { resetRateLimits } from "@/lib/security/rate-limit";

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
    headers: options.headers || {},
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;

  let statusCode = 200;
  let responseData: any = null;
  const headersSet: Record<string, string> = {};

  const res = {
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((data: any) => {
      responseData = data;
      return res;
    }),
    send: vi.fn((data: any) => {
      responseData = data;
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

describe("Step 7 Rooms & Catalog API Endpoints", () => {
  beforeEach(() => {
    resetRateLimits();
    resetNotifyMeStore();
    vi.clearAllMocks();
  });

  describe("GET /api/v1/buildings", () => {
    it("returns all buildings with campus association", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({});
      await buildingsHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      expect(data.data[0]).toHaveProperty("campus");
      expect(data.data[0]).toHaveProperty("campusTitle");
      expect(data.data[0]).toHaveProperty("totalRooms");
    });

    it("filters buildings by campus", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { campus: "village" },
      });
      await buildingsHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.data.every((b: any) => b.campus === "village")).toBe(true);
    });

    it("rejects non-GET methods with 405", async () => {
      const { req, res, getStatusCode } = createMockReqRes({ method: "POST" });
      await buildingsHandler(req, res);
      expect(getStatusCode()).toBe(405);
    });
  });

  describe("GET /api/v1/rooms", () => {
    it("returns room listing and supports campus filtering", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { campus: "elysian" },
      });
      await roomsHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.success).toBe(true);
      expect(data.data.every((r: any) => r.campus === "elysian")).toBe(true);
    });

    it("supports tier filtering", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { tier: "Presidential" },
      });
      await roomsHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.data.every((r: any) => r.tier === "Presidential")).toBe(true);
    });

    it("supports isUnderConstruction filtering", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { isUnderConstruction: "true" },
      });
      await roomsHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.data.length).toBe(2);
      expect(data.data.every((r: any) => r.isUnderConstruction === true)).toBe(true);
    });
  });

  describe("GET /api/v1/rooms/[id]", () => {
    it("returns single room details by id", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        query: { id: "village-executive-hut" },
      });
      await roomDetailHandler(req, res);

      expect(getStatusCode()).toBe(200);
      const data = getData();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("village-executive-hut");
      expect(data.data.name).toBe("Executive Thatched Hut");
    });

    it("returns 404 for unknown room id", async () => {
      const { req, res, getStatusCode } = createMockReqRes({
        query: { id: "non-existent-room-999" },
      });
      await roomDetailHandler(req, res);

      expect(getStatusCode()).toBe(404);
    });
  });

  describe("POST /api/v1/notify-me", () => {
    it("captures notification request and suppresses duplicate submissions", async () => {
      // 1st submission
      const { req: req1, res: res1, getStatusCode: getCode1, getData: getData1 } = createMockReqRes({
        method: "POST",
        body: {
          email: "retreat.leader@example.com",
          roomTypeId: "village-presidential-hut",
          roomTitle: "Presidential Thatched Hut",
          phone: "+2348123456789",
        },
      });

      await notifyMeHandler(req1, res1);
      expect(getCode1()).toBe(200);
      expect(getData1().data.isDuplicate).toBe(false);
      expect(notifyMeStore.length).toBe(1);

      // 2nd submission (duplicate with same email and roomTypeId)
      const { req: req2, res: res2, getStatusCode: getCode2, getData: getData2 } = createMockReqRes({
        method: "POST",
        body: {
          email: "retreat.leader@example.com",
          roomTypeId: "village-presidential-hut",
          roomTitle: "Presidential Thatched Hut",
        },
      });

      await notifyMeHandler(req2, res2);
      expect(getCode2()).toBe(200);
      expect(getData2().data.isDuplicate).toBe(true);
      // Verify duplicate suppression: no second row created
      expect(notifyMeStore.length).toBe(1);
    });

    it("validates email address format", async () => {
      const { req, res, getStatusCode, getData } = createMockReqRes({
        method: "POST",
        body: {
          email: "invalid-email-format",
          roomTypeId: "village-royal-hut",
        },
      });

      await notifyMeHandler(req, res);
      expect(getStatusCode()).toBe(400);
      expect(getData().error.code).toBe("VALIDATION_ERROR");
    });
  });
});
