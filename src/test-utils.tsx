import React from "react";
import { render as rtlRender, RenderOptions } from "@testing-library/react";
import { Provider } from "@/components/ui/provider";

export function renderWithChakra(ui: React.ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return rtlRender(ui, {
    wrapper: ({ children }) => <Provider>{children}</Provider>,
    ...options,
  });
}
