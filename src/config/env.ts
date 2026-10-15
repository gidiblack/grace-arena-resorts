import { z } from "zod";

/** Optional settings left blank in .env files (e.g. copied from .env.example) count as unset */
const blankAsUnset = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Supabase (M1 mock mode fallback; live keys required in M2)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().default("http://127.0.0.1:54321"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional().default("local-anon-key-placeholder"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1)
    .optional()
    .default("local-service-role-key-placeholder"),

  // Paystack (M2 Booking Engine)
  PAYSTACK_SECRET_KEY: z.string().min(1).optional().default("sk_test_placeholder_key_for_dev"),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1).optional().default("whsec_placeholder_key_for_dev"),

  // Resend Email Service
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.preprocess(
    (value) => (value === "" || value === undefined ? "onboarding@resend.dev" : value),
    z.string().email()
  ),
  RESEND_REPLY_TO: blankAsUnset(z.string().email()),

  // Anti-spam (Optional in M1; revisit or use Cloudflare Turnstile before production forms)
  RECAPTCHA_SECRET_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional().default(""),

  // WhatsApp
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().regex(/^\d{10,15}$/, "Must be between 10 and 15 digits"),

  // Optional rate limiting & analytics
  VERCEL_KV_REST_API_URL: blankAsUnset(z.string().url()),
  VERCEL_KV_REST_API_TOKEN: blankAsUnset(z.string().min(1)),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),

  // Shared secret for internal job endpoints (Vercel Cron sends it as "Authorization: Bearer <secret>")
  CRON_SECRET: blankAsUnset(z.string().min(16)),

  // Serve bundled mock data from booking APIs instead of Supabase (local UI preview/tests only)
  NEXT_PUBLIC_USE_MOCK_DATA: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((v) => v === "true"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
