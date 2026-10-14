import type { NextApiResponse } from "next";
import type { ApiEnvelope, ApiFailure, ApiSuccess } from "@/types/api";

export function ok<T>(
  res: NextApiResponse<ApiEnvelope<T>>,
  data: T,
  status = 200,
  meta?: ApiSuccess<T>["meta"]
) {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function fail(
  res: NextApiResponse<ApiEnvelope<never>>,
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  const payload: ApiFailure = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return res.status(status).json(payload);
}
