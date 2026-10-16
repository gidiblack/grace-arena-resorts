import React from "react";
import NextLink from "next/link";
import { Box, Flex, VStack, Text, Heading, Icon, Badge, Spinner } from "@chakra-ui/react";
import type { IconType } from "react-icons";

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  colorScheme?: string;
  subtitle?: string | React.ReactNode;
  href?: string;
  badge?: {
    label: string;
    colorScheme: string;
  };
  isLoading?: boolean;
}

export function MetricCard({
  title,
  value,
  icon,
  colorScheme = "blue",
  subtitle,
  href,
  badge,
  isLoading = false,
}: MetricCardProps) {
  const cardContent = (
    <Box
      bg="white"
      p={5}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
      transition="all 0.2s"
      _hover={href ? { transform: "translateY(-2px)", boxShadow: "md", borderColor: `${colorScheme}.300` } : undefined}
      cursor={href ? "pointer" : "default"}
      position="relative"
      overflow="hidden"
    >
      {/* Top color accent line */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="3px"
        bg={`${colorScheme}.500`}
      />

      <Flex justify="space-between" align="flex-start" mb={2}>
        <VStack align="flex-start" gap={1}>
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500" letterSpacing="wide">
            {title}
          </Text>
          {badge && (
            <Badge colorScheme={badge.colorScheme} fontSize="10px" px={2} py={0.5} borderRadius="full">
              {badge.label}
            </Badge>
          )}
        </VStack>

        <Flex
          w={10}
          h={10}
          borderRadius="md"
          align="center"
          justify="center"
          bg={`${colorScheme}.50`}
          color={`${colorScheme}.600`}
        >
          <Icon as={icon} boxSize={5} />
        </Flex>
      </Flex>

      {isLoading ? (
        <Flex py={3}>
          <Spinner size="sm" color={`${colorScheme}.500`} />
        </Flex>
      ) : (
        <Heading size="lg" fontWeight="extrabold" color="gray.800" mb={1}>
          {value}
        </Heading>
      )}

      {subtitle && (
        <Box fontSize="xs" color="gray.500" mt={2} pt={2} borderTopWidth="1px" borderColor="gray.100">
          {subtitle}
        </Box>
      )}
    </Box>
  );

  if (href) {
    return (
      <NextLink href={href} style={{ textDecoration: "none", display: "block" }}>
        {cardContent}
      </NextLink>
    );
  }

  return cardContent;
}

export default MetricCard;
