import React from "react";
import NextLink from "next/link";
import { Box, Flex, HStack, Text, Button, Icon } from "@chakra-ui/react";
import { FaPlus, FaTag, FaPhotoVideo, FaUndo } from "react-icons/fa";
import type { UserRole } from "@/types/db";

export interface QuickActionsProps {
  userRole: UserRole;
  refundsToProcessCount?: number;
}

export function QuickActions({ userRole, refundsToProcessCount = 0 }: QuickActionsProps) {
  const isContentManager = userRole === "content_manager";

  return (
    <Box bg="white" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.200" boxShadow="sm">
      <Flex
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "flex-start", sm: "center" }}
        gap={4}
      >
        <Box>
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            color="gray.500"
            letterSpacing="wide"
          >
            Quick Actions
          </Text>
          <Text fontSize="xs" color="gray.500" mt={0.5}>
            Common administrative workflows and shortcuts
          </Text>
        </Box>

        <HStack gap={3} wrap="wrap">
          {/* Create Booking (Disabled for Content Manager who has read-only bookings) */}
          {isContentManager ? (
            <Button
              size="sm"
              colorPalette="blue"
              variant="solid"
              disabled
              title="Content Managers have read-only access to bookings"
            >
              <HStack gap={1.5}>
                <Icon as={FaPlus} boxSize={3} />
                <Text>Create Booking</Text>
              </HStack>
            </Button>
          ) : (
            <NextLink href="/admin/bookings/new" style={{ textDecoration: "none" }}>
              <Button size="sm" colorPalette="blue" variant="solid">
                <HStack gap={1.5}>
                  <Icon as={FaPlus} boxSize={3} />
                  <Text>Create Booking</Text>
                </HStack>
              </Button>
            </NextLink>
          )}

          {/* Refunds Queue Shortcut */}
          {!isContentManager && refundsToProcessCount > 0 && (
            <NextLink href="/admin/bookings?refundQueue=true" style={{ textDecoration: "none" }}>
              <Button size="sm" colorPalette="purple" variant="outline">
                <HStack gap={1.5}>
                  <Icon as={FaUndo} boxSize={3} />
                  <Text>Process Refunds ({refundsToProcessCount})</Text>
                </HStack>
              </Button>
            </NextLink>
          )}

          {/* Add Deal */}
          <NextLink href="/admin/deals" style={{ textDecoration: "none" }}>
            <Button size="sm" variant="outline" colorPalette="blue">
              <HStack gap={1.5}>
                <Icon as={FaTag} boxSize={3} />
                <Text>Add Deal</Text>
              </HStack>
            </Button>
          </NextLink>

          {/* Upload Media */}
          <NextLink href="/admin/media" style={{ textDecoration: "none" }}>
            <Button size="sm" variant="outline" colorPalette="blue">
              <HStack gap={1.5}>
                <Icon as={FaPhotoVideo} boxSize={3} />
                <Text>Upload Media</Text>
              </HStack>
            </Button>
          </NextLink>
        </HStack>
      </Flex>
    </Box>
  );
}

export default QuickActions;
