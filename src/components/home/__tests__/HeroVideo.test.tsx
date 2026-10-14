import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import HeroVideo from "../HeroVideo";

describe("HeroVideo Component", () => {
  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
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
  });

  it("renders hero titles and sacred priority text", () => {
    renderWithChakra(<HeroVideo />);

    expect(
      screen.getByText(/A Serene Christian Retreat in Igbo-Ora, Nigeria/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Your Comfort,/i)).toBeInTheDocument();
    expect(screen.getByText(/Our Sacred Priority/i)).toBeInTheDocument();
  });

  it("renders CTAs linking to booking and rooms", () => {
    renderWithChakra(<HeroVideo />);

    const bookBtn = screen.getByRole("button", { name: /Book Your Stay/i });
    expect(bookBtn).toBeInTheDocument();

    const roomsBtn = screen.getByRole("button", { name: /Explore Rooms & Suites/i });
    expect(roomsBtn).toBeInTheDocument();
  });

  it("renders 4 Off-Beat Gems cards with titles", () => {
    renderWithChakra(<HeroVideo />);

    expect(screen.getByText(/Luxurious Accommodations/i)).toBeInTheDocument();
    expect(screen.getByText(/Exquisite Dining/i)).toBeInTheDocument();
    expect(screen.getByText(/The Prayer Hut/i)).toBeInTheDocument();
    expect(screen.getByText(/Serene Pool & Wellness/i)).toBeInTheDocument();
  });

  it("respects prefers-reduced-motion by omitting autoplay video", () => {
    // Mock prefers-reduced-motion: reduce
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderWithChakra(<HeroVideo />);
    expect(screen.queryByTestId("hero-video-player")).not.toBeInTheDocument();
  });
});
