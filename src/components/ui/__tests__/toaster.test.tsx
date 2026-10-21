import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import { toaster, Toaster, showServerErrorToast } from "../toaster";

describe("Toaster Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("is configured with placement top-end for the top right corner", () => {
    expect(toaster.attrs.placement).toBe("top-end");
  });

  it("renders toaster and displays error toast with appropriate title and description", async () => {
    renderWithChakra(<Toaster />);

    showServerErrorToast({
      code: "HOLD_EXPIRED",
      message: "Your room reservation hold has expired. Please select rooms again.",
    });

    expect(await screen.findByText("Reservation Hold Expired")).toBeInTheDocument();
    expect(
      screen.getByText("Your room reservation hold has expired. Please select rooms again.")
    ).toBeInTheDocument();
  });
});
