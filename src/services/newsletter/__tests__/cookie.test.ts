import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  NEWSLETTER_SUBSCRIBED_COOKIE,
  NEWSLETTER_COOKIE_MAX_AGE,
  isNewsletterSubscribed,
  setNewsletterSubscribedCookie,
  clearNewsletterSubscribedCookie,
  createNewsletterSubscribedSetCookie,
} from "../cookie";

describe("Newsletter Cookie Service", () => {
  beforeEach(() => {
    // Clear cookies before each test
    document.cookie = `${NEWSLETTER_SUBSCRIBED_COOKIE}=; path=/; max-age=0`;
  });

  describe("isNewsletterSubscribed", () => {
    it("returns false when no cookie is present", () => {
      expect(isNewsletterSubscribed()).toBe(false);
    });

    it("returns true when gar_newsletter_subscribed=true is present in document.cookie", () => {
      document.cookie = `${NEWSLETTER_SUBSCRIBED_COOKIE}=true; path=/`;
      expect(isNewsletterSubscribed()).toBe(true);
    });

    it("returns false when gar_newsletter_subscribed is false or different value", () => {
      document.cookie = `${NEWSLETTER_SUBSCRIBED_COOKIE}=false; path=/`;
      expect(isNewsletterSubscribed()).toBe(false);
    });

    it("parses from an explicit cookie string parameter", () => {
      expect(isNewsletterSubscribed("foo=1; gar_newsletter_subscribed=true; bar=2")).toBe(true);
      expect(isNewsletterSubscribed("foo=1; gar_newsletter_subscribed=false")).toBe(false);
      expect(isNewsletterSubscribed("")).toBe(false);
    });
  });

  describe("setNewsletterSubscribedCookie", () => {
    it("sets document.cookie and dispatches gar:newsletter-subscribed event", () => {
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");
      setNewsletterSubscribedCookie();

      expect(document.cookie).toContain(`${NEWSLETTER_SUBSCRIBED_COOKIE}=true`);
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "gar:newsletter-subscribed" })
      );
      dispatchSpy.mockRestore();
    });
  });

  describe("clearNewsletterSubscribedCookie", () => {
    it("clears the cookie and dispatches gar:newsletter-unsubscribed event", () => {
      document.cookie = `${NEWSLETTER_SUBSCRIBED_COOKIE}=true; path=/`;
      expect(isNewsletterSubscribed()).toBe(true);

      const dispatchSpy = vi.spyOn(window, "dispatchEvent");
      clearNewsletterSubscribedCookie();

      expect(isNewsletterSubscribed()).toBe(false);
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "gar:newsletter-unsubscribed" })
      );
      dispatchSpy.mockRestore();
    });
  });

  describe("createNewsletterSubscribedSetCookie", () => {
    it("creates a valid Set-Cookie string with maxAge for subscription", () => {
      const header = createNewsletterSubscribedSetCookie(true);
      expect(header).toContain(`${NEWSLETTER_SUBSCRIBED_COOKIE}=true`);
      expect(header).toContain(`Max-Age=${NEWSLETTER_COOKIE_MAX_AGE}`);
      expect(header).toContain("Path=/");
      expect(header).toContain("SameSite=Lax");
      expect(header).not.toContain("HttpOnly");
    });

    it("creates a clearing Set-Cookie string with Max-Age=0", () => {
      const header = createNewsletterSubscribedSetCookie(false);
      expect(header).toContain(`${NEWSLETTER_SUBSCRIBED_COOKIE}=;`);
      expect(header).toContain("Max-Age=0");
    });
  });
});
