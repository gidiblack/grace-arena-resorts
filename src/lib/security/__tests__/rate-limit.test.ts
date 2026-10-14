import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getClientIp, resetRateLimits } from "../rate-limit";
import type { NextApiRequest } from "next";

describe("Rate Limiting", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("extracts client IP from x-forwarded-for header", () => {
    const req = {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
      socket: { remoteAddress: "127.0.0.1" },
    } as unknown as NextApiRequest;

    expect(getClientIp(req)).toBe("203.0.113.195");
  });

  it("extracts client IP from socket when headers are missing", () => {
    const req = {
      headers: {},
      socket: { remoteAddress: "192.168.1.50" },
    } as unknown as NextApiRequest;

    expect(getClientIp(req)).toBe("192.168.1.50");
  });

  it("permits requests up to maxRequests within window", () => {
    const key = "test-ip";
    const res1 = checkRateLimit(key, 3, 60);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(key, 3, 60);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(key, 3, 60);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);

    const res4 = checkRateLimit(key, 3, 60);
    expect(res4.success).toBe(false);
    expect(res4.remaining).toBe(0);
  });
});
