import { describe, it, expect, vi } from "vitest";
import { ok, fail } from "../response";
import type { NextApiResponse } from "next";

function createMockResponse() {
  const res: Partial<NextApiResponse> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as NextApiResponse;
}

describe("API Response Envelopes", () => {
  it("formats ok() response with success: true and data", () => {
    const res = createMockResponse();
    const data = { id: "123", name: "Executive Suite" };

    ok(res, data, 200, { page: 1, limit: 10, total: 1 });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data,
      meta: { page: 1, limit: 10, total: 1 },
    });
  });

  it("formats fail() response with success: false and error payload", () => {
    const res = createMockResponse();

    fail(res, "VALIDATION_ERROR", "Invalid input", 400, { field: "email" });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: { field: "email" },
      },
    });
  });
});
