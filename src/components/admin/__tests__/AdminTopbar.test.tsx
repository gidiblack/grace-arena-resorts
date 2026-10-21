import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import { AdminTopbar } from "../AdminTopbar";
import type { AdminUserSession } from "@/lib/auth/admin-guard";

const mockUser: AdminUserSession = {
  id: "user-123",
  email: "admin@gracearena.com",
  fullName: "Grace Admin",
  role: "super_admin",
  isSuperAdmin: true,
  isResortAdmin: true,
  isContentManager: false,
};

describe("AdminTopbar Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders toggle button and triggers onToggleSidebar when clicked", () => {
    const onToggleSidebar = vi.fn();
    renderWithChakra(<AdminTopbar user={mockUser} onToggleSidebar={onToggleSidebar} />);

    const toggleBtn = screen.getByRole("button", { name: /Toggle sidebar/i });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it("renders user information and role badge", () => {
    renderWithChakra(<AdminTopbar user={mockUser} />);

    expect(screen.getByText("Grace Admin")).toBeInTheDocument();
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("renders logout button and view site link", () => {
    renderWithChakra(<AdminTopbar user={mockUser} />);

    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Site/i })).toBeInTheDocument();
  });
});
