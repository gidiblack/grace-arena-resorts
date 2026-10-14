import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  passwordPolicy,
  registerSchema,
  changePasswordSchema,
  loginSchema,
} from "../schemas";

describe("Step 4: Authentication & User Profile Vertical Slice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Password Policy Schema", () => {
    it("rejects passwords shorter than 8 characters", () => {
      const res = passwordPolicy.safeParse("Pass1");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("at least 8 characters");
      }
    });

    it("rejects passwords missing an uppercase letter", () => {
      const res = passwordPolicy.safeParse("password123");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("uppercase letter");
      }
    });

    it("rejects passwords missing a lowercase letter", () => {
      const res = passwordPolicy.safeParse("PASSWORD123");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("lowercase letter");
      }
    });

    it("rejects passwords missing a number", () => {
      const res = passwordPolicy.safeParse("PasswordOnly");
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("at least one number");
      }
    });

    it("accepts strong valid passwords meeting all criteria", () => {
      const res = passwordPolicy.safeParse("GraceResort2026!");
      expect(res.success).toBe(true);
    });
  });

  describe("Register Schema Validation", () => {
    it("enforces NDPR consent checkbox", () => {
      const res = registerSchema.safeParse({
        fullName: "Samuel Adebayo",
        email: "samuel@example.com",
        phone: "+2348012345678",
        password: "ValidPassword1",
        confirmPassword: "ValidPassword1",
        consentAccepted: false,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("NDPR Privacy Policy");
      }
    });

    it("enforces Nigerian +234 phone number format", () => {
      const res = registerSchema.safeParse({
        fullName: "Samuel Adebayo",
        email: "samuel@example.com",
        phone: "08012345678", // Missing +234 country code
        password: "ValidPassword1",
        confirmPassword: "ValidPassword1",
        consentAccepted: true,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain("+234");
      }
    });

    it("enforces password confirmation match", () => {
      const res = registerSchema.safeParse({
        fullName: "Samuel Adebayo",
        email: "samuel@example.com",
        phone: "+2348012345678",
        password: "ValidPassword1",
        confirmPassword: "DifferentPassword2",
        consentAccepted: true,
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("Passwords do not match");
      }
    });

    it("passes for completely valid registration entries", () => {
      const res = registerSchema.safeParse({
        fullName: "Rev. Emmanuel Okafor",
        email: "emmanuel@gracechurch.org",
        phone: "+2348033334444",
        password: "KingdomPeace2026!",
        confirmPassword: "KingdomPeace2026!",
        consentAccepted: true,
      });

      expect(res.success).toBe(true);
    });
  });

  describe("Change Password Schema", () => {
    it("rejects if newPassword does not match confirmNewPassword", () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: "OldPassword1",
        newPassword: "NewPassword1",
        confirmNewPassword: "MismatchPassword1",
      });

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toBe("Passwords do not match");
      }
    });

    it("accepts valid password change submission", () => {
      const res = changePasswordSchema.safeParse({
        currentPassword: "CurrentPass1",
        newPassword: "NextPass2026!",
        confirmNewPassword: "NextPass2026!",
      });

      expect(res.success).toBe(true);
    });
  });

  describe("Login Schema", () => {
    it("parses valid login input with rememberMe flag", () => {
      const res = loginSchema.safeParse({
        email: "guest@example.com",
        password: "SecretPassword1",
        rememberMe: true,
      });

      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.rememberMe).toBe(true);
      }
    });
  });
});
