import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, act } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";

type RouteHandler = (url: string) => void;

const eventHandlers: Record<string, RouteHandler[]> = {};

const routerState = vi.hoisted(() => ({
  asPath: "/admin",
  pathname: "/admin",
}));

vi.mock("next/router", () => ({
  useRouter: () => ({
    ...routerState,
    events: {
      on: (event: string, handler: RouteHandler) => {
        if (!eventHandlers[event]) eventHandlers[event] = [];
        eventHandlers[event].push(handler);
      },
      off: (event: string, handler: RouteHandler) => {
        if (eventHandlers[event]) {
          eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler);
        }
      },
    },
  }),
}));

import { AdminLoadingBar } from "../AdminLoadingBar";

describe("AdminLoadingBar Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k]);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("is initially hidden when not navigating", () => {
    renderWithChakra(<AdminLoadingBar />);
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("shows loading indicator when routeChangeStart fires and hides on routeChangeComplete", () => {
    renderWithChakra(<AdminLoadingBar />);

    // Trigger start
    act(() => {
      eventHandlers["routeChangeStart"]?.forEach((fn) => fn("/admin/bookings"));
    });

    expect(screen.getByText("Loading…")).toBeInTheDocument();

    // Trigger complete
    act(() => {
      eventHandlers["routeChangeComplete"]?.forEach((fn) => fn("/admin/bookings"));
    });

    // Advance past completion fadeout
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });
});
