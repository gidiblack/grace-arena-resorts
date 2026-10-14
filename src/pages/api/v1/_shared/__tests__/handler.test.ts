import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { withApi } from "../handler";
import { parsePagination, setPaginationHeaders } from "../pagination";
import { verifyRecaptcha } from "../recaptcha";

// Mock helper to generate mock req and res
function createMockHttp(
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string | string[]>;
  } = {}
) {
  const req = {
    method: options.method || "GET",
    url: options.url || "/api/v1/test",
    headers: options.headers || { "sec-fetch-site": "same-origin" },
    body: options.body || {},
    query: options.query || {},
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as NextApiRequest;

  const headersSet: Record<string, string> = {};
  let statusCode = 200;
  let responseBody: unknown = null;
  let ended = false;

  const res = {
    setHeader: vi.fn((key: string, value: string) => {
      headersSet[key.toLowerCase()] = value;
      return res;
    }),
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((data: unknown) => {
      responseBody = data;
      ended = true;
      return res;
    }),
    end: vi.fn(() => {
      ended = true;
      return res;
    }),
    get writableEnded() {
      return ended;
    },
    _getStatusCode: () => statusCode,
    _getResponseBody: () => responseBody,
    _getHeaders: () => headersSet,
  } as unknown as NextApiResponse & {
    _getStatusCode: () => number;
    _getResponseBody: () => unknown;
    _getHeaders: () => Record<string, string>;
  };

  return { req, res };
}

describe("Step 3: API Middleware Stack & Shared Primitives", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("withApi Handler Wrapper", () => {
    it("applies security headers and X-Request-Id to every response", async () => {
      const { req, res } = createMockHttp();
      const handler = withApi(async (_r, res) => {
        res.status(200).json({ ok: true });
      });

      await handler(req, res);

      const headers = res._getHeaders();
      expect(headers["strict-transport-security"]).toBeDefined();
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-request-id"]).toBeDefined();
      expect(res._getStatusCode()).toBe(200);
    });

    it("enforces allowedMethods guard and sets Allow header on 405", async () => {
      const { req, res } = createMockHttp({ method: "POST" });
      const handler = withApi(async () => {}, { allowedMethods: ["GET"] });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const body = res._getResponseBody() as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
      expect(res._getHeaders()["allow"]).toBe("GET");
    });

    it("validates request body schema with Zod and returns 400 on failure", async () => {
      const schema = z.object({
        email: z.string().email(),
        nights: z.number().min(1),
      });

      const { req, res } = createMockHttp({
        method: "POST",
        body: { email: "not-an-email", nights: 0 },
      });

      const handler = withApi(async () => {}, {
        allowedMethods: ["POST"],
        bodySchema: schema,
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const body = res._getResponseBody() as {
        success: boolean;
        error: { code: string; details: unknown[] };
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_REQUEST_BODY");
      expect(Array.isArray(body.error.details)).toBe(true);
    });

    it("passes parsed validated body and context to delegate handler", async () => {
      const schema = z.object({
        guestName: z.string().min(2),
      });

      const { req, res } = createMockHttp({
        method: "POST",
        body: { guestName: "Ada Lovelace" },
      });

      let capturedName = "";
      let capturedRequestId = "";

      const handler = withApi(
        async (req, res, ctx) => {
          capturedName = (req.body as { guestName: string }).guestName;
          capturedRequestId = ctx.requestId;
          res.status(200).json({ success: true, guest: capturedName });
        },
        { allowedMethods: ["POST"], bodySchema: schema }
      );

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(capturedName).toBe("Ada Lovelace");
      expect(capturedRequestId.length).toBeGreaterThan(0);
    });

    it("catches unhandled exceptions safely and envelopes 500 error", async () => {
      const { req, res } = createMockHttp();
      const handler = withApi(async () => {
        throw new Error("Database connection lost");
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const body = res._getResponseBody() as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("Pagination Helper", () => {
    it("parses ?page=2&limit=15 correctly", () => {
      const { req } = createMockHttp({ query: { page: "2", limit: "15" } });
      const pagination = parsePagination(req);

      expect(pagination.page).toBe(2);
      expect(pagination.limit).toBe(15);
      expect(pagination.offset).toBe(15); // (2-1)*15
    });

    it("falls back to default page 1 and default limit 20 when params are invalid", () => {
      const { req } = createMockHttp({ query: { page: "-5", limit: "invalid" } });
      const pagination = parsePagination(req);

      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(20);
      expect(pagination.offset).toBe(0);
    });

    it("sets X-Total-Count and X-Total-Pages headers correctly", () => {
      const { res } = createMockHttp();
      setPaginationHeaders(res, 45, 1, 20);

      const headers = res._getHeaders();
      expect(headers["x-total-count"]).toBe("45");
      expect(headers["x-total-pages"]).toBe("3");
      expect(headers["x-page"]).toBe("1");
      expect(headers["x-limit"]).toBe("20");
    });
  });

  describe("reCAPTCHA Verifier", () => {
    it("bypasses safely in test / mock environment with score 1.0", async () => {
      const result = await verifyRecaptcha("any-test-token");
      expect(result.success).toBe(true);
      expect(result.score).toBe(1.0);
    });
  });
});
