"use client";

import { createSystem, defaultConfig } from "@chakra-ui/react";

const colors = {
  accent: { 400: { value: "#E7B81E" }, 500: { value: "#FCCA46" }, 600: { value: "#FFD700" } },
  white: { 500: { value: "#F1F5F9" } },
  dark: { 100: { value: "#C4C4C4" }, 300: { value: "#33332F" }, 400: { value: "#30302E" }, 500: { value: "#070707" } },
};

export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors,
    },
    breakpoints: {
      sm: "412px",
      md: "768px",
      lg: "992px",
      xl: "1274px",
      "2xl": "1400px",
      "3xl": "1536px",
    },
  },
});
