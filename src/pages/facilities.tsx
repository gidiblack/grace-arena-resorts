import React, { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Badge,
} from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import { generateLocalBusinessJsonLd } from "@/lib/seo/meta";
import Button from "@/components/ui/button";
import { ROUTES } from "@/constants/ROUTES";
import Link from "next/link";

// Assets
import pool from "@/assets/pool.jpg";
import hut from "@/assets/hut.jpg";
import dining from "@/assets/dining.jpg";
import gem1 from "@/assets/hero-placeholder.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import village from "@/assets/gar-village.jpg";

// Icons
import {
  FaPray,
  FaSwimmer,
  FaDumbbell,
  FaFilm,
  FaGamepad,
  FaTree,
  FaShoppingBag,
  FaFire,
  FaClock,
  FaMapMarkerAlt,
} from "react-icons/fa";

interface FacilityItem {
  id: string;
  name: string;
  category: "Spiritual" | "Wellness" | "Recreation" | "Dining & Retail" | "Entertainment";
  icon: React.ElementType;
  image: string;
  hours: string;
  location: string;
  highlights: string[];
  description: string;
  isSpecial?: boolean;
}

const FACILITIES_DATA: FacilityItem[] = [
  {
    id: "prayer-hut",
    name: "The Prayer Hut",
    category: "Spiritual",
    icon: FaPray,
    image: hut.src,
    hours: "Open 24/7 for Registered Guests",
    location: "GAR Village & Elysian Garden Trail",
    highlights: ["Private Solitude", "Personal & Group Intercession", "Bibles & Spiritual Books", "Tranquil Garden Backdrop"],
    description:
      "A sacred cornerstone of Grace Arena Resorts. Nestled away from foot traffic, the Prayer Hut provides an anointed, quiet retreat space for guests seeking communion with God, reflection, and spiritual refreshment.",
    isSpecial: true,
  },
  {
    id: "modern-mall",
    name: "Modern Mall & Spa",
    category: "Wellness",
    icon: FaShoppingBag,
    image: elysian.src,
    hours: "8:00 AM – 10:00 PM Daily",
    location: "GAR Elysian Central Courtyard",
    highlights: ["Luxury Spa & Sauna", "E-Learning Library", "Indoor Arcade", "Human Glass Cantilever Facade", "Mini Mart"],
    description:
      "Our multi-tier lifestyle hub features therapeutic spa body treatments, modern sauna rooms, an e-learning research library, and an arcade with spectacular glass cantilever architecture.",
  },
  {
    id: "swimming-pool",
    name: "Resort Swimming Pool & Cabanas",
    category: "Wellness",
    icon: FaSwimmer,
    image: pool.src,
    hours: "7:00 AM – 8:00 PM Daily",
    location: "Central Leisure Deck",
    highlights: ["Crystal Clear Waters", "Sunbathing Loungers", "Kids Splash Zone", "Poolside Refreshments"],
    description:
      "A serene turquoise outdoor pool framed by palms and comfortable sun loungers. Perfect for morning laps, peaceful family afternoons, or poolside evening drinks under the stars.",
  },
  {
    id: "recreation-park",
    name: "Recreation Park & Sports Pitch",
    category: "Recreation",
    icon: FaDumbbell,
    image: gem1.src,
    hours: "6:30 AM – 7:00 PM Daily",
    location: "South Grounds",
    highlights: ["Lawn Tennis Court", "Mini Soccer Pitch", "Jogging Trail", "Outdoor Fitness Gear"],
    description:
      "Stay active with our dedicated outdoor recreational park. Enjoy friendly tennis matches, team-bonding soccer scrimmages, and refreshing morning runs on the manicured trail.",
  },
  {
    id: "love-garden",
    name: "Love Garden",
    category: "Recreation",
    icon: FaTree,
    image: village.src,
    hours: "Open All Day",
    location: "Adjacent to GAR Village",
    highlights: ["Tall Umbrella Shade Trees", "Quiet Reading Benches", "Scenic Photography Spots"],
    description:
      "A picturesque botanical retreat with broad canopy umbrella trees, vibrant flowering plants, and stone pathways designed for meditation, strolls, and wholesome fellowship.",
  },
  {
    id: "movie-theater",
    name: "Christian Heritage Movie Theater",
    category: "Entertainment",
    icon: FaFilm,
    image: gem1.src,
    hours: "Screenings at 4:00 PM & 7:30 PM",
    location: "Modern Mall Floor 2",
    highlights: ["Inspiring Faith & Heritage Films", "Comfortable Plush Seating", "Dolby Surround Audio"],
    description:
      "Experience faith-affirming, family-friendly cinema and inspirational documentaries in our private acoustic screening room equipped with 4K projection.",
  },
  {
    id: "games-room",
    name: "Indoor Games Pavilion",
    category: "Entertainment",
    icon: FaGamepad,
    image: gem1.src,
    hours: "9:00 AM – 11:00 PM",
    location: "Community Center",
    highlights: ["Table Tennis", "Billiards & Snooker", "Foosball", "Board Games (Scrabble, Chess, Monopoly)"],
    description:
      "A lively, interactive recreational space for children, youth, and families to bond over classic table sports and intellectual board games.",
  },
  {
    id: "fire-pit",
    name: "The Fire Pit Pavilion",
    category: "Entertainment",
    icon: FaFire,
    image: hut.src,
    hours: "7:00 PM – 11:00 PM (Evenings)",
    location: "GAR Village Central Green",
    highlights: ["Evening Bonfires", "Acoustic Worship", "Starlight Storytelling", "Warm Roasted Snacks"],
    description:
      "Gather under the night sky for uplifting fellowship, acoustic worship songs, and peaceful conversation around our stone fire pit.",
  },
  {
    id: "village-mall",
    name: "Village Mall & Cuisine Pavilion",
    category: "Dining & Retail",
    icon: FaShoppingBag,
    image: dining.src,
    hours: "7:00 AM – 10:30 PM",
    location: "GAR Village Entrance",
    highlights: ["Authentic Local Yoruba Delicacies", "Continental Favorites", "Local Handicrafts & Souvenirs"],
    description:
      "A vibrant cultural dining and retail space celebrated for classic architectural patterns and freshly cooked dishes made with organic produce from Ibarapa farmers.",
  },
];

export default function FacilitiesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Spiritual", "Wellness", "Recreation", "Dining & Retail", "Entertainment"];

  const filtered = FACILITIES_DATA.filter((item) => {
    if (selectedCategory === "All") return true;
    return item.category === selectedCategory;
  });

  return (
    <PageWrapper
      title="Resort Facilities — Grace Arena Resorts"
      description="Explore the world-class facilities at Grace Arena Resorts, from the serene Prayer Hut to the Modern Mall, Spa, Pool, and Recreation Park."
      jsonLd={generateLocalBusinessJsonLd()}>
      {/* Header */}
      <Box
        bg="linear-gradient(rgba(7, 7, 7, 0.75), rgba(7, 7, 7, 0.95)), #070707"
        pt={{ base: "100px", md: "130px" }}
        pb={{ base: 10, md: 14 }}
        px={{ base: 4, md: 8 }}
        color="white"
        textAlign="center">
        <Stack maxW="48rem" mx="auto" gap={3} align="center">
          <Text fontSize="12px" fontWeight="bold" color="accent.500" letterSpacing="3px" textTransform="uppercase">
            Wholesome Experiences
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "46px" }} fontWeight="bold">
            World-Class Resort Facilities
          </Text>
          <Text fontSize="15px" color="gray.300" maxW="38rem">
            From the spiritual serenity of the <strong>Prayer Hut</strong> to modern wellness, recreation, and family
            entertainment, every space is built to nourish your mind, body, and spirit.
          </Text>
        </Stack>

        {/* Category Tabs */}
        <Flex justify="center" mt={8} gap={2} flexWrap="wrap">
          {categories.map((cat) => (
            <Box
              key={cat}
              as="button"
              onClick={() => setSelectedCategory(cat)}
              px={4}
              py={2}
              borderRadius="full"
              fontSize="13px"
              fontWeight="semibold"
              bg={selectedCategory === cat ? "accent.500" : "#1E293B"}
              color={selectedCategory === cat ? "dark.500" : "gray.300"}
              border="1px solid"
              borderColor={selectedCategory === cat ? "accent.500" : "#334155"}
              cursor="pointer"
              transition="all 0.2s">
              {cat}
            </Box>
          ))}
        </Flex>
      </Box>

      {/* Facilities Cards Grid */}
      <Box py={{ base: 12, md: 16 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" minH="60vh">
        <Box maxW="82rem" mx="auto">
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={8}>
            {filtered.map((item) => (
              <Box
                key={item.id}
                borderRadius="20px"
                bg="#0F172A"
                border="1px solid"
                borderColor={item.isSpecial ? "accent.500" : "#1E293B"}
                overflow="hidden"
                boxShadow="0 10px 30px rgba(0,0,0,0.4)"
                display="flex"
                flexDirection="column"
                transition="all 0.3s"
                _hover={{ transform: "translateY(-4px)", borderColor: "accent.500" }}>
                {/* Image */}
                <Box h="220px" position="relative" bg="#1E293B">
                  <Image src={item.image} alt={item.name} w="full" h="full" objectFit="cover" />
                  <Flex position="absolute" top={3} left={3} right={3} justify="space-between">
                    <Badge
                      bg={item.isSpecial ? "accent.500" : "#1E293B"}
                      color={item.isSpecial ? "black" : "white"}
                      px={2.5}
                      py={1}
                      borderRadius="full"
                      fontSize="11px"
                      fontWeight="bold">
                      {item.category}
                    </Badge>
                    {item.isSpecial && (
                      <HStack bg="rgba(0,0,0,0.75)" px={2} py={0.5} borderRadius="full">
                        <Icon as={FaPray} color="accent.500" boxSize={3} />
                        <Text fontSize="10px" fontWeight="bold" color="accent.500">
                          Christian Oasis
                        </Text>
                      </HStack>
                    )}
                  </Flex>
                </Box>

                {/* Content */}
                <Stack p={6} gap={3} flex="1" justify="space-between">
                  <Stack gap={2}>
                    <Text fontSize="20px" fontWeight="bold" color="white">
                      {item.name}
                    </Text>

                    <HStack gap={2} fontSize="12px" color="accent.500">
                      <Icon as={FaClock} boxSize={3} />
                      <Text>{item.hours}</Text>
                    </HStack>

                    <HStack gap={2} fontSize="12px" color="gray.400">
                      <Icon as={FaMapMarkerAlt} boxSize={3} />
                      <Text>{item.location}</Text>
                    </HStack>

                    <Text fontSize="13px" color="gray.300" lineHeight="tall" pt={1}>
                      {item.description}
                    </Text>

                    {/* Highlights tags */}
                    <Box pt={3} borderTop="1px solid #1E293B">
                      <Flex gap={1.5} flexWrap="wrap">
                        {item.highlights.map((h, i) => (
                          <Text
                            key={i}
                            fontSize="11px"
                            bg="#1E293B"
                            color="gray.300"
                            px={2}
                            py={0.5}
                            borderRadius="6px">
                            {h}
                          </Text>
                        ))}
                      </Flex>
                    </Box>
                  </Stack>

                  <Box pt={4}>
                    <Link href={ROUTES.booking}>
                      <Button size="sm" style={{ width: "100%", fontSize: "12px", padding: "8px" }}>
                        Book Stay &amp; Enjoy Access
                      </Button>
                    </Link>
                  </Box>
                </Stack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </Box>
    </PageWrapper>
  );
}
