import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail } from "@/lib/http/response";
import { MOCK_RESTAURANTS } from "@/data/mock/resort-data";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const { campus } = req.query;

  let restaurants = MOCK_RESTAURANTS;
  if (campus && typeof campus === "string") {
    restaurants = restaurants.filter(
      (r) => r.campus === campus || r.campus === "central"
    );
  }

  return ok(res, restaurants, 200, { total: restaurants.length });
}
