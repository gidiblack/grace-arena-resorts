import { describe, it, expect, vi, beforeEach } from "vitest";
import { FakeSupabase } from "@/test-utils/fake-supabase";
import { mockApiCall, cookieValue } from "@/test-utils/api";
import { resetRateLimits } from "@/lib/security/rate-limit";
import { safeRedirectPath } from "@/lib/http/redirect";

vi.mock("@/services/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

const db = vi.hoisted(() => ({ current: null as unknown as FakeSupabase }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => db.current.client,
  createSupabaseAuthClient: () => db.current.authClient,
}));

import { sendEmail } from "@/services/email";
import registerHandler from "@/pages/api/v1/auth/register";
import verifyEmailHandler from "@/pages/api/v1/auth/verify-email";
import loginHandler from "@/pages/api/v1/auth/login";
import forgotPasswordHandler from "@/pages/api/v1/auth/forgot-password";
import resetPasswordHandler from "@/pages/api/v1/auth/reset-password";
import meHandler from "@/pages/api/v1/auth/me";

const VALID_REGISTRATION = {
  fullName: "Ada Obi",
  email: "Ada@Example.com",
  phone: "+2348012345678",
  password: "Str0ngPass",
  confirmPassword: "Str0ngPass",
  consentAccepted: true,
};

function lastEmailLink(key: "verifyUrl" | "resetUrl"): string {
  const calls = vi.mocked(sendEmail).mock.calls;
  return calls[calls.length - 1][0].templateData[key] as string;
}

async function register(body: Record<string, unknown> = VALID_REGISTRATION) {
  const call = mockApiCall({ method: "POST", body });
  await registerHandler(call.req, call.res);
  return call;
}

async function login(email: string, password: string) {
  const call = mockApiCall({ method: "POST", body: { email, password } });
  await loginHandler(call.req, call.res);
  return call;
}

describe("Regression: registration, verification and login (audit A1–A5)", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.clearAllMocks();
    db.current = new FakeSupabase();
  });

  it("registers a guest: auth identity + unverified profile + verification email", async () => {
    const call = await register();

    expect(call.status()).toBe(201);
    expect(db.current.authUsers).toHaveLength(1);
    const [profile] = db.current.rows("users");
    expect(profile).toMatchObject({ email: "ada@example.com", phone: "+2348012345678" });
    expect(profile.is_email_verified).toBeFalsy();
    expect(lastEmailLink("verifyUrl")).toMatch(/\/verify-email\?token=/);
  });

  it("returns 409 for an existing email and never invents a user id", async () => {
    await register();
    const second = await register();

    expect(second.status()).toBe(409);
    expect(db.current.rows("users")).toHaveLength(1);
  });

  it("returns 409 when only the auth identity exists (orphan from an earlier failure)", async () => {
    await db.current.client.auth.admin.createUser({
      email: "ada@example.com",
      password: "x",
      email_confirm: false,
    });

    const call = await register();

    expect(call.status()).toBe(409);
    expect(db.current.rows("users")).toHaveLength(0);
  });

  it("verifies email only with the emailed single-use token", async () => {
    await register();
    const token = new URL(lastEmailLink("verifyUrl")).searchParams.get("token")!;

    const forged = mockApiCall({
      method: "POST",
      body: {
        token: Buffer.from(`${db.current.rows("users")[0].id}:${Date.now()}`).toString("base64url"),
      },
    });
    await verifyEmailHandler(forged.req, forged.res);
    expect(forged.status()).toBe(400);

    const ok = mockApiCall({ method: "POST", body: { token } });
    await verifyEmailHandler(ok.req, ok.res);
    expect(ok.status()).toBe(200);
    expect(db.current.rows("users")[0].is_email_verified).toBe(true);

    const replay = mockApiCall({ method: "POST", body: { token } });
    await verifyEmailHandler(replay.req, replay.res);
    expect(replay.status()).toBe(400);
  });

  it("logs in with a real Supabase session cookie that authenticates /auth/me", async () => {
    await register();
    const call = await login("ada@example.com", "Str0ngPass");

    expect(call.status()).toBe(200);
    const accessToken = cookieValue(call.header("set-cookie"), "gar_access_token");
    expect(accessToken).toMatch(/^access-/);
    expect(accessToken).not.toMatch(/^gar_jwt_/);

    const me = mockApiCall({ cookies: { gar_access_token: accessToken! } });
    await meHandler(me.req, me.res);
    expect(me.status()).toBe(200);
    expect(me.body().data.email).toBe("ada@example.com");
  });

  it("refreshes an expired access token transparently from the refresh cookie", async () => {
    await register();
    const call = await login("ada@example.com", "Str0ngPass");
    const refreshToken = cookieValue(call.header("set-cookie"), "gar_refresh_token")!;

    const me = mockApiCall({
      cookies: { gar_access_token: "expired-token", gar_refresh_token: refreshToken },
    });
    await meHandler(me.req, me.res);

    expect(me.status()).toBe(200);
    expect(cookieValue(me.header("set-cookie"), "gar_access_token")).toMatch(/^access-/);
  });

  it("locks the account after 5 failed attempts", async () => {
    await register();
    for (let i = 0; i < 4; i++) {
      expect((await login("ada@example.com", "WrongPass1")).status()).toBe(401);
    }
    const fifth = await login("ada@example.com", "WrongPass1");
    expect(fifth.status()).toBe(423);

    const correctWhileLocked = await login("ada@example.com", "Str0ngPass");
    expect(correctWhileLocked.status()).toBe(423);
  });

  it("rejects forged password-reset tokens and accepts the emailed token once", async () => {
    await register();
    const userId = db.current.rows("users")[0].id;

    const forged = mockApiCall({
      method: "POST",
      body: {
        token: Buffer.from(`${userId}:${Date.now() + 3600_000}`).toString("base64url"),
        newPassword: "N3wPassword",
        confirmNewPassword: "N3wPassword",
      },
    });
    await resetPasswordHandler(forged.req, forged.res);
    expect(forged.status()).toBe(400);

    const forgot = mockApiCall({ method: "POST", body: { email: "ada@example.com" } });
    await forgotPasswordHandler(forgot.req, forgot.res);
    const token = new URL(lastEmailLink("resetUrl")).searchParams.get("token")!;

    const reset = mockApiCall({
      method: "POST",
      body: { token, newPassword: "N3wPassword", confirmNewPassword: "N3wPassword" },
    });
    await resetPasswordHandler(reset.req, reset.res);
    expect(reset.status()).toBe(200);
    expect((await login("ada@example.com", "N3wPassword")).status()).toBe(200);

    const replay = mockApiCall({
      method: "POST",
      body: { token, newPassword: "An0therPass", confirmNewPassword: "An0therPass" },
    });
    await resetPasswordHandler(replay.req, replay.res);
    expect(replay.status()).toBe(400);
  });
});

describe("Regression: login redirect allow-list (audit A7)", () => {
  it.each([
    ["/account", "/account"],
    ["/booking?room=abc", "/booking?room=abc"],
    ["https://evil.example", "/account"],
    ["//evil.example", "/account"],
    ["/\\evil.example", "/account"],
    [undefined, "/account"],
  ])("safeRedirectPath(%s) -> %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
