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
import { generateOfferJsonLd } from "@/lib/seo/meta";
import Button from "@/components/ui/button";
import { ROUTES } from "@/constants/ROUTES";
import Link from "next/link";
import suite from "@/assets/suite.jpg";
import dining from "@/assets/dining.jpg";
import hut from "@/assets/hut.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import { FaTag } from "react-icons/fa";

interface DealItem {
  id: string;
  title: string;
  category: "Room Deals" | "Dining Deals" | "Package Deals" | "Seasonal Offers";
  discountText: string;
  promoCode: string;
  validUntil: string;
  image: string;
  description: string;
  terms: string;
}

const DEALS_DATA: DealItem[] = [
  {
    id: "spiritual-retreat-20",
    title: "Pastoral & Church Retreat Package",
    category: "Package Deals",
    discountText: "20% OFF",
    promoCode: "GRACE20",
    validUntil: "November 30, 2026",
    image: elysian.src,
    description: "Special retreat pricing for church leadership and ministry teams booking 5+ rooms for 2 nights or more.",
    terms: "Includes private sessions at The Prayer Hut and complimentary audio-visual conference room setup.",
  },
  {
    id: "weekend-village-getaway",
    title: "Executive Thatched Hut Weekend Special",
    category: "Room Deals",
    discountText: "15% OFF",
    promoCode: "VILLAGE15",
    validUntil: "December 15, 2026",
    image: hut.src,
    description: "Unwind in the authentic thatched Executive Huts with complimentary continental breakfast and fire pit evening access.",
    terms: "Valid for Friday–Sunday weekend bookings. Non-refundable.",
  },
  {
    id: "couples-elysian-feast",
    title: "Elysian Romance & Fine Dining Package",
    category: "Dining Deals",
    discountText: "Free 3-Course Dinner",
    promoCode: "ELYSIANLOVE",
    validUntil: "End of Year",
    image: dining.src,
    description: "Book 2 nights in The Cabana or Deluxe Suite and receive a complimentary 3-course candlelit dinner for two.",
    terms: "Includes chef starter, prime main course, and dessert at GAR Elysian restaurant.",
  },
  {
    id: "twin-heritage-family",
    title: "Igbo-Ora Twin Family Holiday Special",
    category: "Seasonal Offers",
    discountText: "₦25,000 Voucher",
    promoCode: "TWINCITY",
    validUntil: "December 31, 2026",
    image: suite.src,
    description: "Bring the whole family to experience the world capital of twins with guided Idere Hills hiking and farm harvest tour included.",
    terms: "Voucher redeemable on dining, spa, and recreational arcade games.",
  },
];

export default function DealsPage() {
  const [selectedCat, setSelectedCat] = useState("All");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const categories = ["All", "Room Deals", "Package Deals", "Dining Deals", "Seasonal Offers"];

  const handleCopyCode = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const filtered = DEALS_DATA.filter((d) => selectedCat === "All" || d.category === selectedCat);

  return (
    <PageWrapper
      title="Deals & Offers — Grace Arena Resorts"
      description="Enjoy seasonal discounts, ministry retreat packages, and exclusive deals at Grace Arena Resorts."
      jsonLd={DEALS_DATA.map((d) => generateOfferJsonLd(d.title, d.discountText, d.promoCode))}>
      {/* Header */}
      <Box
        bg="linear-gradient(rgba(7, 7, 7, 0.75), rgba(7, 7, 7, 0.95)), #070707"
        pt={{ base: "100px", md: "130px" }}
        pb={{ base: 10, md: 14 }}
        px={{ base: 4, md: 8 }}
        color="white"
        textAlign="center">
        <Stack maxW="46rem" mx="auto" gap={3} align="center">
          <Text fontSize="12px" fontWeight="bold" color="accent.500" letterSpacing="3px" textTransform="uppercase">
            Exclusive Value
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "46px" }} fontWeight="bold">
            Special Retreat Deals &amp; Offers
          </Text>
          <Text fontSize="15px" color="gray.300">
            Take advantage of curated retreat packages, family weekend specials, and complimentary dining additions.
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
              transition="all 0.2s">
              {cat}
            </Box>
          ))}
        </Flex>
      </Box>

      {/* Deals Grid */}
      <Box py={{ base: 12, md: 16 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" color="white" minH="60vh">
        <Box maxW="80rem" mx="auto">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={8}>
            {filtered.map((deal) => (
              <Flex
                key={deal.id}
                direction="column"
                borderRadius="24px"
                bg="#0F172A"
                border="1px solid #1E293B"
                overflow="hidden"
                boxShadow="0 10px 30px rgba(0,0,0,0.4)">
                <Box h="220px" position="relative" bg="#1E293B">
                  <Image src={deal.image} alt={deal.title} w="full" h="full" objectFit="cover" />
                  <Badge position="absolute" top={4} left={4} bg="accent.500" color="black" px={3} py={1} borderRadius="full">
                    {deal.discountText}
                  </Badge>
                  <Text
                    position="absolute"
                    bottom={4}
                    left={4}
                    bg="rgba(0,0,0,0.75)"
                    color="white"
                    px={2.5}
                    py={1}
                    borderRadius="md"
                    fontSize="11px">
                    Valid until {deal.validUntil}
                  </Text>
                </Box>

                <Stack p={{ base: 6, md: 8 }} gap={3} flex="1" justify="space-between">
                  <Stack gap={2}>
                    <Text fontSize="11px" fontWeight="bold" color="accent.500" textTransform="uppercase">
                      {deal.category}
                    </Text>
                    <Text fontSize="22px" fontWeight="bold">
                      {deal.title}
                    </Text>
                    <Text fontSize="13px" color="gray.300" lineHeight="tall">
                      {deal.description}
                    </Text>

                    {/* Promo Code Box */}
                    <Flex
                      align="center"
                      justify="space-between"
                      bg="#1E293B"
                      p={3}
                      borderRadius="10px"
                      border="1px dashed #FCCA46"
                      mt={2}>
                      <HStack gap={2}>
                        <Icon as={FaTag} color="accent.500" boxSize={3.5} />
                        <Text fontSize="13px" fontWeight="bold" letterSpacing="wider">
                          CODE: {deal.promoCode}
                        </Text>
                      </HStack>
                      <Box
                        as="button"
                        onClick={() => handleCopyCode(deal.promoCode)}
                        fontSize="11px"
                        fontWeight="bold"
                        color="accent.500"
                        _hover={{ textDecoration: "underline" }}
                        cursor="pointer">
                        {copiedCode === deal.promoCode ? "Copied!" : "Copy Code"}
                      </Box>
                    </Flex>

                    <Text fontSize="11px" color="gray.400" fontStyle="italic" pt={1}>
                      * {deal.terms}
                    </Text>
                  </Stack>

                  <Box pt={4} borderTop="1px solid #1E293B">
                    <Link href={`${ROUTES.booking}?deal=${deal.id}`}>
                      <Button size="sm" style={{ width: "100%", fontSize: "13px", padding: "10px" }}>
                        Book With This Deal
                      </Button>
                    </Link>
                  </Box>
                </Stack>
              </Flex>
            ))}
          </SimpleGrid>
        </Box>
      </Box>
    </PageWrapper>
  );
}
