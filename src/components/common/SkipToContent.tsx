import React from "react";
import { Link as ChakraLink } from "@chakra-ui/react";

interface SkipToContentProps {
  contentId?: string;
}

export const SkipToContent: React.FC<SkipToContentProps> = ({ contentId = "main-content" }) => {
  return (
    <ChakraLink
      href={`#${contentId}`}
      position="absolute"
      top="-40px"
      left="16px"
      bg="#2b6cb0"
      color="white"
      px={4}
      py={2}
      borderRadius="md"
      fontWeight="bold"
      fontSize="14px"
      zIndex={9999}
      transition="top 0.2s ease"
      _focus={{
        top: "16px",
        outline: "3px solid #ecc94b",
        outlineOffset: "2px",
      }}
    >
      Skip to main content
    </ChakraLink>
  );
};

export default SkipToContent;
