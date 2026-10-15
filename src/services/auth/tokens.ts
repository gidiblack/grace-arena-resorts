import crypto from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { AuthTokenPurpose } from "@/types/db";

export const TOKEN_TTL_MS: Record<AuthTokenPurpose, number> = {
  email_verification: 24 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
  newsletter_confirm: 7 * 24 * 60 * 60 * 1000,
  newsletter_unsubscribe: 365 * 24 * 60 * 60 * 1000,
};

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issues a random single-use token. Only its SHA-256 hash is stored, so a database
 * read never yields a usable link. Earlier unused tokens for the same purpose and
 * email are invalidated so only the most recent link works.
 */
export async function issueToken(options: {
  purpose: AuthTokenPurpose;
  email: string;
  userId?: string | null;
  ttlMs?: number;
}): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const email = options.email.toLowerCase().trim();
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const now = new Date();

  await supabase
    .from("auth_tokens")
    .update({ used_at: now.toISOString() })
    .eq("purpose", options.purpose)
    .eq("email", email)
    .is("used_at", null);

  const { error } = await supabase.from("auth_tokens").insert({
    token_hash: hashToken(rawToken),
    purpose: options.purpose,
    email,
    user_id: options.userId ?? null,
    expires_at: new Date(
      now.getTime() + (options.ttlMs ?? TOKEN_TTL_MS[options.purpose])
    ).toISOString(),
  });

  if (error) {
    throw new Error(`Failed to issue ${options.purpose} token: ${error.message}`);
  }

  return rawToken;
}

export interface ConsumedToken {
  userId: string | null;
  email: string;
}

/**
 * Atomically marks a token as used. Returns null if the token is unknown, expired,
 * already used, or issued for a different purpose.
 */
export async function consumeToken(
  purpose: AuthTokenPurpose,
  rawToken: string
): Promise<ConsumedToken | null> {
  if (!rawToken || rawToken.length < 20) return null;

  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("auth_tokens")
    .update({ used_at: nowIso })
    .eq("token_hash", hashToken(rawToken))
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .select("user_id, email")
    .maybeSingle();

  if (error || !data) return null;
  return { userId: data.user_id, email: data.email };
}
