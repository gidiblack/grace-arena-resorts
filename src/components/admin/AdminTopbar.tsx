import React, { useState } from "react";
import NextLink from "next/link";
import {
  Flex,
  HStack,
  Text,
  Badge,
  IconButton,
  Icon,
  Link,
  Button,
  Box,
  Menu,
} from "@chakra-ui/react";
import { FaBars, FaExternalLinkAlt, FaBell, FaSignOutAlt } from "react-icons/fa";
import type { AdminUserSession } from "@/lib/auth/admin-guard";
import type { AdminNotificationCounts } from "@/services/analytics/analytics-service";

export interface AdminTopbarProps {
  user: AdminUserSession;
  onToggleSidebar?: () => void;
  notifications?: AdminNotificationCounts | null;
  notificationsFailed?: boolean;
}

const ROLE_LABELS: Record<string, { label: string; colorPalette: string }> = {
  super_admin: { label: "Super Admin", colorPalette: "red" },
  resort_admin: { label: "Resort Admin", colorPalette: "blue" },
  content_manager: { label: "Content Manager", colorPalette: "purple" },
};

function notificationLinks(counts: AdminNotificationCounts) {
  return [
    {
      key: "pending",
      label: "Pending bookings",
      count: counts.pendingBookings,
      href: "/admin/bookings?status=pending",
    },
    ...(counts.refundsToProcess !== undefined
      ? [
          {
            key: "refunds",
            label: "Refunds to process",
            count: counts.refundsToProcess,
            href: "/admin/bookings?refundQueue=true",
          },
        ]
      : []),
    {
      key: "contact",
      label: "Unread contact messages",
      count: counts.unreadContactSubmissions,
      href: "/admin/contact",
    },
    {
      key: "inquiries",
      label: "New event inquiries",
      count: counts.unreadEventInquiries,
      href: "/admin/events",
    },
  ];
}

export function AdminTopbar({
  user,
  onToggleSidebar,
  notifications,
  notificationsFailed = false,
}: AdminTopbarProps) {
  const notificationCount = notifications?.count ?? 0;
  const [loggingOut, setLoggingOut] = useState(false);

  const roleInfo = ROLE_LABELS[user.role] || { label: user.role, colorPalette: "gray" };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Continue with redirect even if request fails
    }
    window.location.href = "/login";
  };

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      px={{ base: 3, sm: 4, md: 6 }}
      py={3}
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      flexShrink={0}
      position="sticky"
      top={0}
      zIndex={20}
    >
      <HStack gap={{ base: 2, md: 3 }}>
        {onToggleSidebar && (
          <IconButton
            aria-label="Toggle sidebar"
            variant="ghost"
            display={{ base: "inline-flex", xl: "none" }}
            onClick={onToggleSidebar}
            size="sm"
          >
            <Icon as={FaBars} />
          </IconButton>
        )}
        <HStack gap={2} display={{ base: "none", md: "flex" }}>
          <Text fontWeight="semibold" color="gray.800" fontSize="sm">
            {user.fullName || user.email}
          </Text>
          <Badge
            colorPalette={roleInfo.colorPalette}
            variant="subtle"
            fontSize="xs"
            px={2}
            py={0.5}
            borderRadius="full"
          >
            {roleInfo.label}
          </Badge>
        </HStack>
      </HStack>

      <HStack gap={{ base: 2, sm: 3, md: 4 }}>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View Site"
          display="flex"
          alignItems="center"
          fontSize="xs"
          color="gray.600"
          _hover={{ color: "blue.600", textDecoration: "none" }}
        >
          <Text mr={1.5} display={{ base: "none", sm: "inline" }}>View Site</Text>
          <Icon as={FaExternalLinkAlt} boxSize={2.5} />
        </Link>

        {/* Notification Bell: rendered without a Portal so it stays inside the admin light theme */}
        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Box position="relative">
            <Menu.Trigger asChild>
              <IconButton
                aria-label={`Notifications (${notificationCount})`}
                variant="ghost"
                size="sm"
                color="gray.600"
                _hover={{ bg: "gray.100" }}
              >
                <Icon as={FaBell} boxSize={4} />
              </IconButton>
            </Menu.Trigger>
            {notificationCount > 0 && (
              <Badge
                position="absolute"
                top="-2px"
                right="-2px"
                colorPalette="red"
                variant="solid"
                borderRadius="full"
                fontSize="10px"
                px={1.5}
                pointerEvents="none"
              >
                {notificationCount}
              </Badge>
            )}
          </Box>
          <Menu.Positioner>
            <Menu.Content minW="240px">
              {notifications ? (
                notificationLinks(notifications).map((item) => (
                  <Menu.Item key={item.key} value={item.key} asChild>
                    <NextLink href={item.href}>
                      <Flex justify="space-between" w="full" gap={4}>
                        <Text fontSize="sm">{item.label}</Text>
                        <Badge colorPalette={item.count > 0 ? "red" : "gray"}>{item.count}</Badge>
                      </Flex>
                    </NextLink>
                  </Menu.Item>
                ))
              ) : (
                <Menu.Item value="status" disabled>
                  {notificationsFailed
                    ? "Couldn't load notifications. Retrying shortly."
                    : "Loading notifications…"}
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>

        <Button
          aria-label="Logout"
          size={{ base: "xs", md: "sm" }}
          px={{ base: 2.5, md: 3 }}
          variant="outline"
          colorPalette="gray"
          onClick={handleLogout}
          loading={loggingOut}
        >
          <HStack gap={1.5}>
            <Icon as={FaSignOutAlt} boxSize={3} />
            <Text display={{ base: "none", sm: "inline" }}>Logout</Text>
          </HStack>
        </Button>
      </HStack>
    </Flex>
  );
}

export default AdminTopbar;
