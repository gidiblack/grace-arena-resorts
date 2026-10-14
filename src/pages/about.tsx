import React from "react";
import { Box, Flex, Icon, Image, SimpleGrid, Stack, Text, Badge } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import { generateOrganizationJsonLd } from "@/lib/seo/meta";
import Button from "@/components/ui/button";
import { ROUTES } from "@/constants/ROUTES";
import Link from "next/link";
import HeroBg from "@/assets/hero-bg.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import { FaCross, FaHeart, FaSeedling, FaShieldAlt } from "react-icons/fa";

export default function AboutPage() {
  const VALUES = [
    {
      title: "Faith & Christian Sanctity",
      icon: FaCross,
      desc: "We honor Christ in our hospitality, providing an alcohol-free, wholesome, and prayerful environment where individuals, families, and churches can flourish.",
    },
    {
      title: "Serene Excellence",
      icon: FaShieldAlt,
      desc: "From the meticulous cleanliness of our suites to warm Nigerian hospitality, we hold service excellence to an international standard of care.",
    },
    {
      title: "Cultural Heritage",
      icon: FaSeedling,
      desc: "Rooted in Igbo-Ora, the land of twins, we celebrate African craftsmanship through our thatched architectural huts and organic culinary traditions.",
    },
    {
      title: "Wholesome Family Rest",
      icon: FaHeart,
      desc: "A sanctuary where parents and children reconnect without chaotic city distractions, enjoying lawn sports, nature trails, and campfire fellowship.",
    },
  ];

  const MILESTONES = [
    {
      year: "Phase I",
      title: "The Vision & Groundbreaking",
      desc: "Acquisition of pristine acreage in Ibarapa Central, consecrated for a faith-centered retreat sanctuary.",
    },
    {
      year: "Phase II",
      title: "GAR Village Launch",
      desc: "Completion of the authentic handcrafted Executive Thatched Huts, Fire Pit, and The Prayer Hut.",
    },
    {
      year: "Phase III",
      title: "GAR Elysian Unveiling",
      desc: "Introduction of luxury suites at Fountain Haven, Oasis Villa, and The Cabana, alongside the Modern Mall & Spa.",
    },
    {
      year: "Phase IV",
      title: "Presidential Expansion",
      desc: "Ongoing architectural finishing of the Presidential and Royal Thatched Suites.",
    },
  ];

  return (
    <PageWrapper
      title="About Us — Grace Arena Resorts"
      description="Learn the vision, Christian foundations, and cultural story behind Grace Arena Resorts in Igbo-Ora, Oyo State, Nigeria."
      jsonLd={generateOrganizationJsonLd()}
    >
      {/* Hero */}
      <Box
        bg={`linear-gradient(rgba(7, 7, 7, 0.7), rgba(7, 7, 7, 0.9)), url(${HeroBg.src})`}
        bgSize="cover"
        bgPos="center"
        pt={{ base: "110px", md: "140px" }}
        pb={{ base: 14, md: 18 }}
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
            Our Heritage &amp; Calling
          </Text>
          <Text as="h1" fontSize={{ base: "32px", md: "50px" }} fontWeight="bold">
            A Christian Sanctuary in the Land of Twins
          </Text>
          <Text fontSize="16px" color="gray.200" maxW="40rem">
            Grace Arena Resorts was birthed with a singular conviction: to create an unblemished
            oasis of peace where people encounter genuine rest, spiritual renewal, and refined
            comfort.
          </Text>
        </Stack>
      </Box>

      {/* Story Section */}
      <Box py={{ base: 16, md: 20 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" color="white">
        <Box maxW="80rem" mx="auto">
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={{ base: 8, lg: 12 }} alignItems="center">
            <Stack gap={5}>
              <Text
                fontSize="13px"
                fontWeight="bold"
                color="accent.500"
                letterSpacing="3px"
                textTransform="uppercase"
              >
                Our Story
              </Text>
              <Text fontSize={{ base: "26px", md: "36px" }} fontWeight="bold" lineHeight="shorter">
                Where Faith Meets Timeless Hospitality
              </Text>
              <Text fontSize="15px" color="gray.300" lineHeight="tall">
                Situated in the legendary agrarian town of Igbo-Ora, Oyo State—celebrated globally
                for having the highest rate of twin births in the world—Grace Arena Resorts stands
                as a testimony of wholesome Christian hospitality.
              </Text>
              <Text fontSize="15px" color="gray.300" lineHeight="tall">
                In a busy world saturated with noisy distractions and secular leisure, GAR was
                designed as an intentional counter-narrative: a family-first, alcohol-free haven
                anchored in spiritual devotion. From the consecrated grounds of{" "}
                <strong>The Prayer Hut</strong> to our two distinct campuses—
                <strong>GAR Elysian</strong> and <strong>GAR Village</strong>—every corner inspires
                quiet communion with God and refreshing connection with loved ones.
              </Text>

              <Box pt={2}>
                <Link href={ROUTES.rooms}>
                  <Button variant="primary" size="md">
                    Explore Accommodations
                  </Button>
                </Link>
              </Box>
            </Stack>

            <Box position="relative">
              <Box
                h={{ base: "320px", md: "420px" }}
                borderRadius="24px"
                overflow="hidden"
                border="1px solid #1E293B"
                boxShadow="0 20px 50px rgba(0,0,0,0.6)"
              >
                <Image
                  src={elysian.src}
                  alt="GAR Elysian Campus"
                  w="full"
                  h="full"
                  objectFit="cover"
                />
              </Box>
            </Box>
          </SimpleGrid>
        </Box>
      </Box>

      {/* Core Values (SRS 3.4) */}
      <Box py={{ base: 16, md: 20 }} px={{ base: 4, md: 8, xl: 12 }} bg="#0B132B" color="white">
        <Box maxW="80rem" mx="auto">
          <Stack textAlign="center" align="center" mb={{ base: 10, md: 14 }} gap={2}>
            <Text
              fontSize="12px"
              fontWeight="bold"
              color="accent.500"
              letterSpacing="3px"
              textTransform="uppercase"
            >
              Our Foundation
            </Text>
            <Text fontSize={{ base: "26px", md: "36px" }} fontWeight="bold">
              The Four Pillars of Grace Arena
            </Text>
          </Stack>

          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={6}>
            {VALUES.map((val, i) => (
              <Box
                key={i}
                p={6}
                borderRadius="20px"
                bg="#0F172A"
                border="1px solid #1E293B"
                transition="all 0.3s"
                _hover={{ borderColor: "accent.500", transform: "translateY(-4px)" }}
              >
                <Icon as={val.icon} boxSize={8} color="accent.500" mb={4} />
                <Text fontSize="18px" fontWeight="bold" mb={2}>
                  {val.title}
                </Text>
                <Text fontSize="13px" color="gray.300" lineHeight="tall">
                  {val.desc}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </Box>

      {/* Timeline Milestones */}
      <Box py={{ base: 16, md: 20 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" color="white">
        <Box maxW="60rem" mx="auto">
          <Stack textAlign="center" align="center" mb={{ base: 10, md: 14 }} gap={2}>
            <Text
              fontSize="12px"
              fontWeight="bold"
              color="accent.500"
              letterSpacing="3px"
              textTransform="uppercase"
            >
              The Journey
            </Text>
            <Text fontSize={{ base: "26px", md: "34px" }} fontWeight="bold">
              Resort Evolution &amp; Expansion
            </Text>
          </Stack>

          <Stack gap={6}>
            {MILESTONES.map((m, i) => (
              <Flex
                key={i}
                p={6}
                borderRadius="16px"
                bg="#0F172A"
                border="1px solid #1E293B"
                align={{ base: "flex-start", sm: "center" }}
                gap={5}
                flexDir={{ base: "column", sm: "row" }}
              >
                <Badge
                  bg="accent.500"
                  color="black"
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="12px"
                  fontWeight="bold"
                >
                  {m.year}
                </Badge>
                <Box>
                  <Text fontSize="17px" fontWeight="bold" color="white">
                    {m.title}
                  </Text>
                  <Text fontSize="13px" color="gray.300" mt={1}>
                    {m.desc}
                  </Text>
                </Box>
              </Flex>
            ))}
          </Stack>
        </Box>
      </Box>
    </PageWrapper>
  );
}
