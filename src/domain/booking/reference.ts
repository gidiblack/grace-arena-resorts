import crypto from "node:crypto";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates an 8-character uppercase alphanumeric reference prefixed with "GAR-"
 * Example: "GAR-A1B2C3D4" per GAR-SRS Section 4.3
 */
export function generateBookingReference(): string {
  const bytes = crypto.randomBytes(8);
  let ref = "GAR-";
  for (let i = 0; i < 8; i++) {
    ref += CHARS[bytes[i] % CHARS.length];
  }
  return ref;
}
