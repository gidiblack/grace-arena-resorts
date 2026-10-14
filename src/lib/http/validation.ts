import { z } from "zod";
import type { NextApiRequest, NextApiResponse } from "next";
import { fail } from "./response";

export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  handler: (req: NextApiRequest, res: NextApiResponse, data: z.infer<T>) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const parseResult = schema.safeParse(req.body);
    if (!parseResult.success) {
      return fail(res, "VALIDATION_ERROR", "Invalid request body", 400, parseResult.error.format());
    }
    return handler(req, res, parseResult.data);
  };
}

export function validateQuery<T extends z.ZodTypeAny>(
  schema: T,
  handler: (req: NextApiRequest, res: NextApiResponse, query: z.infer<T>) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const parseResult = schema.safeParse(req.query);
    if (!parseResult.success) {
      return fail(
        res,
        "VALIDATION_ERROR",
        "Invalid query parameters",
        400,
        parseResult.error.format()
      );
    }
    return handler(req, res, parseResult.data);
  };
}
