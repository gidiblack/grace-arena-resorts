import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";
import type { Database } from "@/types/db";

let adminClient: SupabaseClient<Database> | null = null;

/**
 * Creates or returns the privileged Supabase Service Role client.
 * Used exclusively on server-side API routes for administrative tasks,
 * background cron operations, payment webhooks, and secure audit logging.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    adminClient = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return adminClient;
}

/**
 * Creates a scoped Supabase client authenticated on behalf of a specific user.
 * Row-Level Security policies will be evaluated in the context of this user's JWT.
 */
export function getSupabaseUserClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
