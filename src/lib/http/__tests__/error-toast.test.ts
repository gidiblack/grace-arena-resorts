import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatErrorTitle,
  formatErrorDescription,
  showServerErrorToast,
  setupGlobalErrorToaster,
} from "../error-toast";
import { toaster } from "@/components/ui/toaster";

describe("error-toast utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatErrorTitle", () => {
    it("maps known error codes to friendly titles", () => {
      expect(formatErrorTitle("VALIDATION_ERROR")).toBe("Validation Error");
      expect(formatErrorTitle("INVALID_CREDENTIALS")).toBe("Authentication Failed");
      expect(formatErrorTitle("UNAUTHORIZED")).toBe("Authentication Required");
      expect(formatErrorTitle("FORBIDDEN")).toBe("Access Denied");
      expect(formatErrorTitle("NOT_FOUND")).toBe("Not Found");
      expect(formatErrorTitle("RATE_LIMIT_EXCEEDED")).toBe("Too Many Requests");
      expect(formatErrorTitle("ACCOUNT_LOCKED")).toBe("Account Locked");
      expect(formatErrorTitle("HOLD_EXPIRED")).toBe("Reservation Hold Expired");
      expect(formatErrorTitle("INTERNAL_ERROR")).toBe("Server Error");
      expect(formatErrorTitle("SERVICE_UNAVAILABLE")).toBe("Service Unavailable");
    });

    it("formats unknown snake_case error codes into Title Case", () => {
      expect(formatErrorTitle("PAYMENT_GATEWAY_TIMEOUT")).toBe("Payment Gateway Timeout");
      expect(formatErrorTitle("ROOM_UNAVAILABLE")).toBe("Room Unavailable");
    });

    it("maps HTTP status codes when code is missing", () => {
      expect(formatErrorTitle(undefined, 400)).toBe("Bad Request");
      expect(formatErrorTitle(undefined, 401)).toBe("Authentication Required");
      expect(formatErrorTitle(undefined, 403)).toBe("Access Denied");
      expect(formatErrorTitle(undefined, 404)).toBe("Resource Not Found");
      expect(formatErrorTitle(undefined, 429)).toBe("Too Many Requests");
      expect(formatErrorTitle(undefined, 500)).toBe("Internal Server Error");
      expect(formatErrorTitle(undefined, 503)).toBe("Service Unavailable");
      expect(formatErrorTitle(undefined, 502)).toBe("Bad Gateway");
    });

    it("falls back to Server Error", () => {
      expect(formatErrorTitle()).toBe("Server Error");
    });
  });

  describe("formatErrorDescription", () => {
    it("returns string errors directly", () => {
      expect(formatErrorDescription("Something went wrong")).toBe("Something went wrong");
    });

    it("extracts message from Error instance", () => {
      expect(formatErrorDescription(new Error("Database connection timed out"))).toBe(
        "Database connection timed out"
      );
    });

    it("extracts message from error envelope object", () => {
      expect(formatErrorDescription({ message: "Invalid email address provided" })).toBe(
        "Invalid email address provided"
      );
    });

    it("extracts message from nested error envelope", () => {
      expect(
        formatErrorDescription({
          error: { message: "Nested server error message" },
        })
      ).toBe("Nested server error message");
    });

    it("formats validation details array", () => {
      expect(
        formatErrorDescription({
          message: "Validation failed",
          details: [
            { field: "email", message: "Invalid email" },
            { field: "password", message: "Too short" },
          ],
        })
      ).toBe("email: Invalid email • password: Too short");
    });

    it("uses fallback message when error is empty or undefined", () => {
      expect(formatErrorDescription(null, "Custom fallback")).toBe("Custom fallback");
    });
  });

  describe("showServerErrorToast", () => {
    it("calls toaster.create with error type, formatted title and description", () => {
      const createSpy = vi.spyOn(toaster, "create");

      showServerErrorToast(
        { code: "VALIDATION_ERROR", message: "Please check your input." },
        { status: 400 }
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          title: "Validation Error",
          description: "Please check your input.",
          duration: 6000,
        })
      );
    });

    it("deduplicates identical error toasts within deduplication window", () => {
      const createSpy = vi.spyOn(toaster, "create");

      const err = { code: "INTERNAL_ERROR", message: "Unique error message for dedupe test" };
      showServerErrorToast(err);
      showServerErrorToast(err);

      expect(createSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("setupGlobalErrorToaster", () => {
    const originalFetch = window.fetch;

    beforeEach(() => {
      delete window.__gar_error_toaster_installed;
    });

    afterEach(() => {
      window.fetch = originalFetch;
      delete window.__gar_error_toaster_installed;
    });

    it("intercepts failing API requests and displays server error toast", async () => {
      const createSpy = vi.spyOn(toaster, "create");

      window.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        clone: () => ({
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            success: false,
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Invalid email or password",
            },
          }),
          text: async () => "",
        }),
      });

      setupGlobalErrorToaster();

      await window.fetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com" }),
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          title: "Authentication Failed",
          description: "Invalid email or password",
        })
      );
    });

    it("skips silent check for GET /api/v1/auth/me", async () => {
      const createSpy = vi.spyOn(toaster, "create");

      window.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        clone: () => ({
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            success: false,
            error: { code: "UNAUTHORIZED", message: "Authentication required" },
          }),
        }),
      });

      setupGlobalErrorToaster();

      await window.fetch("/api/v1/auth/me", { method: "GET" });

      expect(createSpy).not.toHaveBeenCalled();
    });

    it("skips toast when x-skip-error-toast header is provided", async () => {
      const createSpy = vi.spyOn(toaster, "create");

      window.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        clone: () => ({
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ error: { message: "Silent error" } }),
        }),
      });

      setupGlobalErrorToaster();

      await window.fetch("/api/v1/rooms", {
        headers: { "x-skip-error-toast": "true" },
      });

      expect(createSpy).not.toHaveBeenCalled();
    });

    it("intercepts network exceptions and displays network error toast", async () => {
      const createSpy = vi.spyOn(toaster, "create");

      window.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

      setupGlobalErrorToaster();

      await expect(window.fetch("/api/v1/contact")).rejects.toThrow("Failed to fetch");

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          title: "Network Error",
          description: "Failed to fetch",
        })
      );
    });
  });
});
