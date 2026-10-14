import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import Lightbox, { LightboxImage } from "../Lightbox";

const TEST_IMAGES: LightboxImage[] = [
  { src: "/img1.jpg", alt: "First Photo", title: "Photo 1", category: "Dining" },
  { src: "/img2.jpg", alt: "Second Photo", title: "Photo 2", category: "Pool" },
];

describe("Lightbox Component", () => {
  it("does not render when isOpen is false", () => {
    renderWithChakra(
      <Lightbox
        isOpen={false}
        onClose={vi.fn()}
        images={TEST_IMAGES}
        currentIndex={0}
        onNavigate={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders active image and title when isOpen is true", () => {
    renderWithChakra(
      <Lightbox
        isOpen={true}
        onClose={vi.fn()}
        images={TEST_IMAGES}
        currentIndex={0}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText("Photo 1")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
    expect(screen.getAllByText(/1 of 2/i).length).toBeGreaterThan(0);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    renderWithChakra(
      <Lightbox
        isOpen={true}
        onClose={onClose}
        images={TEST_IMAGES}
        currentIndex={0}
        onNavigate={vi.fn()}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onNavigate with next index when ArrowRight is pressed", () => {
    const onNavigate = vi.fn();
    renderWithChakra(
      <Lightbox
        isOpen={true}
        onClose={vi.fn()}
        images={TEST_IMAGES}
        currentIndex={0}
        onNavigate={onNavigate}
      />
    );

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("calls onNavigate with previous index when ArrowLeft is pressed", () => {
    const onNavigate = vi.fn();
    renderWithChakra(
      <Lightbox
        isOpen={true}
        onClose={vi.fn()}
        images={TEST_IMAGES}
        currentIndex={1}
        onNavigate={onNavigate}
      />
    );

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onNavigate).toHaveBeenCalledWith(0);
  });
});
