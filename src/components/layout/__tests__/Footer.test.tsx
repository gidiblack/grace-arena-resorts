import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import Footer from "../Footer";
import {
  NEWSLETTER_SUBSCRIBED_COOKIE,
  clearNewsletterSubscribedCookie,
} from "@/services/newsletter/cookie";

vi.mock("@/lib/recaptcha/client", () => ({
  getRecaptchaToken: vi.fn().mockResolvedValue("test-recaptcha-token"),
}));

describe("Footer Newsletter CTA section", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearNewsletterSubscribedCookie();
  });

  afterEach(() => {
    cleanup();
    clearNewsletterSubscribedCookie();
  });

  it("renders the join newsletter CTA section when the user has not subscribed (no cookie)", () => {
    renderWithChakra(<Footer />);

    expect(screen.getByTestId("newsletter-cta-section")).toBeInTheDocument();
    expect(screen.getByText("Subscribe to GAR Special Retreats & Deals")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join newsletter/i })).toBeInTheDocument();
  });

  it("hides the join newsletter CTA section when gar_newsletter_subscribed cookie is true", async () => {
    document.cookie = `${NEWSLETTER_SUBSCRIBED_COOKIE}=true; path=/`;

    renderWithChakra(<Footer />);

    await waitFor(() => {
      expect(screen.queryByTestId("newsletter-cta-section")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Subscribe to GAR Special Retreats & Deals")
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /join newsletter/i })).not.toBeInTheDocument();
    });
  });

  it("submits email, sets cookie, hides CTA section, and displays confirmation", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { message: "Please check your inbox to confirm your newsletter subscription." },
      }),
    });

    renderWithChakra(<Footer />);

    const input = screen.getByPlaceholderText("Enter your email address");
    const submitBtn = screen.getByRole("button", { name: /join newsletter/i });

    fireEvent.change(input, { target: { value: "guest@example.com" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // CTA section should now be hidden
      expect(screen.queryByTestId("newsletter-cta-section")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Subscribe to GAR Special Retreats & Deals")
      ).not.toBeInTheDocument();

      // Post-subscription confirmation message should be displayed
      expect(
        screen.getByText(/Thank you for subscribing! Please check your email for confirmation./i)
      ).toBeInTheDocument();
    });

    // Verify cookie was set
    expect(document.cookie).toContain(`${NEWSLETTER_SUBSCRIBED_COOKIE}=true`);

    // Verify dismiss button works
    const dismissBtn = screen.getByLabelText("Dismiss confirmation");
    fireEvent.click(dismissBtn);

    expect(
      screen.queryByText(/Thank you for subscribing! Please check your email for confirmation./i)
    ).not.toBeInTheDocument();
  });

  it("shows an error and keeps CTA section visible when subscription fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { message: "Service unavailable. Please try again." },
      }),
    });

    renderWithChakra(<Footer />);

    const input = screen.getByPlaceholderText("Enter your email address");
    const submitBtn = screen.getByRole("button", { name: /join newsletter/i });

    fireEvent.change(input, { target: { value: "error@example.com" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Service unavailable. Please try again.")).toBeInTheDocument();
    });

    // CTA section should still be visible
    expect(screen.getByTestId("newsletter-cta-section")).toBeInTheDocument();
    // Cookie should NOT be set
    expect(document.cookie).not.toContain(`${NEWSLETTER_SUBSCRIBED_COOKIE}=true`);
  });

  it("reacts dynamically to custom events gar:newsletter-subscribed and gar:newsletter-unsubscribed", async () => {
    renderWithChakra(<Footer />);

    expect(screen.getByTestId("newsletter-cta-section")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent("gar:newsletter-subscribed"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("newsletter-cta-section")).not.toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("gar:newsletter-unsubscribed"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("newsletter-cta-section")).toBeInTheDocument();
    });
  });
});
