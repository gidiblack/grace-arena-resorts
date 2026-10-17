import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import { AdminDialogHost, adminDialog } from "../AdminDialog";

afterEach(() => {
  cleanup();
});

describe("adminDialog", () => {
  it("resolves true on confirm and false on cancel", async () => {
    renderWithChakra(<AdminDialogHost />);

    let result: Promise<boolean>;
    act(() => {
      result = adminDialog.confirm({
        title: "Delete deal?",
        message: "Gone for good.",
        confirmLabel: "Delete Deal",
      });
    });
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Gone for good.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete Deal" }));
    await expect(result!).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    act(() => {
      result = adminDialog.confirm({ title: "Delete deal?", message: "Again." });
    });
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await expect(result!).resolves.toBe(false);
  });

  // Initial focus (Cancel for destructive confirms) needs real layout; it is checked in the browser.
  it("treats Escape as cancel", async () => {
    renderWithChakra(<AdminDialogHost />);

    let result: Promise<boolean>;
    act(() => {
      result = adminDialog.confirm({ title: "Lock account?", message: "x" });
    });
    await screen.findByRole("alertdialog");
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await expect(result!).resolves.toBe(false);
  });

  it("shows notices with a single OK button and queues requests in order", async () => {
    renderWithChakra(<AdminDialogHost />);

    let first: Promise<void>;
    let second: Promise<boolean>;
    act(() => {
      first = adminDialog.notify({ title: "URL copied", message: "On your clipboard." });
      second = adminDialog.confirm({ title: "Remove seasonal rate?", message: "y" });
    });

    expect(await screen.findByText("URL copied")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    await first!;

    expect(await screen.findByText("Remove seasonal rate?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await expect(second!).resolves.toBe(true);
  });

  it("fails safe (cancelled) when no host is mounted", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(adminDialog.confirm({ title: "t", message: "m" })).resolves.toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
