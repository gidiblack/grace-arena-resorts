import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail } from "@/lib/http/response";
import { MOCK_MEDIA } from "@/data/mock/resort-data";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const { category, page } = req.query;

  let items = MOCK_MEDIA;
  if (category && typeof category === "string") {
    items = items.filter((m) => m.category === category);
  }
  if (page && typeof page === "string") {
    items = items.filter((m) => m.page === page);
  }

  return ok(res, items, 200, { total: items.length });
}
