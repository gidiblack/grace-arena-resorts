import React, { useState } from "react";
import { Box, Flex, HStack, Icon, Image, SimpleGrid, Stack, Text, Badge } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import { generateTouristAttractionJsonLd } from "@/lib/seo/meta";
import hut from "@/assets/hut.jpg";
import pool from "@/assets/pool.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import village from "@/assets/gar-village.jpg";
import { FaClock, FaMapPin, FaWhatsapp } from "react-icons/fa";

interface GemItem {
  id: string;
  title: string;
  category: "Nature" | "Culture" | "Adventure" | "Spiritual";
  image: string;
  duration: string;
  distance: string;
  description: string;
  highlights: string[];
}

const GEMS_DATA: GemItem[] = [
  {
    id: "twin-heritage",
    title: "Igbo-Ora Twin Heritage Cultural Tour",
    category: "Culture",
    image: village.src,
    duration: "3 – 4 Hours",
    distance: "5 mins from resort",
    description:
      "Explore Igbo-Ora, famously honored worldwide as the 'Twin Capital of the World'. Meet local elders, discover cultural traditions and culinary diets associated with twin births, and tour historical landmarks.",
    highlights: ["Twin Heritage Memorial", "Local Storytelling", "Cultural Market Walk"],
  },
  {
    id: "idere-hills",
    title: "Idere Hills Nature & Hiking Expedition",
    category: "Adventure",
    image: hut.src,
    duration: "Half Day (Morning)",
    distance: "15 mins drive",
    description:
      "A thrilling guided hiking adventure across the mystical Idere Hills. Marvel at natural caves, ancient stone defensive fortifications, and breathtaking panoramic views over Ibarapa's green valleys.",
    highlights: ["Ancient Cave Formations", "Scenic Overlooks", "Guided Mountain Trail"],
  },
  {
    id: "prayer-walk",
    title: "Sunrise Prayer Walk & Garden Meditation",
    category: "Spiritual",
    image: elysian.src,
    duration: "1 Hour",
    distance: "On-Campus Resort Trail",
    description:
      "Begin your day with an anointed sunrise devotion starting at the Prayer Hut and winding through peaceful orchard groves with scripture contemplation stations.",
    highlights: ["Morning Birdsong", "Scripture Meditation Stations", "Personal Fellowship"],
  },
  {
    id: "farm-culinary",
    title: "Organic Farm-to-Table Cassava & Yam Harvest",
    category: "Nature",
    image: pool.src,
    duration: "2 Hours",
    distance: "10 mins from resort",
    description:
      "Visit our partner agricultural groves in Ibarapa. Learn the authentic preparation of pure yam flour, harvest fresh cassava, and enjoy culinary tastings freshly prepared over open firewood.",
    highlights: ["Fresh Yam Tasting", "Hands-on Agro Experience", "Local Farmer Interaction"],
  },
];

export default function GemsPage() {
  const [selectedCat, setSelectedCat] = useState<string>("All");

  const categories = ["All", "Culture", "Adventure", "Spiritual", "Nature"];

  const filtered = GEMS_DATA.filter((gem) => {
    if (selectedCat === "All") return true;
    return gem.category === selectedCat;
  });

  return (
    <PageWrapper
      title="Off-Beat Gems — Things to Do Near Grace Arena Resorts"
      description="Discover local attractions in Igbo-Ora (The Land of Twins), hike Idere Hills, experience cultural tours, and enjoy prayer walks."
      jsonLd={generateTouristAttractionJsonLd(
        "Igbo-Ora Attractions & Off-Beat Gems",
        "Discover local attractions in Igbo-Ora, hike Idere Hills, experience cultural tours, and enjoy prayer walks."
      )}
    >
      {/* Header */}
      <Box
        bg="linear-gradient(rgba(7, 7, 7, 0.75), rgba(7, 7, 7, 0.95)), #070707"
        pt={{ base: "100px", md: "130px" }}
        pb={{ base: 10, md: 14 }}
        px={{ base: 4, md: 8 }}
        color="white"
        textAlign="center"
      >
        <Stack maxW="46rem" mx="auto" gap={3} align="center">
          <Text
            fontSize="12px"
            fontWeight="bold"
            color="accent.500"
            letterSpacing="3px"
            textTransform="uppercase"
          >
            Curated Local Experiences
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "46px" }} fontWeight="bold">
            Off-Beat Gems of Igbo-Ora
          </Text>
          <Text fontSize="15px" color="gray.300">
            Immerse yourself beyond the resort gates in the rich history of the Land of Twins,
            hiking expeditions, sacred nature walks, and authentic Yoruba heritage.
          </Text>
        </Stack>

        {/* Categories */}
        <Flex justify="center" mt={8} gap={2} flexWrap="wrap">
          {categories.map((cat) => (
            <Box
              key={cat}
              as="button"
              onClick={() => setSelectedCat(cat)}
              px={4}
              py={2}
              borderRadius="full"
              fontSize="13px"
              fontWeight="semibold"
              bg={selectedCat === cat ? "accent.500" : "#1E293B"}
              color={selectedCat === cat ? "dark.500" : "gray.300"}
              border="1px solid"
              borderColor={selectedCat === cat ? "accent.500" : "#334155"}
              cursor="pointer"
              transition="all 0.2s"
            >
              {cat}
            </Box>
          ))}
        </Flex>
      </Box>

      {/* Grid */}
      <Box
        py={{ base: 12, md: 16 }}
        px={{ base: 4, md: 8, xl: 12 }}
        bg="#070707"
        color="white"
        minH="60vh"
      >
        <Box maxW="80rem" mx="auto">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={8}>
            {filtered.map((gem) => (
              <Box
                key={gem.id}
                borderRadius="24px"
                bg="#0F172A"
                border="1px solid #1E293B"
                overflow="hidden"
                boxShadow="0 10px 30px rgba(0,0,0,0.4)"
                display="flex"
                flexDirection="column"
                transition="all 0.3s"
                _hover={{ borderColor: "accent.500", transform: "translateY(-4px)" }}
              >
                <Box h="250px" position="relative" bg="#1E293B">
                  <Image src={gem.image} alt={gem.title} w="full" h="full" objectFit="cover" />
                  <Badge
                    position="absolute"
                    top={4}
                    left={4}
                    bg="accent.500"
                    color="black"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {gem.category}
                  </Badge>
                </Box>

                <Stack p={{ base: 6, md: 8 }} gap={3} flex="1" justify="space-between">
                  <Stack gap={2}>
                    <Text fontSize="22px" fontWeight="bold">
                      {gem.title}
                    </Text>

                    <HStack gap={4} fontSize="12px" color="gray.400">
                      <HStack gap={1.5}>
                        <Icon as={FaClock} color="accent.500" />
                        <Text>{gem.duration}</Text>
                      </HStack>
                      <HStack gap={1.5}>
                        <Icon as={FaMapPin} color="accent.500" />
                        <Text>{gem.distance}</Text>
                      </HStack>
                    </HStack>

                    <Text fontSize="14px" color="gray.300" lineHeight="tall" pt={1}>
                      {gem.description}
                    </Text>

                    <HStack gap={2} pt={2} flexWrap="wrap">
                      {gem.highlights.map((h, i) => (
                        <Text
                          key={i}
                          fontSize="11px"
                          bg="#1E293B"
                          color="accent.500"
                          px={2.5}
                          py={1}
                          borderRadius="6px"
                        >
                          • {h}
                        </Text>
                      ))}
                    </HStack>
                  </Stack>

                  <Box pt={4} borderTop="1px solid #1E293B">
                    <a
                      href={`https://wa.me/2348123456789?text=${encodeURIComponent(
                        `Hello Grace Arena Resorts, I would like to book the experience: ${gem.title}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      <HStack
                        px={4}
                        py={2.5}
                        borderRadius="10px"
                        bg="#25D366"
                        color="white"
                        fontWeight="bold"
                        fontSize="13px"
                        w="fit-content"
                        cursor="pointer"
                      >
                        <Icon as={FaWhatsapp} boxSize={4} />
                        <Text>Book This Experience via Concierge</Text>
                      </HStack>
                    </a>
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
