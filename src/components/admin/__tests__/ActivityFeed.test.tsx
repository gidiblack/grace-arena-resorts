import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { screen, fireEvent, cleanup } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import { ActivityFeed, type ActivityItem } from "../dashboard/ActivityFeed";

const mockActivities: ActivityItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: `act-${i + 1}`,
  type: i % 2 === 0 ? "booking_status" : "contact_submission",
  title: `Activity Title ${i + 1}`,
  description: `Activity Description ${i + 1}`,
  actor: i % 2 === 0 ? "Staff" : "System",
  timestamp: new Date(Date.now() - i * 60000).toISOString(),
}));

describe("ActivityFeed Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("reduces recent system activity to the last 5 by default", () => {
    renderWithChakra(<ActivityFeed activities={mockActivities} />);

    expect(screen.getByText("Activity Title 1")).toBeInTheDocument();
    expect(screen.getByText("Activity Title 5")).toBeInTheDocument();
    expect(screen.queryByText("Activity Title 6")).not.toBeInTheDocument();
    expect(screen.getByText("Last 5 events")).toBeInTheDocument();
    expect(screen.getByText("Show more")).toBeInTheDocument();
  });

  it("displays the next 5 when 'Show more' is clicked", () => {
    renderWithChakra(<ActivityFeed activities={mockActivities} />);

    // Click Show more
    const showMoreBtn = screen.getByText("Show more");
    fireEvent.click(showMoreBtn);

    // Now all 10 activities are shown
    expect(screen.getByText("Activity Title 1")).toBeInTheDocument();
    expect(screen.getByText("Activity Title 6")).toBeInTheDocument();
    expect(screen.getByText("Activity Title 10")).toBeInTheDocument();
    expect(screen.getByText("Last 10 events")).toBeInTheDocument();

    // Toggle back to Show less
    const showLessBtn = screen.getByText("Show less");
    fireEvent.click(showLessBtn);

    expect(screen.queryByText("Activity Title 6")).not.toBeInTheDocument();
    expect(screen.getByText("Show more")).toBeInTheDocument();
  });

  it("does not render 'Show more' if activities length <= 5", () => {
    renderWithChakra(<ActivityFeed activities={mockActivities.slice(0, 3)} />);

    expect(screen.getByText("Activity Title 1")).toBeInTheDocument();
    expect(screen.getByText("Activity Title 3")).toBeInTheDocument();
    expect(screen.queryByText("Show more")).not.toBeInTheDocument();
  });
});
