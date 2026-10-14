import React, { useState } from "react";
import {
  Box,
  Flex,
  GridItem,
  HStack,
  Icon,
  Image,
  Link,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import PageSection from "@/components/layout/PageSection";
import Lightbox, { LightboxImage } from "@/components/common/Lightbox";
import Button from "@/components/ui/button";
import NextLink from "next/link";

// Assets
import HeroBg from "@/assets/hero-bg.jpg";
import gem1 from "@/assets/hero-placeholder.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import village from "@/assets/gar-village.jpg";
import sectionBg from "@/assets/paper-bg.png";
import dining from "@/assets/dining.jpg";
import hut from "@/assets/hut.jpg";
import pool from "@/assets/pool.jpg";
import suite from "@/assets/suite.jpg";
import suite2 from "@/assets/suite2.jpg";

// Icons
import { FaArrowRightLong, FaArrowRight, FaArrowLeft, FaLocationDot, FaWhatsapp } from "react-icons/fa6";
import { MdKingBed, MdLocalLaundryService, MdPool } from "react-icons/md";
import { TbAirConditioning } from "react-icons/tb";
import { PiChefHatBold, PiPlantFill } from "react-icons/pi";
import { BiDumbbell } from "react-icons/bi";
import { FaWifi, FaPray } from "react-icons/fa";
import { ROUTES } from "@/constants/ROUTES";

const GEMS = [
  {
    title: "Luxurious Accommodations",
    subtitle: "Suites & Thatched Huts",
    image: suite.src,
    link: ROUTES.rooms,
  },
  {
    title: "Exquisite Dining",
    subtitle: "Local & Continental",
    image: dining.src,
    link: ROUTES.restaurants,
  },
  {
    title: "The Prayer Hut",
    subtitle: "Spiritual Tranquility",
    image: hut.src,
    link: ROUTES.facilities,
  },
  {
    title: "Serene Pool & Wellness",
    subtitle: "Recreation & Spa",
    image: pool.src,
    link: ROUTES.facilities,
  },
];

const CAMPUSES = [
  {
    title: "GAR Elysian",
    tagline: "Refined Luxury & Modern Elegance",
    description:
      "Experience the height of comfort at GAR Elysian. Featuring Fountain Haven, Oasis Villa, and The Cabana, this campus blends contemporary design with serene garden courtyards and personalized service.",
    image: elysian.src,
    href: `${ROUTES.rooms}?type=elysian`,
    buildings: "The Fountain Haven • The Oasis Villa • The Cabana",
  },
  {
    title: "GAR Village",
    tagline: "Rustic Splendor & Cultural Warmth",
    description:
      "Discover the unique rustic charm of GAR Village. Built with authentic thatched architecture, comfortable modern interiors, and lush surroundings, it is the ideal sanctuary for retreats and family getaways.",
    image: village.src,
    href: `${ROUTES.rooms}?type=village`,
    buildings: "Executive Huts • Presidential Huts (Coming Soon) • Royal Huts",
  },
];

const AMENITIES = [
  { title: "The Prayer Hut", icon: FaPray, highlight: true },
  { title: "Luxury Rooms & Suites", icon: MdKingBed },
  { title: "Air Conditioning", icon: TbAirConditioning },
  { title: "Free High-Speed Wi-Fi", icon: FaWifi },
  { title: "Complimentary Breakfast", icon: PiChefHatBold },
  { title: "Swimming Pool", icon: MdPool },
  { title: "Fitness Center", icon: BiDumbbell },
  { title: "Laundry & Room Service", icon: MdLocalLaundryService },
];

const FACILITIES = [
  {
    title: "Modern Mall & Spa",
    category: "Wellness & Leisure",
    image: pool.src,
    description:
      "A premier leisure destination featuring our relaxation spa, sauna, library lounge, mini-mart, and indoor arcade with human glass facade.",
  },
  {
    title: "The Prayer Hut",
    category: "Spiritual Sanctuary",
    image: hut.src,
    description:
      "A dedicated, quiet Christian retreat pavilion nestled in serene greenery, designed for personal communion, prayer sessions, and meditation.",
  },
  {
    title: "Love Garden & Recreation Park",
    category: "Outdoor Leisure",
    image: gem1.src,
    description:
      "Sprawling umbrella trees, manicured lawns, tennis court, and mini soccer pitch providing rejuvenating family outdoor recreation.",
  },
  {
    title: "Village Mall & Dining Pavilion",
    category: "Culinary Experience",
    image: dining.src,
    description:
      "Sample authentic Yoruba and continental cuisine prepared fresh by expert resort chefs in an open-air rustic dining ambiance.",
  },
];

const GALLERY_PHOTOS: LightboxImage[] = [
  { src: dining.src, alt: "Resort Dining Area", title: "The Olive Branch Dining Hall", category: "Dining" },
  { src: pool.src, alt: "Swimming Pool", title: "Resort Swimming Pool & Sundeck", category: "Recreation" },
  { src: hut.src, alt: "Rustic Thatched Hut", title: "The Executive Thatched Hut", category: "GAR Village" },
  { src: elysian.src, alt: "GAR Elysian Campus", title: "GAR Elysian Courtyard", category: "GAR Elysian" },
  { src: village.src, alt: "GAR Village Campus", title: "GAR Village Grounds", category: "GAR Village" },
  { src: suite.src, alt: "Luxury Suite Interior", title: "Deluxe Suite Living Room", category: "Accommodations" },
  { src: suite2.src, alt: "Premium Bed Setup", title: "The Oasis Villa Bedroom", category: "Accommodations" },
  { src: HeroBg.src, alt: "Sunset Aerial View", title: "Resort Sunset Horizon", category: "Landscape" },
];

export default function Home() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeFacilityIndex, setActiveFacilityIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextFacility = () => {
    setActiveFacilityIndex((prev) => (prev + 1) % FACILITIES.length);
  };

  const prevFacility = () => {
    setActiveFacilityIndex((prev) => (prev - 1 + FACILITIES.length) % FACILITIES.length);
  };

  return (
    <PageWrapper
      title="Grace Arena Resorts — Serene Christian Retreat in Igbo-Ora"
      description="Experience luxury, faith-centered serenity, and rich hospitality in Igbo-Ora, Oyo State. Choose between GAR Elysian luxury suites and GAR Village rustic thatched huts.">
      {/* 1. Hero Section */}
      <Box
        position="relative"
        minH={{ base: "88vh", md: "92vh" }}
        bg={`linear-gradient(rgba(7, 7, 7, 0.45), rgba(7, 7, 7, 0.75)), url(${HeroBg.src})`}
        bgSize="cover"
        bgPos="center"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        px={{ base: 4, md: 8, xl: 12 }}
        pt={{ base: "100px", md: "120px" }}
        pb={{ base: "60px", md: "80px" }}>
        <Stack maxW="58rem" textAlign="center" align="center" gap={{ base: 4, md: 5 }}>
          <Text
            fontSize={{ base: "12px", md: "14px" }}
            fontWeight="bold"
            letterSpacing={{ base: "3px", md: "4px" }}
            color="accent.500"
            textTransform="uppercase">
            A Serene Christian Retreat in Igbo-Ora, Nigeria
          </Text>

          <Text
            as="h1"
            fontSize={{ base: "32px", sm: "42px", md: "56px", lg: "64px" }}
            fontWeight="bold"
            color="white"
            lineHeight={{ base: "1.15", md: "1.1" }}>
            Your Comfort, <br />
            <Text as="span" color="accent.500">
              Our Sacred Priority
            </Text>
          </Text>

          <Text
            fontSize={{ base: "15px", sm: "17px", md: "19px" }}
            color="gray.200"
            maxW="42rem"
            lineHeight="tall">
            Step away from the city hustle into wholesome tranquility. Immerse yourself in refined accommodations,
            the peaceful Prayer Hut, lush landscapes, and authentic Nigerian warmth.
          </Text>

          <HStack gap={4} pt={4} flexWrap="wrap" justify="center">
            <Link href={ROUTES.booking}>
              <Button size="lg" style={{ padding: "14px 36px", fontSize: "15px" }}>
                Book Your Stay
              </Button>
            </Link>
            <Link href={ROUTES.rooms}>
              <Button variant="outline" size="lg" style={{ padding: "14px 32px", fontSize: "15px" }}>
                Explore Rooms &amp; Suites
              </Button>
            </Link>
          </HStack>
        </Stack>

        {/* 4 Floating Gem Cards */}
        <Box w="full" maxW="76rem" mt={{ base: 12, md: 16 }}>
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={{ base: 3, md: 4 }}>
            {GEMS.map(({ title, subtitle, image, link }, i) => (
              <NextLink key={i} href={link} style={{ textDecoration: "none" }}>
                <Box
                    h="150px"
                    bg={`linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%), url(${image})`}
                    bgSize="cover"
                    bgPos="center"
                    borderRadius="14px"
                    p={4}
                    display="flex"
                    flexDirection="column"
                    justifyContent="flex-end"
                    border="1px solid rgba(255, 255, 255, 0.15)"
                    cursor="pointer"
                    transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                    _hover={{
                      transform: "translateY(-4px)",
                      borderColor: "accent.500",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}>
                    <Text fontSize="11px" fontWeight="semibold" color="accent.500" textTransform="uppercase">
                      {subtitle}
                    </Text>
                    <Text fontSize="16px" fontWeight="bold" color="white" mt={0.5}>
                      {title}
                    </Text>
                  </Box>
                </NextLink>
              ))}
          </SimpleGrid>
        </Box>
      </Box>

      {/* 2. Welcome & Christian Retreat Philosophy */}
      <PageSection
        bg={`url(${sectionBg.src})`}
        bgSize="cover"
        bgRepeat="no-repeat"
        bgPos="center"
        py={{ base: 16, md: 20 }}>
        <Stack maxW="52rem" mx="auto" textAlign="center" align="center" gap={4}>
          <Text fontSize="13px" fontWeight="bold" color="accent.600" letterSpacing="3px" textTransform="uppercase">
            Welcome to Grace Arena
          </Text>
          <Text
            fontSize={{ base: "22px", sm: "28px", md: "34px" }}
            fontWeight="semibold"
            color="dark.500"
            lineHeight="shorter">
            &ldquo;Nestled in the heart of Igbo-Ora, the world capital of twins, Grace Arena is a serene Christian
            resort offering a tranquil sanctuary for spiritual renewal, family fellowship, and rest.&rdquo;
          </Text>
          <Box w="80px" h="3px" bg="accent.500" my={2} borderRadius="full" />
          <Text fontSize="15px" color="gray.700" lineHeight="tall">
            Here, every detail is consecrated to wholesome relaxation. Experience private spiritual communion in our
            dedicated <strong>Prayer Hut</strong>, enjoy world-class amenities, and savor peaceful moments surrounded by
            nature.
          </Text>
        </Stack>
      </PageSection>

      {/* 3. Campuses Section (Elysian vs Village) */}
      <Box py={{ base: 14, md: 20 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" color="white">
        <Box maxW="80rem" mx="auto">
          <Stack align="center" textAlign="center" mb={{ base: 10, md: 14 }} gap={2}>
            <Text fontSize="13px" fontWeight="bold" color="accent.500" letterSpacing="3px" textTransform="uppercase">
              Two Distinct Campuses, One Sacred Destination
            </Text>
            <Text fontSize={{ base: "26px", md: "36px" }} fontWeight="bold">
              Choose Your Retreat Ambience
            </Text>
            <Text fontSize="15px" color="gray.400" maxW="38rem">
              Whether you prefer modern luxury suites or authentic thatched village huts, each campus delivers
              uncompromising comfort.
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={{ base: 8, md: 10 }}>
            {CAMPUSES.map(({ title, tagline, description, image, href, buildings }, i) => (
              <Flex
                key={i}
                direction="column"
                borderRadius="24px"
                bg="#111827"
                border="1px solid #1F2937"
                overflow="hidden"
                transition="all 0.3s"
                _hover={{ borderColor: "accent.500", transform: "translateY(-4px)" }}>
                <Box
                  h={{ base: "240px", md: "300px" }}
                  bg={`linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(17, 24, 39, 0.9)), url(${image})`}
                  bgSize="cover"
                  bgPos="center"
                  p={6}
                  display="flex"
                  alignItems="flex-start">
                  <Text
                    bg="rgba(0, 0, 0, 0.7)"
                    color="accent.500"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="12px"
                    fontWeight="bold"
                    backdropFilter="blur(4px)">
                    {title === "GAR Elysian" ? "Luxury Tier" : "Rustic Experience"}
                  </Text>
                </Box>

                <Stack p={{ base: 6, md: 8 }} gap={3} flex="1" justify="space-between">
                  <Stack gap={2}>
                    <Text fontSize="22px" fontWeight="bold" color="white">
                      {title}
                    </Text>
                    <Text fontSize="13px" color="accent.500" fontWeight="medium">
                      {tagline}
                    </Text>
                    <Text fontSize="14px" color="gray.300" lineHeight="tall">
                      {description}
                    </Text>
                    <Text fontSize="12px" color="gray.400" fontStyle="italic" pt={1}>
                      Includes: {buildings}
                    </Text>
                  </Stack>

                  <Box pt={4}>
                    <NextLink href={href} style={{ textDecoration: "none" }}>
                      <HStack
                        color="accent.500"
                        fontWeight="bold"
                        fontSize="14px"
                        letterSpacing="wider"
                        textTransform="uppercase"
                        _hover={{ color: "white" }}>
                        <Text>View {title} Rooms</Text>
                        <Icon as={FaArrowRightLong} />
                      </HStack>
                    </NextLink>
                  </Box>
                </Stack>
              </Flex>
            ))}
          </SimpleGrid>
        </Box>
      </Box>

      {/* 4. Amenities Snapshot with Prayer Hut First-Class Feature */}
      <Box py={{ base: 16, md: 20 }} px={{ base: 4, md: 8, xl: 12 }} bg="#0B132B" color="white">
        <Box maxW="80rem" mx="auto">
          <SimpleGrid columns={{ base: 1, lg: 12 }} gap={{ base: 8, lg: 12 }} alignContent="center">
            {/* Left Description Column */}
            <GridItem colSpan={{ base: 1, lg: 5 }}>
              <Stack gap={4}>
                <Text
                  fontSize="12px"
                  fontWeight="bold"
                  color="accent.500"
                  letterSpacing="3px"
                  textTransform="uppercase">
                  Elevated Hospitality
                </Text>
                <Text fontSize={{ base: "26px", md: "34px" }} fontWeight="bold" lineHeight="shorter">
                  Thoughtfully Curated Amenities for Body, Soul, &amp; Spirit
                </Text>
                <Text fontSize="15px" color="gray.300" lineHeight="tall">
                  At Grace Arena Resorts, we prioritize your peace of mind. Every room package grants you seamless
                  access to recreational spaces, wellness centers, and our distinguished <strong>Prayer Hut</strong>.
                </Text>

                <Box pt={3}>
                  <Link href={ROUTES.facilities}>
                    <Button variant="primary" size="md">
                      Explore All Facilities
                    </Button>
                  </Link>
                </Box>
              </Stack>
            </GridItem>

            {/* Right Amenities 4x2 Grid */}
            <GridItem colSpan={{ base: 1, lg: 7 }}>
              <SimpleGrid columns={{ base: 2, sm: 4 }} gap={4}>
                {AMENITIES.map(({ title, icon, highlight }, i) => (
                  <Flex
                    key={i}
                    direction="column"
                    align="center"
                    justify="center"
                    p={4}
                    minH="130px"
                    bg={highlight ? "rgba(252, 202, 70, 0.12)" : "rgba(255, 255, 255, 0.04)"}
                    border="1px solid"
                    borderColor={highlight ? "accent.500" : "rgba(255, 255, 255, 0.1)"}
                    borderRadius="14px"
                    textAlign="center"
                    transition="all 0.2s"
                    _hover={{ bg: "rgba(255, 255, 255, 0.1)", transform: "translateY(-3px)" }}>
                    <Icon as={icon} boxSize={7} color={highlight ? "accent.500" : "#E2E8F0"} mb={2.5} />
                    <Text fontSize="13px" fontWeight="semibold" color={highlight ? "accent.500" : "white"}>
                      {title}
                    </Text>
                  </Flex>
                ))}
              </SimpleGrid>
            </GridItem>
          </SimpleGrid>
        </Box>
      </Box>

      {/* 5. Facilities Showcase with Interactive Navigation */}
      <Box py={{ base: 16, md: 20 }} px={{ base: 4, md: 8, xl: 12 }} bg="#F1F5F9">
        <Box maxW="80rem" mx="auto">
          <Flex
            justify="space-between"
            align={{ base: "flex-start", sm: "flex-end" }}
            mb={{ base: 8, md: 10 }}
            flexDir={{ base: "column", sm: "row" }}
            gap={4}>
            <Stack gap={1}>
              <Text fontSize="13px" fontWeight="bold" color="accent.600" letterSpacing="3px" textTransform="uppercase">
                Recreation &amp; Gathering
              </Text>
              <Text fontSize={{ base: "26px", md: "34px" }} fontWeight="bold" color="#0F172A">
                Our Signature Facilities
              </Text>
            </Stack>

            <HStack gap={3}>
              <Box
                as="button"
                onClick={prevFacility}
                boxSize={10}
                borderRadius="full"
                bg="white"
                border="1px solid #CBD5E1"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="#0F172A"
                cursor="pointer"
                _hover={{ bg: "accent.500", borderColor: "accent.500" }}
                aria-label="Previous facility">
                <Icon as={FaArrowLeft} boxSize={3.5} />
              </Box>
              <Box
                as="button"
                onClick={nextFacility}
                boxSize={10}
                borderRadius="full"
                bg="white"
                border="1px solid #CBD5E1"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="#0F172A"
                cursor="pointer"
                _hover={{ bg: "accent.500", borderColor: "accent.500" }}
                aria-label="Next facility">
                <Icon as={FaArrowRight} boxSize={3.5} />
              </Box>
            </HStack>
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
            {[
              FACILITIES[activeFacilityIndex % FACILITIES.length],
              FACILITIES[(activeFacilityIndex + 1) % FACILITIES.length],
              FACILITIES[(activeFacilityIndex + 2) % FACILITIES.length],
            ].map((facility, idx) => (
              <Box
                key={idx}
                bg="white"
                borderRadius="18px"
                overflow="hidden"
                boxShadow="0 4px 20px rgba(0,0,0,0.06)"
                border="1px solid #E2E8F0"
                display="flex"
                flexDirection="column">
                <Box h="220px" bg={`url(${facility.image})`} bgSize="cover" bgPos="center" position="relative">
                  <Text
                    position="absolute"
                    top={4}
                    left={4}
                    bg="rgba(15, 23, 42, 0.85)"
                    color="accent.500"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="11px"
                    fontWeight="bold">
                    {facility.category}
                  </Text>
                </Box>
                <Stack p={6} gap={2} flex="1" justify="space-between">
                  <Stack gap={1.5}>
                    <Text fontSize="19px" fontWeight="bold" color="#0F172A">
                      {facility.title}
                    </Text>
                    <Text fontSize="13px" color="#64748B" lineHeight="tall">
                      {facility.description}
                    </Text>
                  </Stack>
                  <Link href={ROUTES.facilities} pt={2}>
                    <Text fontSize="13px" fontWeight="bold" color="accent.600" _hover={{ textDecoration: "underline" }}>
                      Learn More &rarr;
                    </Text>
                  </Link>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </Box>

      {/* 6. Photo Gallery with Full Lightbox Support (SRS 3.1 Item 5) */}
      <Box py={{ base: 16, md: 20 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" color="white">
        <Box maxW="80rem" mx="auto">
          <Stack align="center" textAlign="center" mb={{ base: 10, md: 12 }} gap={2}>
            <Text fontSize="13px" fontWeight="bold" color="accent.500" letterSpacing="3px" textTransform="uppercase">
              Visual Journey
            </Text>
            <Text fontSize={{ base: "26px", md: "36px" }} fontWeight="bold">
              Resort Photo Gallery
            </Text>
            <Text fontSize="14px" color="gray.400">
              Click any photo to explore our serene grounds, luxury interiors, and lush surroundings.
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
            {GALLERY_PHOTOS.map((photo, i) => (
              <Box
                key={i}
                position="relative"
                h={{ base: "200px", md: "240px" }}
                borderRadius="14px"
                overflow="hidden"
                cursor="pointer"
                onClick={() => openLightbox(i)}
                role="button"
                tabIndex={0}
                aria-label={`View photo: ${photo.title}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openLightbox(i);
                  }
                }}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  w="full"
                  h="full"
                  objectFit="cover"
                  transition="all 0.4s ease"
                  _hover={{ transform: "scale(1.08)" }}
                />
                <Box
                  position="absolute"
                  inset={0}
                  bg="linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)"
                  p={4}
                  display="flex"
                  flexDirection="column"
                  justifyContent="flex-end"
                  opacity={{ base: 1, md: 0 }}
                  _hover={{ opacity: 1 }}
                  transition="opacity 0.2s">
                  <Text fontSize="11px" fontWeight="bold" color="accent.500" textTransform="uppercase">
                    {photo.category}
                  </Text>
                  <Text fontSize="14px" fontWeight="semibold" color="white">
                    {photo.title}
                  </Text>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </Box>

      {/* 7. Location & Map Section (SRS 3.1 Item 6) */}
      <Box py={{ base: 16, md: 20 }} px={{ base: 4, md: 8, xl: 12 }} bg="white" color="#0F172A">
        <Box maxW="80rem" mx="auto">
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={{ base: 8, lg: 12 }} alignItems="center">
            <Stack gap={4}>
              <Text fontSize="13px" fontWeight="bold" color="accent.600" letterSpacing="3px" textTransform="uppercase">
                Finding Serenity
              </Text>
              <Text fontSize={{ base: "26px", md: "36px" }} fontWeight="bold" lineHeight="shorter">
                Located in Igbo-Ora — The Land of Twins
              </Text>
              <Text fontSize="15px" color="#475569" lineHeight="tall">
                Grace Arena Resorts is situated in the peaceful, scenic town of Igbo-Ora, Oyo State, famous globally
                for having the world&apos;s highest rate of twin births and surrounded by refreshing agrarian serenity.
              </Text>

              <Stack gap={3} pt={2}>
                <HStack gap={3} align="flex-start">
                  <Icon as={FaLocationDot} color="accent.500" boxSize={5} mt={1} />
                  <Box>
                    <Text fontSize="14px" fontWeight="bold">
                      Resort Campus Address
                    </Text>
                    <Text fontSize="13px" color="#64748B">
                      Grace Arena Resorts, Igbo-Ora, Ibarapa Central Local Government, Oyo State, Nigeria
                    </Text>
                  </Box>
                </HStack>
              </Stack>

              <HStack gap={4} pt={4} flexWrap="wrap">
                <a
                  href="https://maps.google.com/?q=Igbo-Ora+Oyo+State+Nigeria"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}>
                  <Button variant="primary" size="md">
                    Get Driving Directions
                  </Button>
                </a>
                <a
                  href="https://wa.me/2348123456789?text=Hello%20Grace%20Arena,%20I%20need%20directions%20to%20the%20resort."
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}>
                  <HStack
                    px={5}
                    py={3}
                    borderRadius="8px"
                    border="1px solid #25D366"
                    color="#16a34a"
                    _hover={{ bg: "rgba(37, 211, 102, 0.08)" }}
                    cursor="pointer">
                    <Icon as={FaWhatsapp} boxSize={4} />
                    <Text fontSize="14px" fontWeight="bold">
                      WhatsApp Dispatch Assistance
                    </Text>
                  </HStack>
                </a>
              </HStack>
            </Stack>

            {/* Map Frame / Card */}
            <Box
              h={{ base: "320px", md: "380px" }}
              borderRadius="20px"
              overflow="hidden"
              boxShadow="0 10px 30px rgba(0,0,0,0.1)"
              border="1px solid #CBD5E1"
              position="relative">
              <iframe
                title="Grace Arena Resorts Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126435.53982449757!2d3.20815185!3d7.433333!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x10398bb2c2b3c299%3A0x6b63d91cf97ceea7!2sIgbo-Ora%2C%20Oyo!5e0!3m2!1sen!2sng!4v1700000000000"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Box>
          </SimpleGrid>
        </Box>
      </Box>

      {/* Lightbox Modal */}
      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={GALLERY_PHOTOS}
        currentIndex={lightboxIndex}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
      />
    </PageWrapper>
  );
}
