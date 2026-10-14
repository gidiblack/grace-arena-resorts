import { describe, it, expect } from "vitest";
import { renderEmailTemplate } from "../templates";

describe("renderEmailTemplate", () => {
  it("renders newsletter confirmation email with confirmation URL", () => {
    const rendered = renderEmailTemplate("newsletter_confirmation", {
      confirmUrl: "https://example.com/confirm?token=xyz",
    });

    expect(rendered.subject).toContain("Confirm Your Newsletter Subscription");
    expect(rendered.html).toContain("https://example.com/confirm?token=xyz");
    expect(rendered.text).toContain("https://example.com/confirm?token=xyz");
  });

  it("renders inquiry acknowledgment email with guest name", () => {
    const rendered = renderEmailTemplate("inquiry_acknowledgment", {
      name: "David Adeleke",
    });

    expect(rendered.subject).toContain("We Received Your Message");
    expect(rendered.html).toContain("David Adeleke");
  });

  it("throws error for unsupported template", () => {
    expect(() =>
      renderEmailTemplate(
        "unsupported_template" as unknown as Parameters<typeof renderEmailTemplate>[0],
        {}
      )
    ).toThrow("Unsupported email template");
  });
});
