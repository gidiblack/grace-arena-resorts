import { defineRecipe } from "@chakra-ui/react";

export const buttonRecipe = defineRecipe({
  base: {
    fontWeight: "semibold",
    borderRadius: "8px",
    transition: "all 0.2s",
    width: "fit-content",
    cursor: "pointer",
    _hover: { transform: "scale(1.05)" },
  },
  variants: {
    variant: {
      primary: {
        bg: "accent.500",
        color: "dark.500",
        _hover: { bg: "accent.500", opacity: 0.9 },
      },
      secondary: {
        bg: "dark.400",
        color: "light.500",
        _hover: { bg: "dark.400", opacity: 0.9 },
      },
      white: {
        bg: "light.500",
        color: "dark.500",
        _hover: { bg: "light.500", opacity: 0.9 },
      },
      outline: {
        bg: "transparent",
        border: "1px solid accent.500",
        color: "light.500",
        _hover: { opacity: 0.9 },
      },
    },
    size: {
      sm: {
        fontSize: "12px",
        paddingX: 6,
        paddingY: 2,
        fontWeight: "medium",
      },
      md: {
        fontSize: "14px",
        paddingX: 8,
        paddingY: 3,
        borderRadius: "10px",
      },
      lg: {
        fontSize: "16px",
        paddingX: 10,
        paddingY: 4,
        fontWeight: "bold",
        borderRadius: "12px",
      },
      xl: {
        fontSize: "18px",
        paddingX: 12,
        paddingY: 5,
        fontWeight: "bold",
        borderRadius: "14px",
      },
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});
