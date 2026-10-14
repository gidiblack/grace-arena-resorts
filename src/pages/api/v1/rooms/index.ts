import type { NextApiRequest, NextApiResponse } from "next";
import { MOCK_ROOMS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return fail(res, "METHOD_NOT_ALLOWED", `Method ${req.method} not allowed`, 405);
  }

  const { campus, tier, isUnderConstruction } = req.query;

  let rooms = [...MOCK_ROOMS];

  if (campus && typeof campus === "string" && campus.toLowerCase() !== "all") {
    rooms = rooms.filter((r) => r.campus.toLowerCase() === campus.toLowerCase());
  }

  if (tier && typeof tier === "string" && tier.toLowerCase() !== "all") {
    rooms = rooms.filter((r) => r.tier.toLowerCase() === tier.toLowerCase());
  }

  if (isUnderConstruction !== undefined && typeof isUnderConstruction === "string") {
    const isBool = isUnderConstruction.toLowerCase() === "true";
    rooms = rooms.filter((r) => r.isUnderConstruction === isBool);
  }

  return ok(res, rooms);
}
