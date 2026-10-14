import React from "react";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";

interface RoomFilterBarProps {
  selectedCampus: "all" | "elysian" | "village";
  onCampusChange: (campus: "all" | "elysian" | "village") => void;
  selectedTier: string;
  onTierChange: (tier: string) => void;
  totalRoomsCount: number;
  elysianCount: number;
  villageCount: number;
}

const TIERS = ["all", "Standard", "Deluxe", "Premium", "Executive", "Presidential", "Royal"];

export const RoomFilterBar: React.FC<RoomFilterBarProps> = ({
  selectedCampus,
  onCampusChange,
  selectedTier,
  onTierChange,
  totalRoomsCount,
  elysianCount,
  villageCount,
}) => {
  return (
    <Box
      bg="#0F172A"
      borderBottom="1px solid #1E293B"
      px={{ base: 4, md: 8 }}
      py={4}
      position="sticky"
      top="64px"
      zIndex={20}
    >
      <Flex
        maxW="82rem"
        mx="auto"
        flexDir={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        gap={4}
      >
        {/* Campus Selector - Full Width on Mobile (SRS Step 7 requirement) */}
        <Flex
          w={{ base: "full", md: "auto" }}
          bg="#1E293B"
          p={1}
          borderRadius="12px"
          gap={1}
          justify="space-between"
          role="tablist"
          aria-label="Filter by resort campus"
        >
          <Box
            as="button"
            role="tab"
            aria-selected={selectedCampus === "all"}
            onClick={() => onCampusChange("all")}
            flex={{ base: 1, md: "initial" }}
            px={{ base: 2, md: 4 }}
            py={2}
            borderRadius="8px"
            fontSize={{ base: "12px", md: "13px" }}
            fontWeight="bold"
            bg={selectedCampus === "all" ? "accent.500" : "transparent"}
            color={selectedCampus === "all" ? "dark.500" : "gray.300"}
            cursor="pointer"
            textAlign="center"
            transition="all 0.2s"
          >
            All ({totalRoomsCount})
          </Box>
          <Box
            as="button"
            role="tab"
            aria-selected={selectedCampus === "elysian"}
            onClick={() => onCampusChange("elysian")}
            flex={{ base: 1, md: "initial" }}
            px={{ base: 2, md: 4 }}
            py={2}
            borderRadius="8px"
            fontSize={{ base: "12px", md: "13px" }}
            fontWeight="bold"
            bg={selectedCampus === "elysian" ? "accent.500" : "transparent"}
            color={selectedCampus === "elysian" ? "dark.500" : "gray.300"}
            cursor="pointer"
            textAlign="center"
            transition="all 0.2s"
          >
            Elysian ({elysianCount})
          </Box>
          <Box
            as="button"
            role="tab"
            aria-selected={selectedCampus === "village"}
            onClick={() => onCampusChange("village")}
            flex={{ base: 1, md: "initial" }}
            px={{ base: 2, md: 4 }}
            py={2}
            borderRadius="8px"
            fontSize={{ base: "12px", md: "13px" }}
            fontWeight="bold"
            bg={selectedCampus === "village" ? "accent.500" : "transparent"}
            color={selectedCampus === "village" ? "dark.500" : "gray.300"}
            cursor="pointer"
            textAlign="center"
            transition="all 0.2s"
          >
            Village ({villageCount})
          </Box>
        </Flex>

        {/* Tier Selector */}
        <HStack
          gap={2}
          overflowX="auto"
          w={{ base: "full", md: "auto" }}
          py={{ base: 1, md: 0 }}
          role="radiogroup"
          aria-label="Filter by room tier"
        >
          <Text
            fontSize="12px"
            color="gray.400"
            display={{ base: "none", lg: "inline" }}
            whiteSpace="nowrap"
          >
            Tier:
          </Text>
          {TIERS.map((tier) => (
            <Box
              key={tier}
              as="button"
              role="radio"
              aria-checked={selectedTier === tier}
              onClick={() => onTierChange(tier)}
              px={3}
              py={1.5}
              borderRadius="full"
              fontSize="12px"
              fontWeight="semibold"
              border="1px solid"
              borderColor={selectedTier === tier ? "accent.500" : "#334155"}
              bg={selectedTier === tier ? "rgba(252, 202, 70, 0.15)" : "transparent"}
              color={selectedTier === tier ? "accent.500" : "gray.300"}
              cursor="pointer"
              whiteSpace="nowrap"
              transition="all 0.15s"
            >
              {tier === "all" ? "All Tiers" : tier}
            </Box>
          ))}
        </HStack>
      </Flex>
    </Box>
  );
};

export default RoomFilterBar;
