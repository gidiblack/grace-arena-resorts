import { withApi } from "@/pages/api/v1/_shared/handler";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { getSupabaseAdminClient, createSupabaseAuthClient } from "@/lib/supabase/server";
import { verifyRecaptcha } from "@/pages/api/v1/_shared/recaptcha";
import { setSessionCookies } from "@/services/auth/session";
import { ok, fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

const MAX_FAILED_ATTEMPTS = 5;
const RECAPTCHA_AFTER_ATTEMPTS = 3;
const LOCKOUT_MS = 15 * 60 * 1000;

export default withApi(
  async (req, res) => {
    const { email, password, rememberMe, recaptchaToken } = req.body as LoginInput;
    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getSupabaseAdminClient();

    // 1. Lockout state lives in our profile table
    const { data: user, error } = await supabase
      .from("users")
      .select(
        "id, email, full_name, phone, role, is_email_verified, is_locked, failed_login_attempts, locked_until"
      )
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      logger.error("Error looking up user during login", { error });
      return fail(res, "INTERNAL_ERROR", "Login failed. Please try again.", 500);
    }

    if (!user) {
      return fail(res, "INVALID_CREDENTIALS", "Invalid email or password", 401);
    }

    // 2. Account lockout (5 failed attempts locks for 15 minutes)
    const now = new Date();
    if (user.is_locked && user.locked_until && now < new Date(user.locked_until)) {
      return fail(
        res,
        "ACCOUNT_LOCKED",
        "Your account has been temporarily locked due to too many failed attempts. Please try again in 15 minutes or reset your password.",
        423,
        { lockedUntil: user.locked_until }
      );
    }
    const failedAttempts = user.is_locked ? 0 : user.failed_login_attempts || 0;

    // 3. reCAPTCHA required after 3 failures
    if (failedAttempts >= RECAPTCHA_AFTER_ATTEMPTS) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, "login");
      if (!recaptchaResult.success) {
        return fail(
          res,
          "RECAPTCHA_REQUIRED",
          "Additional security verification required due to multiple failed login attempts.",
          400,
          { requiresRecaptcha: true }
        );
      }
    }

    // 4. Verify credentials with Supabase Auth on a per-request client (never the admin singleton)
    const { data: authData, error: authError } =
      await createSupabaseAuthClient().auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

    if (authError || !authData.session) {
      if (authError?.code === "email_not_confirmed") {
        // Accounts created before the auth fix were left unconfirmed in Supabase Auth
        return fail(
          res,
          "EMAIL_NOT_VERIFIED",
          "Please verify your email address before signing in. You can request a new link below.",
          403,
          { requiresVerification: true }
        );
      }

      if (authError && authError.code !== "invalid_credentials") {
        logger.error("Supabase sign-in failed unexpectedly", {
          code: authError.code,
          status: authError.status,
        });
        return fail(res, "AUTH_UNAVAILABLE", "Sign-in is temporarily unavailable", 503);
      }

      const newFailedCount = failedAttempts + 1;
      const isLocking = newFailedCount >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = isLocking ? new Date(now.getTime() + LOCKOUT_MS).toISOString() : null;

      await supabase
        .from("users")
        .update({
          failed_login_attempts: newFailedCount,
          is_locked: isLocking,
          locked_until: lockedUntil,
        })
        .eq("id", user.id);

      if (isLocking) {
        return fail(
          res,
          "ACCOUNT_LOCKED",
          "Your account has been temporarily locked due to too many failed attempts. Please try again in 15 minutes or reset your password.",
          423,
          { lockedUntil }
        );
      }

      return fail(res, "INVALID_CREDENTIALS", "Invalid email or password", 401, {
        failedAttempts: newFailedCount,
        requiresRecaptcha: newFailedCount >= RECAPTCHA_AFTER_ATTEMPTS,
      });
    }

    // 5. Success: reset counters and issue session cookies
    if (failedAttempts > 0 || user.is_locked) {
      await supabase
        .from("users")
        .update({ failed_login_attempts: 0, is_locked: false, locked_until: null })
        .eq("id", user.id);
    }

    setSessionCookies(res, authData.session, rememberMe);

    return ok(res, {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.is_email_verified,
      },
      expiresIn: authData.session.expires_in,
    });
  },
  {
    allowedMethods: ["POST"],
    bodySchema: loginSchema,
    rateLimit: {
      keyPrefix: "auth-login",
      maxRequests: 10,
      windowSeconds: 300,
    },
  }
);
