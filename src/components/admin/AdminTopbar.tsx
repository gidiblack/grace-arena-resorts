import React, { useState } from "react";
import {
  Flex,
  HStack,
  Text,
  Badge,
  IconButton,
  Icon,
  Link,
  Button,
} from "@chakra-ui/react";
import { FaBars, FaExternalLinkAlt, FaBell, FaSignOutAlt } from "react-icons/fa";
import type { AdminUserSession } from "@/lib/auth/admin-guard";

export interface AdminTopbarProps {
  user: AdminUserSession;
  onToggleSidebar?: () => void;
  notificationCount?: number;
}

const ROLE_LABELS: Record<string, { label: string; colorScheme: string }> = {
  super_admin: { label: "Super Admin", colorScheme: "red" },
  resort_admin: { label: "Resort Admin", colorScheme: "blue" },
  content_manager: { label: "Content Manager", colorScheme: "purple" },
};

export function AdminTopbar({ user, onToggleSidebar, notificationCount = 0 }: AdminTopbarProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const roleInfo = ROLE_LABELS[user.role] || { label: user.role, colorScheme: "gray" };

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
      px={6}
      py={3}
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      position="sticky"
      top={0}
      zIndex={100}
    >
      <HStack gap={3}>
        {onToggleSidebar && (
          <IconButton
            aria-label="Toggle sidebar"
            variant="ghost"
            display={{ base: "inline-flex", md: "none" }}
            onClick={onToggleSidebar}
            size="sm"
          >
            <Icon as={FaBars} />
          </IconButton>
        )}
        <HStack gap={2}>
          <Text fontWeight="semibold" color="gray.800" fontSize="sm">
            {user.fullName || user.email}
          </Text>
          <Badge
            colorScheme={roleInfo.colorScheme}
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

      <HStack gap={4}>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          display="flex"
          alignItems="center"
          fontSize="xs"
          color="gray.600"
          _hover={{ color: "blue.600", textDecoration: "none" }}
        >
          <Text mr={1.5}>View Site</Text>
          <Icon as={FaExternalLinkAlt} boxSize={2.5} />
        </Link>

        {/* Notification Bell */}
        <HStack position="relative" cursor="pointer" title={`${notificationCount} notifications`}>
          <IconButton
            aria-label="Notifications"
            variant="ghost"
            size="sm"
            color="gray.600"
            _hover={{ bg: "gray.100" }}
          >
            <Icon as={FaBell} boxSize={4} />
          </IconButton>
          {notificationCount > 0 && (
            <Badge
              position="absolute"
              top="-2px"
              right="-2px"
              colorScheme="red"
              borderRadius="full"
              fontSize="10px"
              px={1.5}
            >
              {notificationCount}
            </Badge>
          )}
        </HStack>

        <Button
          size="sm"
          variant="outline"
          colorScheme="gray"
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
