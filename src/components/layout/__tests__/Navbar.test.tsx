import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";

const routerState = vi.hoisted(() => ({
  pathname: "/",
  asPath: "/",
  isReady: false,
}));
vi.mock("next/router", () => ({
  useRouter: () => ({ ...routerState, push: vi.fn(), events: { on: vi.fn(), off: vi.fn() } }),
}));

import Navbar from "@/components/layout/Navbar";

/** The active nav item renders an underline <span> inside its label */
function isNavItemActive(label: string): boolean {
  const labelEl = screen.getAllByText(label)[0];
  return labelEl.querySelector("span") !== null;
}

describe("Regression: Navbar active link is hydration-safe (T5)", () => {
  beforeEach(() => {
    routerState.pathname = "/";
    routerState.asPath = "/";
    routerState.isReady = false;
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
