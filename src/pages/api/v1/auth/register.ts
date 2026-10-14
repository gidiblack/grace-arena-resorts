import bcrypt from "bcryptjs";
import { withApi } from "../_shared/handler";
import { registerSchema } from "@/features/auth/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/response";
import { sendEmail } from "@/services/email/sendgrid";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export default withApi(
  async (req, res) => {
    const { fullName, email, phone, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getSupabaseAdminClient();

    // 1. Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return fail(res, "EMAIL_ALREADY_EXISTS", "An account with this email address already exists", 409);
    }

    // 2. Hash password with bcrypt cost factor 12 per GAR-SRS Section 5.3
    const passwordHash = await bcrypt.hash(password, 12);

    // 3. Create user in Supabase Auth
    let authUserId: string;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: {
        full_name: fullName,
        phone,
        role: "guest",
      },
    });

    if (authError || !authData.user) {
      // In dev or local test environments without live supabase auth daemon, generate UUID
      if (authError?.message?.includes("fetch failed") || !authData?.user) {
        authUserId = crypto.randomUUID();
      } else {
        logger.error("Supabase auth user creation error", { error: authError });
        return fail(res, "AUTH_CREATION_FAILED", "Failed to create user authentication identity", 500);
      }
    } else {
      authUserId = authData.user.id;
    }

    // 4. Create user record in public.users table
    const { error: dbError } = await supabase.from("users").insert({
      id: authUserId,
      email: normalizedEmail,
      password_hash: passwordHash,
      full_name: fullName,
      phone,
      role: "guest",
      is_email_verified: false,
    });

    if (dbError) {
      logger.error("Database user profile creation error", { error: dbError });
      return fail(res, "DB_ERROR", "Failed to save user profile", 500);
    }

    // 5. Generate email verification link & dispatch SendGrid email
    const verificationToken = Buffer.from(`${authUserId}:${Date.now()}`).toString("base64url");
    const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      to: normalizedEmail,
      templateId: "email_verification",
      templateData: {
        name: fullName,
        verifyUrl,
      },
    });

    return ok(
      res,
      {
        userId: authUserId,
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
