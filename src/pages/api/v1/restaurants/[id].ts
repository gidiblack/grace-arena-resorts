import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail } from "@/lib/http/response";
import { MOCK_RESTAURANTS } from "@/data/mock/resort-data";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const { id } = req.query;
  const restaurant = MOCK_RESTAURANTS.find((r) => r.id === id);

  if (!restaurant) {
    return fail(res, "NOT_FOUND", `Restaurant with id '${id}' not found`, 404);
  }

  return ok(res, restaurant);
}
