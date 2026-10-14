import React, { useState } from "react";
import {
  Flex,
  GridItem,
  HStack,
  Icon,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Box,
  Input,
} from "@chakra-ui/react";
import Link from "next/link";
import NextImage from "next/image";
import logo from "../../../public/grace_arena_logo-light.svg";
import {
  FaEnvelope,
  FaFacebook,
  FaInstagram,
  FaPhoneAlt,
  FaTwitter,
  FaWhatsapp,
} from "react-icons/fa";
import { ROUTES } from "@/constants/ROUTES";
import { FaLocationDot } from "react-icons/fa6";
import Button from "../ui/button";

export const Footer = () => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    setNewsletterLoading(true);
    setNewsletterError(null);

    try {
      const res = await fetch("/api/v1/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to join newsletter.");
      }

      setSubscribed(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to join newsletter. Please try again.";
      setNewsletterError(message);
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleOpenCookieSettings = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gar:open-cookie-preferences"));
    }
  };

  const SOCIALS = [
    { label: "Facebook", href: "https://facebook.com", icon: FaFacebook },
    { label: "Instagram", href: "https://instagram.com", icon: FaInstagram },
    { label: "Twitter", href: "https://x.com", icon: FaTwitter },
    {
      label: "WhatsApp",
      href: "https://wa.me/2348123456789?text=Hello%20Grace%20Arena%20Resorts",
      icon: FaWhatsapp,
    },
  ];

  return (
    <Box as="footer" w="full" bg="#F8FAFC" borderTop="1px solid #E2E8F0" color="#334155">
      {/* Newsletter Banner */}
      <Box bg="#0F172A" color="white" py={{ base: 10, md: 12 }} px={{ base: 5, md: 8 }}>
        <Flex
          maxW={{ base: "100vw", "2xl": "90rem" }}
          mx="auto"
          flexDir={{ base: "column", md: "row" }}
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          gap={6}
        >
          <Stack gap={1} maxW="36rem">
            <Text
              fontSize="13px"
              fontWeight="bold"
              color="accent.500"
              letterSpacing="wider"
              textTransform="uppercase"
            >
              Stay Connected With Serenity
            </Text>
            <Text fontSize={{ base: "20px", md: "24px" }} fontWeight="bold">
              Subscribe to GAR Special Retreats &amp; Deals
            </Text>
            <Text fontSize="14px" color="gray.300">
              Receive updates on seasonal specials, spiritual retreat schedules, and campus
              additions.
            </Text>
          </Stack>

          {subscribed ? (
            <Box bg="whiteAlpha.200" px={5} py={3} borderRadius="10px" border="1px solid #22c55e">
              <Text fontSize="14px" fontWeight="semibold" color="#4ade80">
                ✓ Thank you for subscribing! Please check your email for confirmation.
              </Text>
            </Box>
          ) : (
            <Box as="form" onSubmit={handleSubscribe} w={{ base: "full", sm: "auto" }}>
              <Flex gap={2} flexDir={{ base: "column", sm: "row" }}>
                <Input
                  required
                  type="email"
                  placeholder="Enter your email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  bg="#1E293B"
                  border="1px solid #475569"
                  color="white"
                  px={4}
                  py={2.5}
                  borderRadius="8px"
                  fontSize="14px"
                  minW={{ sm: "280px" }}
                  _placeholder={{ color: "gray.400", opacity: 1 }}
                  _focus={{ borderColor: "brand.gold", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={newsletterLoading}
                  style={{
                    padding: "10px 24px",
                    whiteSpace: "nowrap",
                    opacity: newsletterLoading ? 0.7 : 1,
                  }}
                >
                  {newsletterLoading ? "Joining..." : "Join Newsletter"}
                </Button>
              </Flex>
              {newsletterError && (
                <Text fontSize="12px" color="red.400" mt={1.5}>
                  {newsletterError}
                </Text>
              )}
              <Text fontSize="11px" color="gray.400" mt={1.5}>
                We honor your privacy under NDPR. Unsubscribe anytime.
              </Text>
            </Box>
          )}
        </Flex>
      </Box>

      {/* Main Footer Links */}
      <Box py={{ base: 12, md: 16 }} px={{ base: 5, md: 8, xl: 12 }}>
        <Flex maxW={{ base: "100vw", "2xl": "90rem" }} mx="auto">
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} gap={{ base: 8, md: 10 }} w="full">
            {/* Column 1: Brand */}
            <GridItem colSpan={{ base: 1, sm: 2, lg: 2 }}>
              <Stack gap={4} maxW="28rem">
                <Link href={ROUTES.home}>
                  <Image
                    asChild
                    alt="Grace Arena Resorts Logo"
                    width="128px"
                    height="56px"
                    position="relative"
                    objectFit="contain"
                  >
                    <NextImage src={logo.src} alt="Grace Arena Resorts" width={128} height={56} />
                  </Image>
                </Link>
                <Text fontSize="14px" color="gray.600" lineHeight="tall">
                  Nestled in the picturesque town of Igbo-Ora, the land of twins in Oyo State, Grace
                  Arena Resorts is a premier Christian resort dedicated to tranquil hospitality,
                  luxury accommodation, spiritual renewal, and unforgettable family moments.
                </Text>
                <HStack gap={3} pt={2}>
                  {SOCIALS.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none" }}
                      aria-label={`Visit our ${social.label} page`}
                    >
                      <Box
                        boxSize={9}
                        borderRadius="full"
                        bg="white"
                        border="1px solid #E2E8F0"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="gray.600"
                        _hover={{
                          bg: "accent.500",
                          color: "dark.500",
                          transform: "translateY(-2px)",
                        }}
                        transition="all 0.2s"
                      >
                        <Icon as={social.icon} boxSize={4} />
                      </Box>
                    </a>
                  ))}
                </HStack>
              </Stack>
            </GridItem>

            {/* Column 2: Rooms & Campuses */}
            <GridItem>
              <Text fontSize="15px" fontWeight="bold" color="#0F172A" mb={4}>
                Our Campuses &amp; Rooms
              </Text>
              <Stack gap={2.5}>
                <Link href={`${ROUTES.rooms}?type=elysian`}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    GAR Elysian (Luxury Tier)
                  </Text>
                </Link>
                <Link href={`${ROUTES.rooms}?type=village`}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    GAR Village (Rustic Huts)
                  </Text>
                </Link>
                <Link href={ROUTES.rooms}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    The Fountain Haven
                  </Text>
                </Link>
                <Link href={ROUTES.rooms}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    The Oasis Villa
                  </Text>
                </Link>
                <Link href={ROUTES.rooms}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    The Cabana Suites
                  </Text>
                </Link>
                <Link href={ROUTES.rooms}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    Executive Huts
                  </Text>
                </Link>
              </Stack>
            </GridItem>

            {/* Column 3: Experiences */}
            <GridItem>
              <Text fontSize="15px" fontWeight="bold" color="#0F172A" mb={4}>
                Resort Experiences
              </Text>
              <Stack gap={2.5}>
                <Link href={ROUTES.facilities}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    The Prayer Hut
                  </Text>
                </Link>
                <Link href={ROUTES.facilities}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    Modern Mall &amp; Spa
                  </Text>
                </Link>
                <Link href={ROUTES.restaurants}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    Fine Dining &amp; Suya Hut
                  </Text>
                </Link>
                <Link href={ROUTES.gems}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    Off-Beat Gems (Igbo-Ora)
                  </Text>
                </Link>
                <Link href={ROUTES.events}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    Church Retreats &amp; Weddings
                  </Text>
                </Link>
                <Link href={ROUTES.deals}>
                  <Text fontSize="14px" color="gray.600" _hover={{ color: "accent.500" }}>
                    Special Deals &amp; Offers
                  </Text>
                </Link>
              </Stack>
            </GridItem>

            {/* Column 4: Location & Contact */}
            <GridItem>
              <Text fontSize="15px" fontWeight="bold" color="#0F172A" mb={4}>
                Get in Touch
              </Text>
              <Stack gap={3}>
                <HStack align="flex-start" gap={2}>
                  <Icon as={FaLocationDot} boxSize={4} color="accent.500" mt={1} />
                  <Text fontSize="13px" color="gray.600" lineHeight="base">
                    Grace Arena Resorts, Igbo-Ora, Ibarapa Central, Oyo State, Nigeria
                  </Text>
                </HStack>
                <Link href="tel:+2348123456789">
                  <HStack gap={2}>
                    <Icon as={FaPhoneAlt} boxSize={3.5} color="accent.500" />
                    <Text fontSize="13px" color="gray.600" _hover={{ color: "accent.500" }}>
                      +234 812 345 6789
                    </Text>
                  </HStack>
                </Link>
                <Link href="mailto:info@gracearenaresorts.com">
                  <HStack gap={2}>
                    <Icon as={FaEnvelope} boxSize={3.5} color="accent.500" />
                    <Text fontSize="13px" color="gray.600" _hover={{ color: "accent.500" }}>
                      info@gracearenaresorts.com
                    </Text>
                  </HStack>
                </Link>
                <a
                  href="https://wa.me/2348123456789?text=Hello%20Grace%20Arena%20Resorts"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <HStack gap={2}>
                    <Icon as={FaWhatsapp} boxSize={3.5} color="#25D366" />
                    <Text fontSize="13px" color="#16a34a" fontWeight="semibold">
                      WhatsApp Quick Chat
                    </Text>
                  </HStack>
                </a>
              </Stack>
            </GridItem>
          </SimpleGrid>
        </Flex>

        {/* Bottom Credits & NDPR settings */}
        <Flex
          maxW={{ base: "100vw", "2xl": "90rem" }}
          mx="auto"
          mt={12}
          pt={6}
          borderTop="1px solid #E2E8F0"
          flexDir={{ base: "column", sm: "row" }}
          justify="space-between"
          align="center"
          gap={3}
        >
          <Text fontSize="13px" color="gray.500">
            &copy; {new Date().getFullYear()} Grace Arena Resorts Ltd. All rights reserved.
          </Text>

          <HStack gap={4} flexWrap="wrap" justify="center">
            <Link href={ROUTES.privacy}>
              <Text fontSize="12px" color="gray.500" _hover={{ color: "accent.500" }}>
                Privacy Policy (NDPR)
              </Text>
            </Link>
            <Link href={ROUTES.terms}>
              <Text fontSize="12px" color="gray.500" _hover={{ color: "accent.500" }}>
                Terms &amp; Conditions
              </Text>
            </Link>
            <Box
              as="button"
              onClick={handleOpenCookieSettings}
              fontSize="12px"
              color="gray.500"
              _hover={{ color: "accent.500", textDecoration: "underline" }}
              cursor="pointer"
              bg="transparent"
              border="none"
              p={0}
            >
              Cookie Preferences
            </Box>
          </HStack>
        </Flex>
      </Box>
    </Box>
  );
};

export default Footer;
