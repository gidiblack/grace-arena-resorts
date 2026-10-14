import React from "react";
import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import MapSection from "../MapSection";

describe("MapSection Component", () => {
  it("renders resort address, GPS coordinates, and directions CTA", () => {
    renderWithChakra(<MapSection />);

    expect(screen.getByText(/Located in Igbo-Ora/i)).toBeInTheDocument();
    expect(screen.getByText(/Grace Arena Resorts, Igbo-Ora/i)).toBeInTheDocument();
    expect(screen.getByText(/7.4333° N, 3.2833° E/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Get Driving Directions/i })).toBeInTheDocument();
  });

  it("switches to static fallback when static view button is clicked", () => {
    renderWithChakra(<MapSection />);

    const staticToggleBtn = screen.getByRole("button", { name: /View static fallback map/i });
    expect(staticToggleBtn).toBeInTheDocument();

    fireEvent.click(staticToggleBtn);

    expect(screen.getByTestId("map-static-fallback")).toBeInTheDocument();
    expect(screen.getByText(/Grace Arena Resorts Campus/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry Interactive Map/i })).toBeInTheDocument();
  });
});
