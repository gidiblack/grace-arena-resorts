import React, { useState, useEffect, useRef } from "react";
import {
  Drawer,
  Flex,
  HStack,
  Icon,
  Image,
  Link,
  Text,
  useDisclosure,
  VStack,
  Button as ChakraButton,
  Box,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useRouter } from "next/router";
import NextImage from "next/image";
import logo from "../../../public/grace_arena_logo-dark.svg";
import logoLight from "../../../public/grace_arena_logo-light.svg";
import { AiOutlineClose, AiOutlineMenu } from "react-icons/ai";
import Button from "../ui/button";
import { ROUTES } from "@/constants/ROUTES";
import { showActionLoading, hideActionLoading } from "@/components/common/ActionLoadingOverlay";
import { FaWhatsapp, FaUser, FaCalendarCheck, FaSignOutAlt } from "react-icons/fa";

const NAV_ITEMS = [
  { label: "Home", href: ROUTES.home },
  { label: "About", href: ROUTES.about },
  { label: "Rooms & Suites", href: ROUTES.rooms },
  { label: "Facilities", href: ROUTES.facilities },
  { label: "Dining", href: ROUTES.restaurants },
  { label: "Off-Beat Gems", href: ROUTES.gems },
  { label: "Events & Retreats", href: ROUTES.events },
  { label: "Contact", href: ROUTES.contact },
];

const LIGHT_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

interface UserNavProfile {
  id: string;
  email: string;
  fullName?: string | null;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<UserNavProfile | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { open, onClose, onToggle, setOpen } = useDisclosure();

  // Ignore ?query and #hash (the server never sees the hash), and use the route pathname until the
  // router is ready so server and client render the same active link (hydration-safe)
  const currentPath = router.isReady ? router.asPath.split(/[?#]/)[0] : router.pathname;

  const isLightRoute = LIGHT_ROUTES.some(
    (path) => currentPath === path || currentPath.startsWith(`${path}/`)
  );
  const showLightNavbar = scrolled || isLightRoute;

  // Track window scroll
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      setScrolled(window.scrollY >= 40);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const timer = setTimeout(handleScroll, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Fetch authenticated user profile
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (!res.ok) {
          if (isMounted) setUser(null);
          return;
        }
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setUser({
            id: json.data.id,
            email: json.data.email,
            fullName: json.data.fullName || json.data.full_name || null,
          });
        } else if (isMounted) {
          setUser(null);
        }
      } catch {
        if (isMounted) setUser(null);
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [currentPath]);

  // Close user dropdown on outside click or escape
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    showActionLoading("Signing out...");
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Continue redirect even if API call fails
    }
    setUser(null);
    await router.push(ROUTES.home);
    hideActionLoading();
  };

  const NavItem = ({ label, href, isLight }: { label: string; href: string; isLight: boolean }) => {
    const isActive = href === currentPath;
    return (
      <NextLink
        href={href}
        style={{ textDecoration: "none", padding: "6px 10px" }}
        className="group"
      >
        <Box
          as="span"
          display="inline-block"
          fontSize="14px"
          fontWeight={isActive ? "bold" : "medium"}
          color={isActive ? "accent.500" : isLight ? "dark.500" : "light.500"}
          _groupHover={{ color: "accent.500" }}
          position="relative"
          transition="all 0.2s ease-in-out"
        >
          {label}
          {isActive && (
            <Box
              as="span"
              position="absolute"
              bottom="-4px"
              left="0"
              right="0"
              height="2px"
              bg="accent.500"
              borderRadius="full"
              display="block"
            />
          )}
        </Box>
      </NextLink>
    );
  };

  return (
    <>
      <Flex
        as="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex="sticky"
        w="full"
        boxShadow={
          scrolled
            ? "0 4px 20px rgba(0, 0, 0, 0.12)"
            : isLightRoute
              ? "0 1px 3px rgba(0, 0, 0, 0.05)"
              : "none"
        }
        justify="center"
        bg={showLightNavbar ? "rgba(241, 245, 249, 0.95)" : "transparent"}
        borderBottom={isLightRoute && !scrolled ? "1px solid rgba(226, 232, 240, 0.8)" : "none"}
        backdropFilter={showLightNavbar ? "blur(12px)" : "none"}
        transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      >
        <Flex
          w="full"
          maxW={{ base: "100vw", "2xl": "92rem" }}
          alignItems="center"
          justifyContent="space-between"
          px={{ base: 4, md: 8, xl: 10 }}
          py={{ base: 2.5, md: 3.5 }}
        >
          {/* Logo with outline removed on click */}
          <Link
            href={ROUTES.home}
            display="flex"
            alignItems="center"
            outline="none"
            boxShadow="none"
            _focus={{ outline: "none", boxShadow: "none" }}
            _focusVisible={{ outline: "none", boxShadow: "none" }}
            _active={{ outline: "none", boxShadow: "none" }}
            style={{ outline: "none" }}
          >
            <Image
              asChild
              alt="Grace Arena Resorts Logo"
              width={{ base: "76px", md: "90px", lg: "108px" }}
              height={{ base: "36px", md: "42px", lg: "48px" }}
              position="relative"
              objectFit="contain"
              outline="none"
              style={{ outline: "none" }}
            >
              <NextImage
                src={showLightNavbar ? logoLight.src : logo.src}
                alt="Grace Arena Resorts Logo"
                width={108}
                height={48}
                priority
                style={{ outline: "none" }}
              />
            </Image>
          </Link>

          {/* Desktop Navigation Links */}
          <HStack gap={{ lg: 2, xl: 4 }} display={{ base: "none", lg: "flex" }}>
            {NAV_ITEMS.map(({ label, href }, i) => (
              <NavItem key={i} label={label} href={href} isLight={showLightNavbar} />
            ))}
          </HStack>

          {/* Action CTAs */}
          <HStack gap={3}>
            {user ? (
              /* User Initials Avatar with Dropdown */
              <Box position="relative" ref={userMenuRef}>
                <Box
                  as="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  w={{ base: "34px", md: "38px" }}
                  h={{ base: "34px", md: "38px" }}
                  borderRadius="full"
                  bg="accent.500"
                  color="#070707"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="13px"
                  fontWeight="bold"
                  letterSpacing="0.5px"
                  cursor="pointer"
                  aria-label="User account menu"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  outline="none"
                  border="2px solid"
                  borderColor={showLightNavbar ? "gray.300" : "rgba(255, 255, 255, 0.4)"}
                  boxShadow="0 2px 6px rgba(0, 0, 0, 0.15)"
                  _hover={{ transform: "scale(1.05)", borderColor: "accent.500" }}
                  _focus={{ outline: "none", boxShadow: "0 0 0 2px #FCCA46" }}
                  _active={{ outline: "none" }}
                  style={{ outline: "none" }}
                  transition="all 0.15s ease"
                >
                  {getInitials(user.fullName, user.email)}
                </Box>

                {isUserMenuOpen && (
                  <Box
                    position="absolute"
                    top="calc(100% + 10px)"
                    right={0}
                    w="220px"
                    bg="#0F172A"
                    color="white"
                    borderRadius="14px"
                    border="1px solid #1E293B"
                    boxShadow="0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)"
                    py={2}
                    zIndex={100}
                    role="menu"
                  >
                    {/* User Header */}
                    <Box px={4} py={2} borderBottom="1px solid #1E293B">
                      <Text
                        fontSize="13px"
                        fontWeight="bold"
                        color="white"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                      >
                        {user.fullName || "Guest Account"}
                      </Text>
                      <Text
                        fontSize="11px"
                        color="gray.400"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                        mt={0.5}
                      >
                        {user.email}
                      </Text>
                    </Box>

                    {/* Nav Items */}
                    <Box py={1}>
                      <NextLink
                        href={ROUTES.account}
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{ textDecoration: "none" }}
                      >
                        <Flex
                          align="center"
                          gap={2.5}
                          px={4}
                          py={2}
                          fontSize="13px"
                          color="gray.200"
                          _hover={{ bg: "rgba(255, 255, 255, 0.08)", color: "accent.500" }}
                          transition="all 0.15s"
                        >
                          <Icon as={FaUser} boxSize={3.5} color="accent.500" />
                          <Text>Account Overview</Text>
                        </Flex>
                      </NextLink>

                      <NextLink
                        href="/account/bookings"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{ textDecoration: "none" }}
                      >
                        <Flex
                          align="center"
                          gap={2.5}
                          px={4}
                          py={2}
                          fontSize="13px"
                          color="gray.200"
                          _hover={{ bg: "rgba(255, 255, 255, 0.08)", color: "accent.500" }}
                          transition="all 0.15s"
                        >
                          <Icon as={FaCalendarCheck} boxSize={3.5} color="accent.500" />
                          <Text>Bookings</Text>
                        </Flex>
                      </NextLink>
                    </Box>

                    {/* Logout */}
                    <Box borderTop="1px solid #1E293B" pt={1}>
                      <Flex
                        as="button"
                        w="full"
                        textAlign="left"
                        align="center"
                        gap={2.5}
                        px={4}
                        py={2}
                        fontSize="13px"
                        color="#FC8181"
                        cursor="pointer"
                        _hover={{ bg: "rgba(252, 129, 129, 0.1)" }}
                        transition="all 0.15s"
                        onClick={handleLogout}
                      >
                        <Icon as={FaSignOutAlt} boxSize={3.5} />
                        <Text fontWeight="medium">Logout</Text>
                      </Flex>
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              /* Login Button replacing Inquire button */
              <NextLink href={ROUTES.login} style={{ textDecoration: "none" }}>
                <HStack
                  px={3.5}
                  py={1.5}
                  borderRadius="full"
                  border="1px solid"
                  borderColor={showLightNavbar ? "gray.300" : "whiteAlpha.400"}
                  color={showLightNavbar ? "dark.500" : "light.500"}
                  _hover={{
                    borderColor: "accent.500",
                    color: "accent.500",
                    bg: showLightNavbar ? "blackAlpha.50" : "whiteAlpha.100",
                  }}
                  transition="all 0.2s"
                  cursor="pointer"
                >
                  <Text fontSize="13px" fontWeight="semibold">
                    Login
                  </Text>
                </HStack>
              </NextLink>
            )}

            <Link href={ROUTES.booking} display={{ base: "none", sm: "inline-flex" }}>
              <Button size="sm">Book Now</Button>
            </Link>

            {/* Mobile / Tablet Menu Trigger */}
            <Flex
              onClick={onToggle}
              display={{ base: "inline-flex", lg: "none" }}
              aria-label="Toggle Navigation"
              role="button"
              tabIndex={0}
              cursor="pointer"
              p={2}
              borderRadius="md"
              _hover={{ bg: showLightNavbar ? "blackAlpha.100" : "whiteAlpha.200" }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle();
                }
              }}
            >
              {open ? (
                <Icon
                  as={AiOutlineClose}
                  boxSize={5}
                  color={showLightNavbar ? "dark.500" : "light.500"}
                />
              ) : (
                <Icon
                  as={AiOutlineMenu}
                  boxSize={5}
                  color={showLightNavbar ? "dark.500" : "light.500"}
                />
              )}
            </Flex>
          </HStack>
        </Flex>
      </Flex>

      {/* Mobile Drawer */}
      <Drawer.Root open={open} placement="end" onOpenChange={(details) => setOpen(details.open)}>
        <Drawer.Backdrop
          bg="blackAlpha.800"
          backdropFilter="blur(4px)"
          display={{ base: "block", lg: "none" }}
        />
        <Drawer.Positioner display={{ base: "flex", lg: "none" }}>
          <Drawer.Content
            bg="#0A0F1D"
            color="light.500"
            maxW="320px"
            borderLeft="1px solid #1E293B"
          >
            <Flex
              justifyContent="space-between"
              alignItems="center"
              px={5}
              py={4}
              borderBottom="1px solid #1E293B"
            >
              <Link
                href={ROUTES.home}
                onClick={onClose}
                outline="none"
                boxShadow="none"
                _focus={{ outline: "none", boxShadow: "none" }}
                _focusVisible={{ outline: "none", boxShadow: "none" }}
                _active={{ outline: "none", boxShadow: "none" }}
                style={{ outline: "none" }}
              >
                <Image
                  asChild
                  alt="Grace Arena Resorts Logo"
                  width="80px"
                  height="38px"
                  position="relative"
                  objectFit="contain"
                  outline="none"
                  style={{ outline: "none" }}
                >
                  <NextImage
                    src={logo.src}
                    alt="Grace Arena Logo"
                    width={80}
                    height={38}
                    style={{ outline: "none" }}
                  />
                </Image>
              </Link>
              <Drawer.CloseTrigger asChild color="light.500" aria-label="Close navigation menu">
                <ChakraButton variant="ghost" minW="auto" p={1.5} _hover={{ bg: "#1E293B" }}>
                  <Icon as={AiOutlineClose} boxSize={5} />
                </ChakraButton>
              </Drawer.CloseTrigger>
            </Flex>

            <Drawer.Body py={6} px={5}>
              <VStack align="stretch" gap={1.5}>
                {NAV_ITEMS.map(({ label, href }) => {
                  const isActive = href === currentPath;
                  return (
                    <NextLink
                      key={href}
                      href={href}
                      onClick={onClose}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        color: isActive ? "#FCCA46" : "#F1F5F9",
                        backgroundColor: isActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                        fontWeight: isActive ? "bold" : "normal",
                        textDecoration: "none",
                        display: "block",
                      }}
                    >
                      {label}
                    </NextLink>
                  );
                })}

                <Box pt={4} mt={2} borderTop="1px solid #1E293B">
                  {user ? (
                    <Box mb={3} p={3} borderRadius="12px" bg="#1E293B">
                      <HStack gap={3} mb={3}>
                        <Flex
                          w="38px"
                          h="38px"
                          borderRadius="full"
                          bg="accent.500"
                          color="#070707"
                          align="center"
                          justify="center"
                          fontSize="13px"
                          fontWeight="bold"
                        >
                          {getInitials(user.fullName, user.email)}
                        </Flex>
                        <Box overflow="hidden">
                          <Text
                            fontSize="13px"
                            fontWeight="bold"
                            color="white"
                            overflow="hidden"
                            textOverflow="ellipsis"
                            whiteSpace="nowrap"
                          >
                            {user.fullName || "Guest Account"}
                          </Text>
                          <Text
                            fontSize="11px"
                            color="gray.400"
                            overflow="hidden"
                            textOverflow="ellipsis"
                            whiteSpace="nowrap"
                          >
                            {user.email}
                          </Text>
                        </Box>
                      </HStack>
                      <VStack align="stretch" gap={1}>
                        <NextLink
                          href={ROUTES.account}
                          onClick={onClose}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "6px",
                            color: "#F1F5F9",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                          }}
                        >
                          <Icon as={FaUser} boxSize={3.5} color="accent.500" />
                          <Text>Account Overview</Text>
                        </NextLink>
                        <NextLink
                          href="/account/bookings"
                          onClick={onClose}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "6px",
                            color: "#F1F5F9",
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                          }}
                        >
                          <Icon as={FaCalendarCheck} boxSize={3.5} color="accent.500" />
                          <Text>Bookings</Text>
                        </NextLink>
                        <Box
                          as="button"
                          onClick={() => {
                            onClose();
                            handleLogout();
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "6px",
                            color: "#FC8181",
                            background: "transparent",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "left",
                          }}
                        >
                          <Icon as={FaSignOutAlt} boxSize={3.5} />
                          <Text>Logout</Text>
                        </Box>
                      </VStack>
                    </Box>
                  ) : (
                    <NextLink
                      href={ROUTES.login}
                      onClick={onClose}
                      style={{ textDecoration: "none", display: "block", marginBottom: "12px" }}
                    >
                      <Flex
                        align="center"
                        justify="center"
                        gap={2}
                        py={2.5}
                        borderRadius="8px"
                        border="1px solid"
                        borderColor="accent.500"
                        color="accent.500"
                        fontWeight="semibold"
                        fontSize="14px"
                        _hover={{ bg: "rgba(252, 202, 70, 0.1)" }}
                      >
                        Login / Register
                      </Flex>
                    </NextLink>
                  )}

                  <Link href={ROUTES.booking} onClick={onClose} display="block" mb={3}>
                    <Button size="md" style={{ width: "100%", justifyContent: "center" }}>
                      Book Your Stay
                    </Button>
                  </Link>

                  <a
                    href="https://wa.me/2348123456789?text=Hello%20Grace%20Arena%20Resorts"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    style={{ textDecoration: "none" }}
                  >
                    <Flex
                      align="center"
                      justify="center"
                      gap={2}
                      py={2.5}
                      borderRadius="8px"
                      border="1px solid #25D366"
                      color="#25D366"
                      _hover={{ bg: "rgba(37, 211, 102, 0.1)" }}
                    >
                      <Icon as={FaWhatsapp} boxSize={4} />
                      <Text fontSize="13px" fontWeight="semibold">
                        Chat on WhatsApp
                      </Text>
                    </Flex>
                  </a>
                </Box>
              </VStack>
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </>
  );
};

export default Navbar;
