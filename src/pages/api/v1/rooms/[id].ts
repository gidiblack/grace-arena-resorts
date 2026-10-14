import type { NextApiRequest, NextApiResponse } from "next";
import { MOCK_ROOMS } from "@/data/mock/resort-data";
import { ok, fail } from "@/lib/http/response";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return fail(res, "METHOD_NOT_ALLOWED", `Method ${req.method} not allowed`, 405);
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return fail(res, "BAD_REQUEST", "Room id is required", 400);
  }

  const room = MOCK_ROOMS.find(
    (r) => r.id.toLowerCase() === id.toLowerCase() || r.slug.toLowerCase() === id.toLowerCase()
  );

  if (!room) {
    return fail(res, "NOT_FOUND", `Room with identifier '${id}' not found`, 404);
  }

  return ok(res, room);
}
