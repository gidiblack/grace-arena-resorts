import { describe, it, expect } from "vitest";
import { redactSensitiveData } from "../logger";

describe("redactSensitiveData", () => {
  it("redacts sensitive keys including token, secret, password, key", () => {
    const input = {
      user: "guest",
      password: "SuperSecretPassword123!",
      api_key: "key-12345",
      PAYSTACK_SECRET_KEY: "sk_test_12345",
      accessToken: "token_abc",
      metadata: {
        safeField: "safeValue",
        client_secret: "secret_xyz",
      },
    };

    const redacted = redactSensitiveData(input) as Record<string, unknown>;

    expect(redacted.user).toBe("guest");
    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.api_key).toBe("[REDACTED]");
    expect(redacted.PAYSTACK_SECRET_KEY).toBe("[REDACTED]");
    expect(redacted.accessToken).toBe("[REDACTED]");
    expect(redacted.metadata.safeField).toBe("safeValue");
    expect(redacted.metadata.client_secret).toBe("[REDACTED]");
  });

  it("handles primitives and null values safely", () => {
    expect(redactSensitiveData(null)).toBeNull();
    expect(redactSensitiveData("test")).toBe("test");
    expect(redactSensitiveData(123)).toBe(123);
  });
});
