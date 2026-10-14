import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail } from "@/lib/http/response";
import { MOCK_DEALS } from "@/data/mock/resort-data";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  return ok(res, MOCK_DEALS, 200, { total: MOCK_DEALS.length });
}
