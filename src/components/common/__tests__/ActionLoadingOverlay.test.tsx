import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, act } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import ActionLoadingOverlay, {
  showActionLoading,
  hideActionLoading,
} from "../ActionLoadingOverlay";
import PublicActionLoadingHost from "../PublicActionLoadingHost";

describe("ActionLoadingOverlay", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("does not render when isOpen is false", () => {
    renderWithChakra(<ActionLoadingOverlay isOpen={false} />);
    expect(screen.queryByTestId("action-loading-overlay")).not.toBeInTheDocument();
  });

  it("does not render when isLoading is false", () => {
    renderWithChakra(<ActionLoadingOverlay isLoading={false} />);
    expect(screen.queryByTestId("action-loading-overlay")).not.toBeInTheDocument();
  });

  it("renders with a full backdrop overlay and centered breathing gar-icon-only.svg", () => {
    renderWithChakra(<ActionLoadingOverlay isOpen={true} message="Processing your request..." />);

    const overlay = screen.getByTestId("action-loading-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute("role", "status");
    expect(overlay).toHaveAttribute("aria-busy", "true");

    // The breathing icon
    const iconContainer = screen.getByTestId("gar-breathing-icon");
    expect(iconContainer).toBeInTheDocument();

    const img = iconContainer.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/gar-icon-only.svg");
    expect(img).toHaveAttribute("alt", "Grace Arena Resorts");

    // Message
    expect(screen.getByText("Processing your request...")).toBeInTheDocument();
  });

  it("locks document.body.style.overflow to hidden while open and restores on unmount", () => {
    expect(document.body.style.overflow).toBe("");

    const { unmount } = renderWithChakra(<ActionLoadingOverlay isOpen={true} />);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps scrolling locked until every overlapping overlay has closed", () => {
    const first = renderWithChakra(<ActionLoadingOverlay isOpen={true} />);
    const second = renderWithChakra(<ActionLoadingOverlay isOpen={true} />);

    first.unmount();
    expect(document.body.style.overflow).toBe("hidden");

    second.unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("PublicActionLoadingHost responds to showActionLoading and hideActionLoading", () => {
    renderWithChakra(<PublicActionLoadingHost />);

    // Initially closed
    expect(screen.queryByTestId("action-loading-overlay")).not.toBeInTheDocument();

    // Trigger show
    act(() => {
      showActionLoading("Submitting reservation...");
    });

    expect(screen.getByTestId("action-loading-overlay")).toBeInTheDocument();
    expect(screen.getByText("Submitting reservation...")).toBeInTheDocument();

    // Trigger hide
    act(() => {
      hideActionLoading();
    });

    expect(screen.queryByTestId("action-loading-overlay")).not.toBeInTheDocument();
  });
});
