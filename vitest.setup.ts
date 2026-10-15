import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Populate minimum test environment variables
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "2348123456789";
process.env.RESEND_API_KEY = "re_mock_key_for_testing";
process.env.RESEND_FROM_EMAIL = "onboarding@resend.dev";
process.env.RESEND_REPLY_TO = "reservations@gracearenaresorts.com";
process.env.NEXT_PUBLIC_USE_MOCK_DATA = "true";

// Mock window.matchMedia for next-themes and Chakra UI in jsdom
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
