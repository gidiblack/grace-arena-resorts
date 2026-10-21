import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";

const routerState = vi.hoisted(() => ({
  pathname: "/admin",
  asPath: "/admin",
  isReady: true,
}));

vi.mock("next/router", () => ({
  useRouter: () => ({
    ...routerState,
    push: vi.fn(),
    events: { on: vi.fn(), off: vi.fn() },
  }),
}));

import { AdminSidebar } from "../AdminSidebar";

describe("AdminSidebar Component", () => {
  beforeEach(() => {
    routerState.pathname = "/admin";
    routerState.asPath = "/admin";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the GAR logo with grace_arena_logo-dark.svg replacing 'GAR ADMIN' text", () => {
    renderWithChakra(<AdminSidebar userRole="super_admin" />);

    // Logo image is present
    const logoImg = screen.getByAltText("Grace Arena Resorts Logo");
    expect(logoImg).toBeInTheDocument();
    expect(logoImg.getAttribute("src")).toContain("grace_arena_logo-dark.svg");

    // The old "GAR ADMIN" text heading is NOT present
    expect(screen.queryByText("GAR ADMIN")).not.toBeInTheDocument();
  });

  it("renders standalone Dashboard and the 4 dropdown sections for super_admin", () => {
    renderWithChakra(<AdminSidebar userRole="super_admin" />);

    // Standalone Dashboard link
    expect(screen.getByRole("link", { name: /Dashboard/i })).toBeInTheDocument();

    // Section toggles
    expect(screen.getByRole("button", { name: /Operations/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hospitality/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Engagement/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Administration/i })).toBeInTheDocument();
  });

  it("toggles section dropdowns when clicked", () => {
    renderWithChakra(<AdminSidebar userRole="super_admin" />);

    // Initially Hospitality items may be collapsed
    const hospitalityBtn = screen.getByRole("button", { name: /Hospitality/i });
    expect(screen.queryByRole("link", { name: /Restaurants/i })).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(hospitalityBtn);
    expect(screen.getByRole("link", { name: /Restaurants/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Facilities/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Off-beat Gems/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Event & Inquiries/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Deals & Promos/i })).toBeInTheDocument();

    // Click to close
    fireEvent.click(hospitalityBtn);
    expect(screen.queryByRole("link", { name: /Restaurants/i })).not.toBeInTheDocument();
  });

  it("auto-expands the section that contains the active route", () => {
    routerState.pathname = "/admin/bookings";
    routerState.asPath = "/admin/bookings";

    renderWithChakra(<AdminSidebar userRole="super_admin" />);

    // Operations section should automatically be expanded
    expect(screen.getByRole("link", { name: /Bookings/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Rooms & Suites/i })).toBeInTheDocument();
  });

  it("hides Administration section from non-super_admin users", () => {
    renderWithChakra(<AdminSidebar userRole="content_manager" />);

    expect(screen.queryByRole("button", { name: /Administration/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /User Management/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /System Settings/i })).not.toBeInTheDocument();
  });

  it("marks active page with aria-current='page'", () => {
    routerState.pathname = "/admin";
    routerState.asPath = "/admin";

    renderWithChakra(<AdminSidebar userRole="super_admin" />);

    const dashboardLink = screen.getByRole("link", { name: /Dashboard/i });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });

  it("calls onClose when the close icon button is clicked", () => {
    const onClose = vi.fn();
    renderWithChakra(<AdminSidebar userRole="super_admin" isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByRole("button", { name: /Close sidebar/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
