import React from "react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { Box, VStack, HStack, Text, Icon, Badge } from "@chakra-ui/react";
import {
  FaTachometerAlt,
  FaCalendarCheck,
  FaBed,
  FaFileAlt,
  FaUtensils,
  FaSwimmingPool,
  FaGem,
  FaGlassCheers,
  FaTags,
  FaEnvelope,
  FaNewspaper,
  FaPhotoVideo,
  FaUsers,
  FaCogs,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import type { UserRole } from "@/types/db";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: IconType;
  roles: UserRole[];
  isReady: boolean;
}

const SIDEBAR_NAV: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: FaTachometerAlt,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "bookings",
    label: "Bookings",
    href: "/admin/bookings",
    icon: FaCalendarCheck,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "rooms",
    label: "Rooms & Suites",
    href: "/admin/rooms",
    icon: FaBed,
    roles: ["resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "content",
    label: "Content CMS",
    href: "/admin/content",
    icon: FaFileAlt,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "restaurants",
    label: "Restaurants",
    href: "/admin/restaurants",
    icon: FaUtensils,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "facilities",
    label: "Facilities",
    href: "/admin/facilities",
    icon: FaSwimmingPool,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "gems",
    label: "Off-Beat Gems",
    href: "/admin/gems",
    icon: FaGem,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "events",
    label: "Events & Inquiries",
    href: "/admin/events",
    icon: FaGlassCheers,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "deals",
    label: "Deals & Promos",
    href: "/admin/deals",
    icon: FaTags,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "contact",
    label: "Contact Messages",
    href: "/admin/contact",
    icon: FaEnvelope,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "newsletter",
    label: "Newsletter",
    href: "/admin/newsletter",
    icon: FaNewspaper,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "media",
    label: "Media Library",
    href: "/admin/media",
    icon: FaPhotoVideo,
    roles: ["content_manager", "resort_admin", "super_admin"],
    isReady: true,
  },
  {
    id: "users",
    label: "User Management",
    href: "/admin/users",
    icon: FaUsers,
    roles: ["super_admin"],
    isReady: true,
  },
  {
    id: "settings",
    label: "System Settings",
    href: "/admin/settings",
    icon: FaCogs,
    roles: ["super_admin"],
    isReady: true,
  },
];

export interface AdminSidebarProps {
  userRole: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ userRole, isOpen = true }: AdminSidebarProps) {
  const router = useRouter();

  const visibleItems = SIDEBAR_NAV.filter((item) => item.roles.includes(userRole));

  return (
    <Box
      as="nav"
      aria-label="Admin Navigation"
      w={{ base: isOpen ? "260px" : "0", md: "260px" }}
      bg="gray.900"
      color="gray.200"
      minH="100vh"
      p={4}
      display={{ base: isOpen ? "block" : "none", md: "block" }}
      transition="all 0.2s"
      borderRight="1px solid"
      borderColor="gray.800"
      flexShrink={0}
    >
      <Box px={3} py={4} mb={4} borderBottom="1px solid" borderColor="gray.800">
        <Text fontSize="lg" fontWeight="bold" color="white" letterSpacing="wider">
          GAR ADMIN
        </Text>
        <Text fontSize="xs" color="gray.400" textTransform="uppercase">
          Operations & CMS
        </Text>
      </Box>

      <VStack align="stretch" gap={1}>
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? router.pathname === "/admin"
              : router.pathname.startsWith(item.href);

          if (!item.isReady) {
            return (
              <HStack
                key={item.id}
                px={3}
                py={2.5}
                borderRadius="md"
                color="gray.500"
                cursor="not-allowed"
                justify="space-between"
                opacity={0.6}
                title="Coming Soon (Phase 2)"
              >
                <HStack gap={3}>
                  <Icon as={item.icon} boxSize={4} />
                  <Text fontSize="sm">{item.label}</Text>
                </HStack>
                <Badge
                  colorScheme="gray"
                  fontSize="9px"
                  textTransform="uppercase"
                  variant="subtle"
                  px={1.5}
                >
                  Soon
                </Badge>
              </HStack>
            );
          }

          return (
            <NextLink key={item.id} href={item.href} passHref legacyBehavior>
              <HStack
                as="a"
                px={3}
                py={2.5}
                borderRadius="md"
                bg={isActive ? "blue.600" : "transparent"}
                color={isActive ? "white" : "gray.300"}
                _hover={{
                  bg: isActive ? "blue.600" : "gray.800",
                  color: "white",
                }}
                transition="all 0.15s"
                cursor="pointer"
                justify="space-between"
              >
                <HStack gap={3}>
                  <Icon as={item.icon} boxSize={4} />
                  <Text fontSize="sm" fontWeight={isActive ? "semibold" : "normal"}>
                    {item.label}
                  </Text>
                </HStack>
                {item.id === "bookings" && userRole === "content_manager" && (
                  <Badge colorScheme="purple" fontSize="9px" textTransform="uppercase" px={1.5}>
                    Read-Only
                  </Badge>
                )}
              </HStack>
            </NextLink>
          );
        })}
      </VStack>
    </Box>
  );
}

export default AdminSidebar;
