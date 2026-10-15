import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

describe("Environment schema validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("passes validation with valid minimum environment variables", () => {
    const envSchema = z.object({
      NEXT_PUBLIC_APP_URL: z.string().url(),
      NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().regex(/^\d{10,15}$/),
      RESEND_API_KEY: z.string().min(1),
      RESEND_FROM_EMAIL: z.string().email(),
    });

    const validEnv = {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_WHATSAPP_NUMBER: "2348123456789",
      RESEND_API_KEY: "re_valid_key_sample",
      RESEND_FROM_EMAIL: "onboarding@resend.dev",
    };

    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  it("fails fast when NEXT_PUBLIC_APP_URL is invalid", () => {
    const envSchema = z.object({
      NEXT_PUBLIC_APP_URL: z.string().url(),
    });

    const result = envSchema.safeParse({ NEXT_PUBLIC_APP_URL: "not-a-valid-url" });
    expect(result.success).toBe(false);
  });

  it("fails fast when WhatsApp number is not between 10 and 15 digits", () => {
    const envSchema = z.object({
      NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().regex(/^\d{10,15}$/),
    });

    const result = envSchema.safeParse({ NEXT_PUBLIC_WHATSAPP_NUMBER: "+1234" });
    expect(result.success).toBe(false);
  });

  it("fails fast when RESEND_FROM_EMAIL is not a valid email", () => {
    const envSchema = z.object({
      RESEND_FROM_EMAIL: z.string().email(),
    });

    const result = envSchema.safeParse({ RESEND_FROM_EMAIL: "invalid-email" });
    expect(result.success).toBe(false);
  });
});
