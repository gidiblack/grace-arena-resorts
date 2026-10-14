import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { ok, fail } from "@/lib/http/response";

const unsubscribeSchema = z.object({
  email: z.string().email("Valid email address required"),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const parsed = unsubscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, "VALIDATION_ERROR", "Invalid email", 400, parsed.error.format());
  }

  return ok(res, {
    unsubscribed: true,
    email: parsed.data.email,
    message: "You have been successfully removed from our mailing list.",
  });
}
