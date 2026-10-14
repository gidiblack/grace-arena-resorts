import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail } from "@/lib/http/response";
import { MOCK_DEALS } from "@/data/mock/resort-data";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const { id } = req.query;
  const deal = MOCK_DEALS.find((d) => d.id === id || d.slug === id);

  if (!deal) {
    return fail(res, "NOT_FOUND", `Deal with identifier '${id}' not found`, 404);
  }

  return ok(res, deal);
}
