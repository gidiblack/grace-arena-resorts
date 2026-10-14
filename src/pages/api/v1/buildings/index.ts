import type { NextApiRequest, NextApiResponse } from "next";
import { MOCK_BUILDINGS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return fail(res, "METHOD_NOT_ALLOWED", `Method ${req.method} not allowed`, 405);
  }

  const { campus } = req.query;

  let buildings = [...MOCK_BUILDINGS];

  if (campus && typeof campus === "string") {
    buildings = buildings.filter(
      (b) => b.campus.toLowerCase() === campus.toLowerCase()
    );
  }

  return ok(res, buildings);
}
