import { withApi } from "../_shared/handler";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { sendVerificationEmail } from "@/services/auth/verification";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res) => {
    const { fullName, email, phone, password } = req.body as RegisterInput;
    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getSupabaseAdminClient();

    // 1. Reject duplicates (a lookup failure is an error, not "no user")
    const { data: existingUser, error: lookupError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupError) {
      logger.error("User lookup failed during registration", { error: lookupError });
      return fail(res, "REGISTRATION_FAILED", "Registration is temporarily unavailable", 503);
    }

    if (existingUser) {
      return fail(
        res,
        "EMAIL_ALREADY_EXISTS",
        "An account with this email address already exists",
        409
      );
    }

    // 2. Create the Supabase Auth identity (sole password store). The user is created
    // pre-confirmed so they can sign in; booking access is gated by public.users.is_email_verified.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });

    if (authError || !authData.user) {
      if (authError?.code === "email_exists" || authError?.status === 422) {
        return fail(
          res,
          "EMAIL_ALREADY_EXISTS",
          "An account with this email address already exists",
          409
        );
      }
      if (authError?.code === "weak_password") {
        return fail(res, "WEAK_PASSWORD", authError.message, 400);
      }
      logger.error("Supabase auth user creation error", { error: authError });
      return fail(res, "AUTH_CREATION_FAILED", "Failed to create your account", 500);
    }

    const userId = authData.user.id;

    // 3. The on_auth_user_created trigger creates the profile; upsert keeps phone/name
    // authoritative and covers environments where the trigger has not been deployed yet.
    const { error: profileError } = await supabase.from("users").upsert(
      {
        id: userId,
        email: normalizedEmail,
        full_name: fullName,
        phone,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      logger.error("Profile creation failed; rolling back auth user", { error: profileError });
      await supabase.auth.admin.deleteUser(userId);
      return fail(res, "REGISTRATION_FAILED", "Failed to create your account", 500);
    }

    // 4. Verification email (failure is non-fatal: the guest can resend from /verify-email)
    try {
      await sendVerificationEmail({ userId, email: normalizedEmail, fullName });
    } catch (error) {
      logger.error("Failed to issue verification email after registration", { error });
    }

    return ok(
      res,
      {
        userId,
        email: normalizedEmail,
        fullName,
        message: "Registration successful. Please verify your email to enable reservations.",
      },
      201
    );
  },
  {
    allowedMethods: ["POST"],
    bodySchema: registerSchema,
    rateLimit: {
      keyPrefix: "auth-register",
      maxRequests: 5,
      windowSeconds: 300,
    },
  }
);
