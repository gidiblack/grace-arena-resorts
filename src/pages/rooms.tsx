import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Image,
  Link,
  SimpleGrid,
  Stack,
  Text,
  Badge,
  Dialog,
} from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/button";
import NotifyMeModal from "@/components/common/NotifyMeModal";
import { ROUTES } from "@/constants/ROUTES";

// Assets
import suite from "@/assets/suite.jpg";
import suite2 from "@/assets/suite2.jpg";
import hut from "@/assets/hut.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import village from "@/assets/gar-village.jpg";

// Icons
import {
  FaBed,
  FaUsers,
  FaWifi,
  FaPray,
  FaTv,
  FaCoffee,
  FaWhatsapp,
  FaHardHat,
  FaCheck,
  FaTimes,
  FaSnowflake,
} from "react-icons/fa";
import { MdLocalLaundryService, MdPool, MdFitnessCenter } from "react-icons/md";

export interface RoomItem {
  id: string;
  name: string;
  building: string;
  campus: "elysian" | "village";
  campusTitle: string;
  tier: "Standard" | "Deluxe" | "Premium" | "Executive" | "Presidential" | "Royal";
  tierColor: string;
  priceNgn: number | null;
  maxGuests: number | null;
  image: string;
  isUnderConstruction?: boolean;
  shortDesc: string;
  keyAmenities: string[];
  inRoomAmenities: string[];
  resortAmenities: string[];
}

const ROOMS_DATA: RoomItem[] = [
  // GAR Elysian
  {
    id: "elysian-fountain-standard",
    name: "Standard Room",
    building: "The Fountain Haven",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Standard",
    tierColor: "#3B82F6",
    priceNgn: 60000,
    maxGuests: 2,
    image: suite2.src,
    shortDesc: "Cozy refined room with comfortable king bed, vanity setup, and garden views.",
    keyAmenities: [
      "King Bed (6×6)",
      "Air Conditioning",
      "Prayer Hut Access",
      "Free Wi-Fi",
      "Complimentary Breakfast",
    ],
    inRoomAmenities: [
      "King-size bed 6×6",
      "Air conditioner & Standing Fan",
      "Mini refrigerator",
      "Vanity table & mirror",
      "Complimentary breakfast for one",
      "Bath amenities vanity kit",
      "Water heater",
      "Tea & coffee making facilities",
      "Cable TV (DStv) / Netflix",
      "Intercom phone",
      "Welcome bottle of water",
    ],
    resortAmenities: [
      "Dedicated Prayer Hut",
      "Swimming Pool & Sundeck",
      "Fitness Center access",
      "24/7 Security",
    ],
  },
  {
    id: "elysian-fountain-deluxe",
    name: "Deluxe Room",
    building: "The Fountain Haven",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Deluxe",
    tierColor: "#10B981",
    priceNgn: 70000,
    maxGuests: 2,
    image: suite.src,
    shortDesc:
      "Spacious deluxe comfort featuring relaxation chairs, upgraded vanity, and lush garden vistas.",
    keyAmenities: [
      "King Bed",
      "Relaxation Chairs",
      "Prayer Hut Access",
      "Upgraded Bath Kit",
      "Free Wi-Fi",
    ],
    inRoomAmenities: [
      "King-size bed & Bed lamps",
      "Air conditioning & standing fan",
      "Relaxation chairs & coffee table",
      "Mini refrigerator",
      "Deluxe vanity kit (soap, bath gel, body cream, shampoo)",
      "Water heater",
      "Complimentary breakfast for one",
      "Tea & coffee facilities",
      "Cable TV (DStv)",
      "Intercom phone",
      "Welcome pack (water, drink & biscuits)",
    ],
    resortAmenities: [
      "The Prayer Hut",
      "Gym & Pool access",
      "Full resort grounds access",
      "Daily room service",
    ],
  },
  {
    id: "elysian-oasis-deluxe-suite",
    name: "Deluxe Suite with Kitchenette",
    building: "The Oasis Villa",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Deluxe",
    tierColor: "#10B981",
    priceNgn: 80000,
    maxGuests: 2,
    image: suite2.src,
    shortDesc:
      "Downstairs private apartment featuring dedicated kitchenette, microwave, and living area.",
    keyAmenities: [
      "Private Kitchenette",
      "Microwave & Cooktop",
      "Prayer Hut Access",
      "King Bed",
      "Satellite TV",
    ],
    inRoomAmenities: [
      "Exclusive suite with bedroom & kitchenette",
      "Kitchenette (sink, cupboard, small cooktop)",
      "Microwave & mini refrigerator",
      "King-size bed",
      "Air conditioner & standing fan",
      "Vanity table / full-length mirror",
      "Complimentary breakfast for one",
      "Satellite TV",
      "Intercom phone",
      "Welcome drink",
    ],
    resortAmenities: [
      "Prayer Hut reservation",
      "Pool & Fitness Center",
      "Laundry & Ironing services",
    ],
  },
  {
    id: "elysian-oasis-premium-suite",
    name: "Premium Suite Apartment",
    building: "The Oasis Villa",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Premium",
    tierColor: "#8B5CF6",
    priceNgn: 90000,
    maxGuests: 2,
    image: suite.src,
    shortDesc:
      "Elevated apartment with independent living room, private kitchenette, and scenic balcony view.",
    keyAmenities: [
      "Separate Living Room",
      "Kitchenette",
      "Prayer Hut Access",
      "Balcony View",
      "Microwave",
    ],
    inRoomAmenities: [
      "Separate living room & bedroom",
      "Kitchenette with cooktop & microwave",
      "King-size plush bedding",
      "Air conditioner in both rooms",
      "Smart TV with streaming",
      "Complimentary breakfast for one",
      "Premium bath products",
    ],
    resortAmenities: [
      "The Prayer Hut",
      "Modern Mall access",
      "Recreation Park tennis",
      "Swimming pool",
    ],
  },
  {
    id: "elysian-cabana-premium",
    name: "The Cabana Premium Suite",
    building: "The Cabana",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Premium",
    tierColor: "#8B5CF6",
    priceNgn: 120000,
    maxGuests: 2,
    image: elysian.src,
    shortDesc:
      "Our flagship luxury cabana suite offering panoramic resort views and bespoke interior styling.",
    keyAmenities: [
      "Cabana Terrace",
      "VIP Lounge Access",
      "Prayer Hut Access",
      "King Bed",
      "Priority Service",
    ],
    inRoomAmenities: [
      "Expansive cabana terrace",
      "Super king bed",
      "High-power AC & mood lighting",
      "Fully stocked minibar (non-alcoholic)",
      "Nespresso coffee machine",
      "Luxury bathrobes and slippers",
      "Smart 55-inch TV",
    ],
    resortAmenities: [
      "VIP Prayer Hut slots",
      "Pool cabana reservation",
      "Concierge dining support",
    ],
  },
  {
    id: "elysian-cabana-executive",
    name: "The Cabana Executive Twin Suite",
    building: "The Cabana",
    campus: "elysian",
    campusTitle: "GAR Elysian",
    tier: "Executive",
    tierColor: "#F59E0B",
    priceNgn: 180000,
    maxGuests: 4,
    image: suite.src,
    shortDesc:
      "Grand twin suite ideal for families or retreat leaders. Accommodates up to 4 guests with luxury amenities.",
    keyAmenities: [
      "Sleeps 4 Guests",
      "Twin Bedrooms",
      "Prayer Hut Access",
      "Spacious Lounge",
      "Kitchenette",
    ],
    inRoomAmenities: [
      "Twin double bedrooms with en-suite baths",
      "Expansive communal lounge",
      "Dining table for four",
      "Full kitchenette & microwave",
      "Air conditioning throughout",
      "Complimentary breakfast for guests",
    ],
    resortAmenities: [
      "Prayer Hut access",
      "Love Garden access",
      "Spa priority bookings",
      "Pool deck",
    ],
  },

  // GAR Village
  {
    id: "village-executive-hut",
    name: "Executive Thatched Hut",
    building: "Executive Huts",
    campus: "village",
    campusTitle: "GAR Village",
    tier: "Executive",
    tierColor: "#F59E0B",
    priceNgn: 100000,
    maxGuests: 2,
    image: hut.src,
    shortDesc:
      "Handcrafted traditional thatched hut equipped with ultra-modern interior luxuries and serene privacy.",
    keyAmenities: [
      "Authentic Thatched Roof",
      "King Bed",
      "Prayer Hut Access",
      "Private Veranda",
      "Modern AC",
    ],
    inRoomAmenities: [
      "Naturally insulated thatched architecture",
      "King bed with artisanal wooden frame",
      "Split AC and ceiling fan",
      "Modern luxury bathroom & rain shower",
      "Mini refrigerator & electric kettle",
      "Complimentary breakfast",
      "Flat-screen satellite TV",
      "Private outdoor veranda",
    ],
    resortAmenities: [
      "Direct Prayer Hut path",
      "Village Mall cuisine",
      "Recreation Park",
      "Fire pit evening gatherings",
    ],
  },
  {
    id: "village-presidential-hut",
    name: "Presidential Thatched Hut",
    building: "Presidential Huts",
    campus: "village",
    campusTitle: "GAR Village",
    tier: "Presidential",
    tierColor: "#DC2626",
    priceNgn: null,
    maxGuests: null,
    image: village.src,
    isUnderConstruction: true,
    shortDesc:
      "Grand presidential pavilion featuring dual master bedrooms, private dipping pool, and butler pantry.",
    keyAmenities: [
      "Private Dipping Pool",
      "Dual Master Suites",
      "Dedicated Prayer Space",
      "Under Construction",
    ],
    inRoomAmenities: [
      "Multi-room luxury thatched pavilion",
      "Private plunge pool and sun lounge",
      "Chef preparation pantry",
      "Walk-in dressing rooms and marble tubs",
    ],
    resortAmenities: ["Priority access to all GAR facilities", "Dedicated Prayer Hut reservation"],
  },
  {
    id: "village-royal-hut",
    name: "Royal Thatched Hut",
    building: "Royal Huts",
    campus: "village",
    campusTitle: "GAR Village",
    tier: "Royal",
    tierColor: "#9333EA",
    priceNgn: null,
    maxGuests: null,
    image: hut.src,
    isUnderConstruction: true,
    shortDesc:
      "The pinnacle of African royal heritage. Designed for dignitaries, executive retreats, and family royalty.",
    keyAmenities: [
      "Royal Courtyard",
      "Grand Throne Lounge",
      "VIP Security Perimeter",
      "Under Construction",
    ],
    inRoomAmenities: [
      "Sprawling imperial thatched lodge",
      "Private meeting salon and dining hall",
      "Full security quarter connectivity",
    ],
    resortAmenities: ["All-inclusive resort access", "Private Prayer Hut sanctuary"],
  },
];

export default function RoomsPage() {
  const router = useRouter();
  const [selectedCampus, setSelectedCampus] = useState<"all" | "elysian" | "village">("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");

  // Modals state
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyRoom, setNotifyRoom] = useState<{ title: string; campus: string }>({
    title: "",
    campus: "",
  });

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeRoomDetails, setActiveRoomDetails] = useState<RoomItem | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const type = router.query.type;
    if (type === "elysian" || type === "village") {
      const timer = setTimeout(() => {
        setSelectedCampus(type);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [router.isReady, router.query.type]);

  const handleCampusChange = (campus: "all" | "elysian" | "village") => {
    setSelectedCampus(campus);
    if (campus === "all") {
      router.push("/rooms", undefined, { shallow: true });
    } else {
      router.push(`/rooms?type=${campus}`, undefined, { shallow: true });
    }
  };

  const handleOpenNotify = (room: RoomItem) => {
    setNotifyRoom({ title: room.name, campus: room.campusTitle });
    setNotifyModalOpen(true);
  };

  const handleOpenDetails = (room: RoomItem) => {
    setActiveRoomDetails(room);
    setDetailsModalOpen(true);
  };

  const filteredRooms = ROOMS_DATA.filter((room) => {
    const campusMatch = selectedCampus === "all" || room.campus === selectedCampus;
    const tierMatch = selectedTier === "all" || room.tier === selectedTier;
    return campusMatch && tierMatch;
  });

  return (
    <PageWrapper
      title="Rooms & Suites — Grace Arena Resorts"
      description="Browse available luxury suites and authentic thatched huts across GAR Elysian and GAR Village in Igbo-Ora, Nigeria."
    >
      {/* Header Banner */}
      <Box
        bg="linear-gradient(rgba(7, 7, 7, 0.7), rgba(7, 7, 7, 0.9)), #070707"
        pt={{ base: "100px", md: "130px" }}
        pb={{ base: 12, md: 16 }}
        px={{ base: 4, md: 8 }}
        color="white"
        textAlign="center"
      >
        <Stack maxW="50rem" mx="auto" gap={3} align="center">
          <Text
            fontSize="12px"
            fontWeight="bold"
            color="accent.500"
            letterSpacing="3px"
            textTransform="uppercase"
          >
            Wholesome Retreat Living
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "46px" }} fontWeight="bold">
            Rooms &amp; Thatched Suites
          </Text>
          <Text fontSize="15px" color="gray.300" maxW="40rem">
            Choose between modern architectural refinement at <strong>GAR Elysian</strong> or
            authentic thatched heritage at <strong>GAR Village</strong>. All rooms enjoy
            complimentary breakfast and access to our distinguished <strong>Prayer Hut</strong>.
          </Text>

          <HStack gap={4} pt={4} flexWrap="wrap" justify="center">
            <Link href={ROUTES.booking}>
              <Button size="md" style={{ padding: "10px 28px" }}>
                Book Your Stay
              </Button>
            </Link>
            <a
              href="https://wa.me/2348123456789?text=Hello%20Grace%20Arena%20Resorts,%20I%20want%20to%20inquire%20about%20room%20availability."
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <HStack
                px={4}
                py={2.5}
                borderRadius="8px"
                border="1px solid #25D366"
                color="#25D366"
                _hover={{ bg: "rgba(37, 211, 102, 0.1)" }}
                cursor="pointer"
              >
                <Icon as={FaWhatsapp} boxSize={4} />
                <Text fontSize="14px" fontWeight="bold">
                  Contact via WhatsApp
                </Text>
              </HStack>
            </a>
          </HStack>
        </Stack>
      </Box>

      {/* Filter Bar (SRS 3.2 item 2) */}
      <Box
        bg="#0F172A"
        borderBottom="1px solid #1E293B"
        px={{ base: 4, md: 8 }}
        py={4}
        position="sticky"
        top="64px"
        zIndex={20}
      >
        <Flex
          maxW="82rem"
          mx="auto"
          flexDir={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          gap={4}
        >
          {/* Campus Selector */}
          <HStack gap={2} bg="#1E293B" p={1} borderRadius="12px" flexWrap="wrap">
            <Box
              as="button"
              onClick={() => handleCampusChange("all")}
              px={4}
              py={2}
              borderRadius="8px"
              fontSize="13px"
              fontWeight="bold"
              bg={selectedCampus === "all" ? "accent.500" : "transparent"}
              color={selectedCampus === "all" ? "dark.500" : "gray.300"}
              cursor="pointer"
              transition="all 0.2s"
            >
              All Campuses ({ROOMS_DATA.length})
            </Box>
            <Box
              as="button"
              onClick={() => handleCampusChange("elysian")}
              px={4}
              py={2}
              borderRadius="8px"
              fontSize="13px"
              fontWeight="bold"
              bg={selectedCampus === "elysian" ? "accent.500" : "transparent"}
              color={selectedCampus === "elysian" ? "dark.500" : "gray.300"}
              cursor="pointer"
              transition="all 0.2s"
            >
              GAR Elysian (6)
            </Box>
            <Box
              as="button"
              onClick={() => handleCampusChange("village")}
              px={4}
              py={2}
              borderRadius="8px"
              fontSize="13px"
              fontWeight="bold"
              bg={selectedCampus === "village" ? "accent.500" : "transparent"}
              color={selectedCampus === "village" ? "dark.500" : "gray.300"}
              cursor="pointer"
              transition="all 0.2s"
            >
              GAR Village (3)
            </Box>
          </HStack>

          {/* Tier Selector */}
          <HStack gap={2} overflowX="auto" w={{ base: "full", md: "auto" }}>
            <Text fontSize="12px" color="gray.400" display={{ base: "none", lg: "inline" }}>
              Tier:
            </Text>
            {["all", "Standard", "Deluxe", "Premium", "Executive"].map((tier) => (
              <Box
                key={tier}
                as="button"
                onClick={() => setSelectedTier(tier)}
                px={3}
                py={1.5}
                borderRadius="full"
                fontSize="12px"
                fontWeight="semibold"
                border="1px solid"
                borderColor={selectedTier === tier ? "accent.500" : "#334155"}
                bg={selectedTier === tier ? "rgba(252, 202, 70, 0.15)" : "transparent"}
                color={selectedTier === tier ? "accent.500" : "gray.300"}
                cursor="pointer"
                whiteSpace="nowrap"
              >
                {tier === "all" ? "All Tiers" : tier}
              </Box>
            ))}
          </HStack>
        </Flex>
      </Box>

      {/* Rooms Grid */}
      <Box py={{ base: 12, md: 16 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" minH="60vh">
        <Box maxW="82rem" mx="auto">
          {filteredRooms.length === 0 ? (
            <Stack align="center" textAlign="center" py={16} gap={3}>
              <Text fontSize="20px" fontWeight="bold" color="white">
                No rooms match your filter.
              </Text>
              <Text fontSize="14px" color="gray.400">
                Try selecting &ldquo;All Campuses&rdquo; or clearing tier filters.
              </Text>
              <Button
                onClick={() => {
                  setSelectedCampus("all");
                  setSelectedTier("all");
                }}
              >
                Reset Filters
              </Button>
            </Stack>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={8}>
              {filteredRooms.map((room) => {
                const isUnderConstruction = room.isUnderConstruction;

                return (
                  <Flex
                    key={room.id}
                    direction="column"
                    borderRadius="20px"
                    bg={isUnderConstruction ? "#131620" : "#0F172A"}
                    border="1px solid"
                    borderColor={isUnderConstruction ? "amber.600/40" : "#1E293B"}
                    overflow="hidden"
                    boxShadow="0 10px 30px rgba(0,0,0,0.4)"
                    position="relative"
                    transition="all 0.3s"
                    _hover={{
                      transform: "translateY(-4px)",
                      borderColor: isUnderConstruction ? "amber.500" : "accent.500",
                    }}
                  >
                    {/* Image Area */}
                    <Box h="230px" position="relative" bg="#1E293B" overflow="hidden">
                      <Image
                        src={room.image}
                        alt={room.name}
                        w="full"
                        h="full"
                        objectFit="cover"
                        filter={isUnderConstruction ? "grayscale(40%)" : "none"}
                        transition="transform 0.4s ease"
                        _hover={{ transform: "scale(1.05)" }}
                      />

                      {/* Badges Overlay */}
                      <Flex
                        position="absolute"
                        top={3}
                        left={3}
                        right={3}
                        justify="space-between"
                        align="center"
                      >
                        <Badge
                          bg={room.tierColor}
                          color="white"
                          px={2.5}
                          py={1}
                          borderRadius="full"
                          fontSize="11px"
                          fontWeight="bold"
                          boxShadow="sm"
                        >
                          {room.tier} Tier
                        </Badge>

                        {isUnderConstruction ? (
                          <HStack
                            bg="#F59E0B"
                            color="black"
                            px={2.5}
                            py={1}
                            borderRadius="full"
                            gap={1.5}
                          >
                            <Icon as={FaHardHat} boxSize={3} />
                            <Text fontSize="11px" fontWeight="bold">
                              Under Construction
                            </Text>
                          </HStack>
                        ) : (
                          <HStack
                            bg="blackAlpha.700"
                            color="white"
                            px={2.5}
                            py={1}
                            borderRadius="full"
                            gap={1}
                          >
                            <Icon as={FaUsers} boxSize={3} color="accent.500" />
                            <Text fontSize="11px" fontWeight="medium">
                              Up to {room.maxGuests} Guests
                            </Text>
                          </HStack>
                        )}
                      </Flex>
                    </Box>

                    {/* Content Details */}
                    <Stack p={6} gap={4} flex="1" justify="space-between">
                      <Stack gap={2}>
                        <Text
                          fontSize="11px"
                          fontWeight="bold"
                          color="accent.500"
                          textTransform="uppercase"
                        >
                          {room.campusTitle} • {room.building}
                        </Text>
                        <Text fontSize="20px" fontWeight="bold" color="white">
                          {room.name}
                        </Text>
                        <Text fontSize="13px" color="gray.300" lineHeight="tall">
                          {room.shortDesc}
                        </Text>

                        {/* Top Key Amenities Summary (Prayer Hut always highlighted) */}
                        <Box pt={2} borderTop="1px solid #1E293B">
                          <Text
                            fontSize="11px"
                            fontWeight="bold"
                            color="gray.400"
                            mb={2}
                            textTransform="uppercase"
                          >
                            Key Features &amp; Inclusions:
                          </Text>
                          <Stack gap={1.5}>
                            {room.keyAmenities.map((amenity, i) => (
                              <HStack key={i} gap={2}>
                                <Icon
                                  as={amenity.includes("Prayer") ? FaPray : FaCheck}
                                  boxSize={3}
                                  color={amenity.includes("Prayer") ? "accent.500" : "green.400"}
                                />
                                <Text
                                  fontSize="12px"
                                  color={amenity.includes("Prayer") ? "accent.500" : "gray.300"}
                                  fontWeight={amenity.includes("Prayer") ? "bold" : "normal"}
                                >
                                  {amenity}
                                </Text>
                              </HStack>
                            ))}
                          </Stack>
                        </Box>
                      </Stack>

                      {/* Pricing & CTA */}
                      <Box pt={3} borderTop="1px solid #1E293B">
                        <Flex justify="space-between" align="baseline" mb={4}>
                          <Text fontSize="12px" color="gray.400">
                            Rate per night:
                          </Text>
                          <Text
                            fontSize="20px"
                            fontWeight="bold"
                            color={isUnderConstruction ? "#F59E0B" : "accent.500"}
                          >
                            {isUnderConstruction
                              ? "Price TBD"
                              : `₦${room.priceNgn?.toLocaleString()}`}
                          </Text>
                        </Flex>

                        <Flex gap={2}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenDetails(room)}
                            style={{ flex: 1, fontSize: "12px", padding: "8px" }}
                          >
                            View Details
                          </Button>

                          {isUnderConstruction ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenNotify(room)}
                              style={{
                                flex: 1.2,
                                fontSize: "12px",
                                padding: "8px",
                                backgroundColor: "#F59E0B",
                                color: "#000",
                              }}
                            >
                              Notify Me
                            </Button>
                          ) : (
                            <Link href={`${ROUTES.booking}?room=${room.id}`} style={{ flex: 1.2 }}>
                              <Button
                                size="sm"
                                style={{ width: "100%", fontSize: "12px", padding: "8px" }}
                              >
                                Book This Room
                              </Button>
                            </Link>
                          )}
                        </Flex>
                      </Box>
                    </Stack>
                  </Flex>
                );
              })}
            </SimpleGrid>
          )}
        </Box>
      </Box>

      {/* Under Construction Notify Modal */}
      <NotifyMeModal
        isOpen={notifyModalOpen}
        onClose={() => setNotifyModalOpen(false)}
        roomTitle={notifyRoom.title}
        campusName={notifyRoom.campus}
      />

      {/* Full Amenities Detail Dialog (SRS 3.2 Item 5) */}
      <Dialog.Root
        open={detailsModalOpen}
        onOpenChange={(details) => setDetailsModalOpen(details.open)}
      >
        <Dialog.Backdrop bg="blackAlpha.850" backdropFilter="blur(8px)" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="#0F172A"
            color="light.500"
            border="1px solid #334155"
            borderRadius="20px"
            p={{ base: 5, md: 8 }}
            maxW="620px"
            w="92vw"
            boxShadow="2xl"
          >
            {activeRoomDetails && (
              <>
                <Flex justify="space-between" align="flex-start" mb={4}>
                  <Box>
                    <Text
                      fontSize="12px"
                      fontWeight="bold"
                      color="accent.500"
                      textTransform="uppercase"
                    >
                      {activeRoomDetails.campusTitle} • {activeRoomDetails.building}
                    </Text>
                    <Dialog.Title fontSize="22px" fontWeight="bold" color="white">
                      {activeRoomDetails.name}
                    </Dialog.Title>
                  </Box>
                  <Box
                    as="button"
                    onClick={() => setDetailsModalOpen(false)}
                    p={1.5}
                    borderRadius="md"
                    _hover={{ bg: "#1E293B" }}
                    cursor="pointer"
                  >
                    <Icon as={FaTimes} boxSize={5} color="gray.400" />
                  </Box>
                </Flex>

                <Stack gap={5} my={2}>
                  {/* In-Room Amenities */}
                  <Box>
                    <Text
                      fontSize="14px"
                      fontWeight="bold"
                      color="accent.500"
                      mb={3}
                      textTransform="uppercase"
                    >
                      In-Room Amenities
                    </Text>
                    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2.5}>
                      {activeRoomDetails.inRoomAmenities.map((item, idx) => (
                        <HStack key={idx} gap={2} align="flex-start">
                          <Icon as={FaCheck} color="accent.500" boxSize={3.5} mt={1} />
                          <Text fontSize="13px" color="gray.300">
                            {item}
                          </Text>
                        </HStack>
                      ))}
                    </SimpleGrid>
                  </Box>

                  {/* Resort Amenities */}
                  <Box pt={3} borderTop="1px solid #1E293B">
                    <Text
                      fontSize="14px"
                      fontWeight="bold"
                      color="accent.500"
                      mb={3}
                      textTransform="uppercase"
                    >
                      Resort &amp; Spiritual Amenities
                    </Text>
                    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2.5}>
                      {activeRoomDetails.resortAmenities.map((item, idx) => (
                        <HStack key={idx} gap={2} align="flex-start">
                          <Icon as={FaPray} color="green.400" boxSize={3.5} mt={1} />
                          <Text fontSize="13px" color="gray.300">
                            {item}
                          </Text>
                        </HStack>
                      ))}
                    </SimpleGrid>
                  </Box>
                </Stack>

                <Flex
                  justify="space-between"
                  align="center"
                  mt={6}
                  pt={4}
                  borderTop="1px solid #1E293B"
                >
                  <Box>
                    <Text fontSize="11px" color="gray.400">
                      Nightly Rate:
                    </Text>
                    <Text fontSize="18px" fontWeight="bold" color="accent.500">
                      {activeRoomDetails.isUnderConstruction
                        ? "Price TBD"
                        : `₦${activeRoomDetails.priceNgn?.toLocaleString()} / night`}
                    </Text>
                  </Box>

                  {activeRoomDetails.isUnderConstruction ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        handleOpenNotify(activeRoomDetails);
                      }}
                    >
                      Notify Me
                    </Button>
                  ) : (
                    <Link href={`${ROUTES.booking}?room=${activeRoomDetails.id}`}>
                      <Button size="sm">Book This Room</Button>
                    </Link>
                  )}
                </Flex>
              </>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </PageWrapper>
  );
}
