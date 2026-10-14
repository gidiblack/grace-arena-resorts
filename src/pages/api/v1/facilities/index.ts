import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail } from "@/lib/http/response";
import { MOCK_FACILITIES } from "@/data/mock/resort-data";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const { campus } = req.query;

  let facilities = MOCK_FACILITIES;
  if (campus && typeof campus === "string") {
    facilities = facilities.filter(
      (f) => f.campus === campus || f.campus === "central"
    );
  }

  return ok(res, facilities, 200, { total: facilities.length });
}
