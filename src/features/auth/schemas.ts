import { z } from "zod";

/**
 * Strict password policy per GAR-SRS Section 4.1 & 5.3:
 * Minimum 8 characters, at least one uppercase letter, one lowercase letter, one number.
 */
export const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number");

/**
 * Guest registration schema including NDPR privacy consent checkbox
 */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(120, "Full name must not exceed 120 characters"),
    email: z.string().email("Please provide a valid email address"),
    phone: z
      .string()
      .regex(
        /^\+234\d{10}$/,
        "Phone number must be a valid Nigerian number in format: +234XXXXXXXXXX"
      ),
    password: passwordPolicy,
    confirmPassword: z.string(),
    consentAccepted: z.literal(true, {
      message: "You must accept the NDPR Privacy Policy to create an account",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Login schema with support for remember-me and reCAPTCHA threshold handling
 */
export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
  recaptchaToken: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Forgot password email request schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Password reset completion schema
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: passwordPolicy,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Authenticated password change schema for user profile settings
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordPolicy,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Profile update schema
 */
export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z
    .string()
    .regex(
      /^\+234\d{10}$/,
      "Phone number must be a valid Nigerian number in format: +234XXXXXXXXXX"
    )
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Resend email verification schema
 */
export const resendVerificationSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
