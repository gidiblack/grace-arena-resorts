import React, { useState, useCallback, useEffect } from "react";
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
import useWindowDimensions from "@/helpers/useWindowDimensions";
import { AiOutlineClose, AiOutlineMenu } from "react-icons/ai";
import Button from "../ui/button";
import { ROUTES } from "@/constants/ROUTES";
import { FaPhoneAlt, FaWhatsapp } from "react-icons/fa";

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

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { open, onClose, onToggle, setOpen } = useDisclosure();
  const currentPath = router.asPath.split("?")[0];

  const changeBg = useCallback(() => {
    if (window.scrollY >= 40) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    changeBg();
    window.addEventListener("scroll", changeBg);
    return () => {
      window.removeEventListener("scroll", changeBg);
    };
  }, [changeBg]);

  const NavItem = ({ label, href, scrolled }: { label: string; href: string; scrolled: boolean }) => {
    const isActive = href === currentPath;
    return (
      <NextLink href={href} style={{ textDecoration: "none", padding: "6px 10px" }} className="group">
        <Box
          as="span"
          display="inline-block"
          fontSize="14px"
          fontWeight={isActive ? "bold" : "medium"}
          color={isActive ? "accent.500" : scrolled ? "dark.500" : "light.500"}
          _groupHover={{ color: "accent.500" }}
          position="relative"
          transition="all 0.2s ease-in-out">
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
        boxShadow={scrolled ? "0 4px 20px rgba(0, 0, 0, 0.12)" : "none"}
        justify="center"
        bg={scrolled ? "rgba(241, 245, 249, 0.95)" : "transparent"}
        backdropFilter={scrolled ? "blur(12px)" : "none"}
        transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)">
        <Flex
          w="full"
          maxW={{ base: "100vw", "2xl": "92rem" }}
          alignItems="center"
          justifyContent="space-between"
          px={{ base: 4, md: 8, xl: 10 }}
          py={{ base: 2.5, md: 3.5 }}>
          {/* Logo */}
          <Link href={ROUTES.home} display="flex" alignItems="center">
            <Image
              asChild
              width={{ base: "76px", md: "90px", lg: "108px" }}
              height={{ base: "36px", md: "42px", lg: "48px" }}
              position="relative"
              objectFit="contain">
              <NextImage
                src={scrolled ? logoLight.src : logo.src}
                alt="Grace Arena Resorts Logo"
                width={108}
                height={48}
                priority
              />
            </Image>
          </Link>

          {/* Desktop Navigation Links */}
          <HStack gap={{ lg: 2, xl: 4 }} display={{ base: "none", lg: "flex" }}>
            {NAV_ITEMS.map(({ label, href }, i) => (
              <NavItem key={i} label={label} href={href} scrolled={scrolled} />
            ))}
          </HStack>

          {/* Action CTAs */}
          <HStack gap={3}>
            <a
              href="https://wa.me/2348123456789?text=Hello%20Grace%20Arena%20Resorts"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}>
              <HStack
                display={{ base: "none", xl: "flex" }}
                px={3}
                py={1.5}
                borderRadius="full"
                border="1px solid"
                borderColor={scrolled ? "gray.300" : "whiteAlpha.400"}
                color={scrolled ? "gray.700" : "light.500"}
                _hover={{ borderColor: "accent.500", color: "accent.500" }}
                transition="all 0.2s"
                cursor="pointer">
                <Icon as={FaWhatsapp} boxSize={3.5} color="#25D366" />
                <Text fontSize="12px" fontWeight="semibold">
                  Inquire
                </Text>
              </HStack>
            </a>

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
              _hover={{ bg: scrolled ? "blackAlpha.100" : "whiteAlpha.200" }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle();
                }
              }}>
              {open ? (
                <Icon as={AiOutlineClose} boxSize={5} color={scrolled ? "dark.500" : "light.500"} />
              ) : (
                <Icon as={AiOutlineMenu} boxSize={5} color={scrolled ? "dark.500" : "light.500"} />
              )}
            </Flex>
          </HStack>
        </Flex>
      </Flex>

      {/* Mobile Drawer */}
      <Drawer.Root open={open} placement="end" onOpenChange={(details) => setOpen(details.open)}>
        <Drawer.Backdrop bg="blackAlpha.800" backdropFilter="blur(4px)" display={{ base: "block", lg: "none" }} />
        <Drawer.Positioner display={{ base: "flex", lg: "none" }}>
          <Drawer.Content bg="#0A0F1D" color="light.500" maxW="320px" borderLeft="1px solid #1E293B">
            <Flex justifyContent="space-between" alignItems="center" px={5} py={4} borderBottom="1px solid #1E293B">
              <Link href={ROUTES.home} onClick={onClose}>
                <Image asChild width="80px" height="38px" position="relative" objectFit="contain">
                  <NextImage src={logo.src} alt="Grace Arena Logo" width={80} height={38} />
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
                      }}>
                      {label}
                    </NextLink>
                  );
                })}

                <Box pt={4} mt={2} borderTop="1px solid #1E293B">
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
                    style={{ textDecoration: "none" }}>
                    <Flex
                      align="center"
                      justify="center"
                      gap={2}
                      py={2.5}
                      borderRadius="8px"
                      border="1px solid #25D366"
                      color="#25D366"
                      _hover={{ bg: "rgba(37, 211, 102, 0.1)" }}>
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
