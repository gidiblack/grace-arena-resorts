import crypto from "node:crypto";
import { env } from "@/config/env";

/**
 * Validates a Paystack webhook HMAC-SHA512 signature against the raw request body.
 * Prevents timing attacks using crypto.timingSafeEqual.
 */
export function isValidPaystackSignature(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
  secretKey: string = env.PAYSTACK_WEBHOOK_SECRET
): boolean {
  if (!signatureHeader || Array.isArray(signatureHeader)) {
    return false;
  }

  if (!rawBody || rawBody.length === 0) {
    return false;
  }

  const computedHash = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  const computedBuffer = Buffer.from(computedHash, "utf8");
  const signatureBuffer = Buffer.from(signatureHeader, "utf8");

  if (computedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, signatureBuffer);
}
