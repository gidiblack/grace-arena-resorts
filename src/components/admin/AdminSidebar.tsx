import React, { useState, useEffect } from "react";
import NextLink from "next/link";
import NextImage from "next/image";
import { useRouter } from "next/router";
import { Box, Flex, VStack, HStack, Text, Icon, Badge, IconButton } from "@chakra-ui/react";
import {
  FaTachometerAlt,
  FaCalendarCheck,
  FaBed,
  FaUtensils,
  FaSwimmingPool,
  FaGem,
  FaGlassCheers,
  FaTags,
  FaEnvelope,
  FaNewspaper,
  FaUsers,
  FaCogs,
  FaChevronDown,
  FaTimes,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import type { UserRole } from "@/types/db";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: IconType;
  roles: UserRole[];
  isReady?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const DASHBOARD_ITEM: NavItem = {
  id: "dashboard",
  label: "Dashboard",
  href: "/admin",
  icon: FaTachometerAlt,
  roles: ["content_manager", "resort_admin", "super_admin"],
  isReady: true,
};

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    id: "operations",
    label: "Operations",
    items: [
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
    ],
  },
  {
    id: "hospitality",
    label: "Hospitality",
    items: [
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
        label: "Off-beat Gems",
        href: "/admin/gems",
        icon: FaGem,
        roles: ["content_manager", "resort_admin", "super_admin"],
        isReady: true,
      },
      {
        id: "events",
        label: "Event & Inquiries",
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
    ],
  },
  {
    id: "engagement",
    label: "Engagement",
    items: [
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
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
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
    ],
  },
];

export interface AdminSidebarProps {
  userRole: UserRole;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ userRole, isOpen = true, onClose }: AdminSidebarProps) {
  const router = useRouter();

  const isItemActive = (href: string) => {
    if (href === "/admin") {
      return router.pathname === "/admin";
    }
    return router.pathname.startsWith(href);
  };

  const sectionHasActiveItem = (section: NavSection) => {
    return section.items.some((item) => isItemActive(item.href));
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      operations: false,
      hospitality: false,
      engagement: false,
      administration: false,
    };
    SIDEBAR_SECTIONS.forEach((section) => {
      if (section.items.some((item) => (item.href === "/admin" ? router.pathname === "/admin" : router.pathname.startsWith(item.href)))) {
        initial[section.id] = true;
      }
    });
    return initial;
  });

  // Keep section open whenever navigation enters a route inside it
  useEffect(() => {
    SIDEBAR_SECTIONS.forEach((section) => {
      if (sectionHasActiveItem(section)) {
        setOpenSections((prev) => (prev[section.id] ? prev : { ...prev, [section.id]: true }));
      }
    });
  }, [router.pathname]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const isDashboardActive = isItemActive(DASHBOARD_ITEM.href);
  const showDashboard = DASHBOARD_ITEM.roles.includes(userRole);

  return (
    <>
      {/* Backdrop Overlay on Mobile, Tablet & Smaller PCs */}
      <Box
        display={{ base: "block", xl: "none" }}
        position="fixed"
        inset={0}
        bg="blackAlpha.700"
        zIndex={45}
        onClick={onClose}
        aria-hidden="true"
        opacity={isOpen ? 1 : 0}
        pointerEvents={isOpen ? "auto" : "none"}
        transition="opacity 0.25s ease"
      />

      {/* Sidebar Container with Slide Animation on Mobile / Tablet / Smaller PCs */}
      <Box
        as="nav"
        aria-label="Admin Navigation"
        position={{ base: "fixed", xl: "sticky" }}
        top={0}
        left={0}
        h="100vh"
        maxH="100vh"
        w="260px"
        bg="#0F172A"
        color="gray.200"
        display="flex"
        flexDirection="column"
        zIndex={{ base: 50, xl: 30 }}
        borderRight="1px solid"
        borderColor="#1E293B"
        flexShrink={0}
        transform={{ base: isOpen ? "translateX(0)" : "translateX(-100%)", xl: "none" }}
        visibility={{ base: isOpen ? "visible" : "hidden", xl: "visible" }}
        boxShadow={{ base: isOpen ? "4px 0 24px rgba(0, 0, 0, 0.45)" : "none", xl: "none" }}
        transition="transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s ease, box-shadow 0.3s ease"
        overflow="hidden"
      >
        {/* Sidebar Header with GAR Logo & Close Button */}
        <Flex
          justify="space-between"
          align="center"
          px={5}
          py={4}
          borderBottom="1px solid"
          borderColor="#1E293B"
          flexShrink={0}
        >
          <Box>
            <NextLink
              href="/admin"
              aria-label="Grace Arena Resorts"
              style={{ display: "inline-block", textDecoration: "none" }}
              onClick={() => onClose?.()}
            >
              <Box position="relative" width="136px" height="46px">
                <NextImage
                  src="/grace_arena_logo-dark.svg"
                  alt="Grace Arena Resorts Logo"
                  width={136}
                  height={46}
                  priority
                  style={{ width: "auto", height: "46px", objectFit: "contain" }}
                />
              </Box>
            </NextLink>
            <Text
              fontSize="10px"
              fontWeight="600"
              color="#64748B"
              letterSpacing="0.08em"
              textTransform="uppercase"
              mt={1.5}
            >
              Operations & CMS
            </Text>
          </Box>

          {/* Close Button on mobile, tablet & smaller PCs */}
          <IconButton
            aria-label="Close sidebar"
            variant="ghost"
            size="sm"
            color="gray.400"
            _hover={{ color: "white", bg: "whiteAlpha.200" }}
            display={{ base: "inline-flex", xl: "none" }}
            onClick={onClose}
          >
            <Icon as={FaTimes} boxSize={3.5} />
          </IconButton>
        </Flex>

        {/* Scrollable Navigation Area */}
        <Box
          flex="1"
          overflowY="auto"
          px={3}
          py={3}
          css={{
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": { background: "#1E293B", borderRadius: "4px" },
            "&::-webkit-scrollbar-thumb:hover": { background: "#334155" },
          }}
        >
          {/* Standalone Dashboard */}
          {showDashboard && (
            <HStack
              asChild
              px={3}
              py={2.5}
              mb={2}
              borderRadius="md"
              bg={isDashboardActive ? "rgba(252, 202, 70, 0.14)" : "transparent"}
              color={isDashboardActive ? "#FCCA46" : "gray.300"}
              borderLeft={isDashboardActive ? "3px solid #FCCA46" : "3px solid transparent"}
              _hover={{
                bg: isDashboardActive ? "rgba(252, 202, 70, 0.2)" : "#1E293B",
                color: isDashboardActive ? "#FCCA46" : "white",
              }}
              transition="all 0.15s"
              cursor="pointer"
              justify="space-between"
              onClick={() => onClose?.()}
            >
              <NextLink href={DASHBOARD_ITEM.href} aria-current={isDashboardActive ? "page" : undefined}>
                <HStack gap={3}>
                  <Icon
                    as={DASHBOARD_ITEM.icon}
                    boxSize={4}
                    color={isDashboardActive ? "#FCCA46" : "gray.400"}
                  />
                  <Text fontSize="sm" fontWeight={isDashboardActive ? "semibold" : "medium"}>
                    {DASHBOARD_ITEM.label}
                  </Text>
                </HStack>
              </NextLink>
            </HStack>
          )}

          {/* Dropdown Sections */}
          <VStack align="stretch" gap={1}>
            {SIDEBAR_SECTIONS.map((section) => {
              const visibleItems = section.items.filter((item) =>
                item.roles.includes(userRole)
              );

              // Don't render section if user role has no access to any of its items
              if (visibleItems.length === 0) return null;

              const hasActiveChild = sectionHasActiveItem(section);
              const isSectionOpen = Boolean(openSections[section.id]);

              return (
                <Box key={section.id} mb={1}>
                  {/* Section Dropdown Header */}
                  <Box
                    as="button"
                    w="full"
                    px={3}
                    py={2}
                    borderRadius="md"
                    color={hasActiveChild ? "#FCCA46" : "gray.400"}
                    bg={hasActiveChild ? "whiteAlpha.50" : "transparent"}
                    _hover={{
                      color: "white",
                      bg: "whiteAlpha.100",
                    }}
                    transition="all 0.15s"
                    cursor="pointer"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={isSectionOpen}
                  >
                    <HStack justify="space-between" align="center" w="full">
                      <HStack gap={2}>
                        <Text
                          fontSize="xs"
                          fontWeight="bold"
                          letterSpacing="wider"
                          textTransform="uppercase"
                        >
                          {section.label}
                        </Text>
                        {hasActiveChild && !isSectionOpen && (
                          <Box
                            w="6px"
                            h="6px"
                            borderRadius="full"
                            bg="#FCCA46"
                            title="Active page inside"
                          />
                        )}
                      </HStack>
                      <Icon
                        as={FaChevronDown}
                        boxSize={2.5}
                        transition="transform 0.2s ease"
                        transform={isSectionOpen ? "rotate(0deg)" : "rotate(-90deg)"}
                      />
                    </HStack>
                  </Box>

                  {/* Section Children Links */}
                  {isSectionOpen && (
                    <VStack align="stretch" gap={1} pl={2} mt={1} mb={2}>
                      {visibleItems.map((item) => {
                        const isActive = isItemActive(item.href);

                        return (
                          <HStack
                            key={item.id}
                            asChild
                            px={3}
                            py={2}
                            borderRadius="md"
                            bg={isActive ? "rgba(252, 202, 70, 0.14)" : "transparent"}
                            color={isActive ? "#FCCA46" : "gray.300"}
                            borderLeft={isActive ? "3px solid #FCCA46" : "3px solid transparent"}
                            _hover={{
                              bg: isActive ? "rgba(252, 202, 70, 0.2)" : "#1E293B",
                              color: isActive ? "#FCCA46" : "white",
                            }}
                            transition="all 0.15s"
                            cursor="pointer"
                            justify="space-between"
                            onClick={() => onClose?.()}
                          >
                            <NextLink href={item.href} aria-current={isActive ? "page" : undefined}>
                              <HStack gap={3}>
                                <Icon
                                  as={item.icon}
                                  boxSize={3.5}
                                  color={isActive ? "#FCCA46" : "gray.400"}
                                />
                                <Text
                                  fontSize="xs"
                                  fontWeight={isActive ? "semibold" : "normal"}
                                >
                                  {item.label}
                                </Text>
                              </HStack>
                              {item.id === "bookings" && userRole === "content_manager" && (
                                <Badge
                                  colorPalette="purple"
                                  fontSize="9px"
                                  textTransform="uppercase"
                                  px={1.5}
                                >
                                  Read-Only
                                </Badge>
                              )}
                            </NextLink>
                          </HStack>
                        );
                      })}
                    </VStack>
                  )}
                </Box>
              );
            })}
          </VStack>
        </Box>
      </Box>
    </>
  );
}

export default AdminSidebar;
