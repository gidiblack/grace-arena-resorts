import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export interface RecaptchaVerificationResult {
  success: boolean;
  score: number;
  action?: string;
  error?: string;
}

/**
 * Verifies a Google reCAPTCHA v3 token against Google siteverify API.
 * Threshold is minimum 0.5 per GAR-SRS Section 4.5.
 */
export async function verifyRecaptcha(
  token?: string,
  expectedAction?: string
): Promise<RecaptchaVerificationResult> {
  // If no secret key is configured (local dev/test), bypass verification safely
  if (!env.RECAPTCHA_SECRET_KEY || env.NODE_ENV === "test") {
    return { success: true, score: 1.0, action: expectedAction };
  }

  if (!token) {
    return {
      success: false,
      score: 0,
      error: "Missing reCAPTCHA token",
    };
  }

  try {
    const params = new URLSearchParams({
      secret: env.RECAPTCHA_SECRET_KEY,
      response: token,
    });

    const response = await axios.post<{
      success: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    }>("https://www.google.com/recaptcha/api/siteverify", params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 5000,
    });

    const data = response.data;

    if (!data.success) {
      logger.warn("reCAPTCHA validation failed", { errorCodes: data["error-codes"] });
      return {
        success: false,
        score: data.score || 0,
        error: "Verification failed",
      };
    }

    const score = data.score ?? 0;
    const isPassing = score >= 0.5;

    if (!isPassing) {
      logger.warn("reCAPTCHA score below threshold (0.5)", { score });
      return {
        success: false,
        score,
        action: data.action,
        error: "Spam risk detected",
      };
    }

    return {
      success: true,
      score,
      action: data.action,
    };
  } catch (error) {
    logger.error("Error communicating with reCAPTCHA service", { error });
    // Fail closed on live systems, or fallback if network issue
    return {
      success: false,
      score: 0,
      error: "Unable to verify anti-spam token",
    };
  }
}

export default function notFound(_req: NextApiRequest, res: NextApiResponse) {
  res.status(404).end();
}
