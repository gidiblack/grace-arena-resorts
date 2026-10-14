import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail } from "@/lib/http/response";
import { MOCK_FACILITIES } from "@/data/mock/resort-data";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const { id } = req.query;
  const facility = MOCK_FACILITIES.find((f) => f.id === id);

  if (!facility) {
    return fail(res, "NOT_FOUND", `Facility with id '${id}' not found`, 404);
  }

  return ok(res, facility);
}
