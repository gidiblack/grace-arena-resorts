import React, { useState } from "react";
import { Box, Flex, HStack, Icon, Image, SimpleGrid, Stack, Text, Badge } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import { generateOfferJsonLd } from "@/lib/seo/meta";
import Button from "@/components/ui/button";
import { ROUTES } from "@/constants/ROUTES";
import Link from "next/link";
import { MOCK_DEALS } from "@/data/mock/resort-data";
import { FaTag } from "react-icons/fa";
import { formatLongDate } from "@/lib/formatters/date";

interface DealItem {
  id: string;
  title: string;
  category: "Room Deals" | "Package Deals";
  discountText: string;
  promoCode: string;
  validUntil: string;
  image: string;
  description: string;
  terms: string;
}

// Single source of truth with the booking engine: these codes are seeded into public.deals
// (migration 0004) and validated by /api/v1/deals/validate/[code].
const DEALS_DATA: DealItem[] = MOCK_DEALS.map((deal) => ({
  id: deal.id,
  title: deal.title,
  category: deal.applicableRooms.length > 1 ? "Package Deals" : "Room Deals",
  discountText:
    deal.discountType === "percentage"
      ? `${deal.discountValue}% OFF`
      : `₦${deal.discountValue.toLocaleString()} OFF`,
  promoCode: deal.promoCode,
  validUntil: formatLongDate(deal.validTo),
  image: deal.image,
  description: deal.description,
  terms: deal.terms.join(" • "),
}));

export default function DealsPage() {
  const [selectedCat, setSelectedCat] = useState("All");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const categories = ["All", "Room Deals", "Package Deals"];

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
      jsonLd={DEALS_DATA.map((d) => generateOfferJsonLd(d.title, d.discountText, d.promoCode))}
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
            Exclusive Value
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "46px" }} fontWeight="bold">
            Special Retreat Deals &amp; Offers
          </Text>
          <Text fontSize="15px" color="gray.300">
            Take advantage of curated retreat packages, family weekend specials, and complimentary
            dining additions.
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

      {/* Deals Grid */}
      <Box
        py={{ base: 12, md: 16 }}
        px={{ base: 4, md: 8, xl: 12 }}
        bg="#070707"
        color="white"
        minH="60vh"
      >
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
                boxShadow="0 10px 30px rgba(0,0,0,0.4)"
              >
                <Box h="220px" position="relative" bg="#1E293B">
                  <Image src={deal.image} alt={deal.title} w="full" h="full" objectFit="cover" />
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
                    fontSize="11px"
                  >
                    Valid until {deal.validUntil}
                  </Text>
                </Box>

                <Stack p={{ base: 6, md: 8 }} gap={3} flex="1" justify="space-between">
                  <Stack gap={2}>
                    <Text
                      fontSize="11px"
                      fontWeight="bold"
                      color="accent.500"
                      textTransform="uppercase"
                    >
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
                      mt={2}
                    >
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
                        cursor="pointer"
                      >
                        {copiedCode === deal.promoCode ? "Copied!" : "Copy Code"}
                      </Box>
                    </Flex>

                    <Text fontSize="11px" color="gray.400" fontStyle="italic" pt={1}>
                      * {deal.terms}
                    </Text>
                  </Stack>

                  <Box pt={4} borderTop="1px solid #1E293B">
                    <Link href={`${ROUTES.booking}?deal=${encodeURIComponent(deal.promoCode)}`}>
                      <Button
                        size="sm"
                        style={{ width: "100%", fontSize: "13px", padding: "10px" }}
                      >
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
