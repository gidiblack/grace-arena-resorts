import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";

const pushMock = vi.fn();
const routerState = vi.hoisted(() => ({
  pathname: "/",
  asPath: "/",
  isReady: false,
}));
vi.mock("next/router", () => ({
  useRouter: () => ({ ...routerState, push: pushMock, events: { on: vi.fn(), off: vi.fn() } }),
}));

import Navbar from "@/components/layout/Navbar";

/** The active nav item renders an underline <span> inside its label */
function isNavItemActive(label: string): boolean {
  const labelEl = screen.getAllByText(label)[0];
  return labelEl.querySelector("span") !== null;
}

describe("Regression: Navbar active link is hydration-safe (T5)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    routerState.pathname = "/";
    routerState.asPath = "/";
    routerState.isReady = false;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false }),
    });
  });

  it("matches the server render when the URL has a #hash (server never sees the hash)", () => {
    // Server/first render: router not ready
    routerState.asPath = "/#gallery";
    const { unmount } = renderWithChakra(<Navbar />);
    const serverActive = isNavItemActive("Home");
    unmount();

    // Client after hydration: router ready, asPath includes the hash
    routerState.isReady = true;
    renderWithChakra(<Navbar />);
    expect(serverActive).toBe(true);
    expect(isNavItemActive("Home")).toBe(true);
  });

  it("ignores query strings when matching the active link", () => {
    routerState.isReady = true;
    routerState.pathname = "/rooms";
    routerState.asPath = "/rooms?type=village#list";
    renderWithChakra(<Navbar />);
    expect(isNavItemActive("Home")).toBe(false);
    expect(screen.getAllByText(/Rooms/i).some((el) => el.querySelector("span") !== null)).toBe(
      true
    );
  });
});

describe("Navbar Fixes: Login, Light Routes & User Initials Avatar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockReset();
    routerState.pathname = "/";
    routerState.asPath = "/";
    routerState.isReady = true;
  });

  it("renders Login button in navbar when user is not logged in", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false }),
    });

    renderWithChakra(<Navbar />);

    const loginLinks = screen.getAllByText("Login");
    expect(loginLinks.length).toBeGreaterThan(0);
    const loginLink = loginLinks[0].closest("a");
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("removes outline from logo link", () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    });

    renderWithChakra(<Navbar />);
    const logoImg = screen.getAllByAltText("Grace Arena Resorts Logo")[0];
    const logoLink = logoImg.closest("a");
    expect(logoLink).toHaveStyle({ outline: "none" });
  });

  it("renders light navbar logo on light pages like /login and /register", () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false }),
    });

    routerState.pathname = "/login";
    routerState.asPath = "/login";

    renderWithChakra(<Navbar />);
    const logoImg = screen.getAllByAltText("Grace Arena Resorts Logo")[0];
    expect(logoImg).toBeInTheDocument();
  });

  it("renders user initials avatar and shows dropdown with Account Overview, Bookings, and Logout", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/v1/auth/me") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              id: "usr-123",
              email: "adeola@example.com",
              fullName: "Adeola Davies",
            },
          }),
        };
      }
      if (url === "/api/v1/auth/logout") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });

    renderWithChakra(<Navbar />);

    // Initials "AD" should appear for Adeola Davies
    await waitFor(() => {
      expect(screen.getByText("AD")).toBeInTheDocument();
    });

    // Dropdown should not be open initially
    expect(screen.queryByText("Account Overview")).not.toBeInTheDocument();

    // Click initials avatar to open dropdown
    fireEvent.click(screen.getByText("AD"));

    // Verify dropdown items
    expect(screen.getByText("Account Overview")).toBeInTheDocument();
    expect(screen.getByText("Bookings")).toBeInTheDocument();
    expect(screen.getByText("Logout")).toBeInTheDocument();

    // Click Logout and verify redirect to homepage "/"
    fireEvent.click(screen.getByText("Logout"));
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });
});
