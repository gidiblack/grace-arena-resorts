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
import { generateRestaurantJsonLd } from "@/lib/seo/meta";
import dining from "@/assets/dining.jpg";
import hut from "@/assets/hut.jpg";
import elysian from "@/assets/gar-elysian.jpg";
import village from "@/assets/gar-village.jpg";
import { FaClock, FaWhatsapp, FaPepperHot, FaLeaf } from "react-icons/fa";

interface MenuItem {
  name: string;
  desc: string;
  priceNgn: number;
  dietary?: "Vegetarian" | "Chef Special" | "Spicy";
}

interface RestaurantVenue {
  id: string;
  name: string;
  type: string;
  hours: string;
  description: string;
  image: string;
  menu: {
    starters: MenuItem[];
    mains: MenuItem[];
    desserts: MenuItem[];
    beverages: MenuItem[];
  };
}

const RESTAURANTS: RestaurantVenue[] = [
  {
    id: "elysian-restaurant",
    name: "GAR Elysian Fine Dining",
    type: "Gourmet Continental & Afro-Fusion",
    hours: "Breakfast: 7:00 AM – 10:30 AM | Dinner: 6:00 PM – 10:00 PM",
    description:
      "An upscale dining sanctuary with ambient mood lighting, white linen tables, and mastercrafted culinary creations blending international gastronomy with Nigerian flavors.",
    image: dining.src,
    menu: {
      starters: [
        { name: "Smoked Catfish Chowder", desc: "Rich coconut broth with garden herbs and crushed peppers", priceNgn: 4500, dietary: "Chef Special" },
        { name: "Elysian Garden Salad", desc: "Crisp organic greens, avocado, toasted walnuts, and honey-mustard vinaigrette", priceNgn: 4000, dietary: "Vegetarian" },
      ],
      mains: [
        { name: "Herb-Crusted Grilled Salmon", desc: "Served with garlic mashed potatoes and sautéed asparagus", priceNgn: 16500, dietary: "Chef Special" },
        { name: "Braised Beef Short Ribs", desc: "Slow-cooked in savory red grape reduction with jollof risotto", priceNgn: 14000 },
        { name: "Truffle Mushroom Penne", desc: "Wild forest mushrooms in a velvety cream sauce with shaved parmesan", priceNgn: 10500, dietary: "Vegetarian" },
      ],
      desserts: [
        { name: "Warm Chocolate Lava Cake", desc: "Molten center served with Madagascar vanilla gelato", priceNgn: 4500 },
        { name: "Passion Fruit Panna Cotta", desc: "Silky Italian custard topped with tangy passion fruit glaze", priceNgn: 4000 },
      ],
      beverages: [
        { name: "Chapman Supreme (GAR Signature)", desc: "Traditional Nigerian mocktail with aromatic bitters, cucumber, and citrus", priceNgn: 2500, dietary: "Chef Special" },
        { name: "Fresh Hibiscus Zobo Infusion", desc: "Brewed with ginger, cloves, and natural pineapple juice", priceNgn: 2000, dietary: "Vegetarian" },
      ],
    },
  },
  {
    id: "village-restaurant",
    name: "GAR Village Restaurant",
    type: "Authentic Local Yoruba & Continental",
    hours: "11:00 AM – 10:30 PM Daily",
    description:
      "Immerse yourself in authentic cultural hospitality. Famous for freshly pounded yam, authentic Ibarapa amala with abula, and freshly harvested farm-to-table delicacies.",
    image: village.src,
    menu: {
      starters: [
        { name: "Peppered Gizzard & Plantain Sticks", desc: "Tender chicken gizzard tossed in spicy habanero bell pepper sauce", priceNgn: 4000, dietary: "Spicy" },
        { name: "Akara Fritters with Honey Dip", desc: "Crisp golden bean fritters with a mild chili honey drizzle", priceNgn: 3000, dietary: "Vegetarian" },
      ],
      mains: [
        { name: "Authentic Amala with Abula & Assorted Meat", desc: "Smooth black yam flour swallow served with gbegiri, ewedu, and rich stew", priceNgn: 7500, dietary: "Chef Special" },
        { name: "Smoked Bushmeat Egusi Soup with Pounded Yam", desc: "Thick melon seed soup with bitterleaf and steamed pounded yam", priceNgn: 9000, dietary: "Chef Special" },
        { name: "Smoky Party Jollof with Quarter Chicken", desc: "Traditional Nigerian firewood jollof rice served with fried plantains and coleslaw", priceNgn: 6500 },
      ],
      desserts: [
        { name: "Sweet Fried Plantain Caramel Bites", desc: "Ripe dodo tossed with cinnamon sugar and coconut flakes", priceNgn: 3000, dietary: "Vegetarian" },
      ],
      beverages: [
        { name: "Fresh Palm Sap Cooler", desc: "Chilled fresh sweet palm drink tapped daily", priceNgn: 2000 },
        { name: "Cold Pressed Orange & Ginger Juice", desc: "100% natural Ibarapa citrus extract", priceNgn: 2200, dietary: "Vegetarian" },
      ],
    },
  },
  {
    id: "suya-hut",
    name: "The Suya Hut",
    type: "Nigerian Open-Flame Charcoal Grills",
    hours: "5:00 PM – Midnight (Daily)",
    description:
      "The quintessential evening retreat. Savor skewers of spiced beef, tender chicken, and ram suya grilled over smoldering coals with yaji spice, onions, and ripe tomatoes.",
    image: hut.src,
    menu: {
      starters: [
        { name: "Masa with Spiced Yaji", desc: "Fermented rice cakes grilled crisp and sprinkled with suya spice", priceNgn: 2500, dietary: "Vegetarian" },
      ],
      mains: [
        { name: "Prime Beef Suya Platter", desc: "Thinly sliced prime beef marinated in traditional northern yaji spice", priceNgn: 5000, dietary: "Spicy" },
        { name: "Flame-Grilled Ram Suya", desc: "Juicy cuts of ram grilled to tender perfection with fresh red onions and cabbage", priceNgn: 7000, dietary: "Spicy" },
        { name: "Whole Grilled Catfish (Point & Kill)", desc: "Fresh pond catfish marinated in native pepper broth served with chips or yam fries", priceNgn: 9500, dietary: "Chef Special" },
      ],
      desserts: [],
      beverages: [
        { name: "Chilled Malt & Milk", desc: "Classic Nigerian evening refresher", priceNgn: 1500 },
        { name: "Fresh Pineapple Coconut Water", desc: "Served cold in the coconut shell", priceNgn: 2500, dietary: "Vegetarian" },
      ],
    },
  },
  {
    id: "shawarma-spot",
    name: "Shawarma Spot & Cafe",
    type: "Wraps, Burgers & Pastries",
    hours: "10:00 AM – 9:00 PM Daily",
    description:
      "Quick bites and snacks. Double-sausage chicken shawarmas, gourmet beef burgers, fresh pastries, and specialty espresso coffee for guests on the go.",
    image: elysian.src,
    menu: {
      starters: [
        { name: "Crispy Spring Rolls & Samosas (4 pcs)", desc: "Golden pastry pockets stuffed with minced beef and vegetables", priceNgn: 3000 },
      ],
      mains: [
        { name: "GAR Special Chicken Shawarma", desc: "Shaved grilled chicken, double sausage, pickles, creamy garlic tahini sauce", priceNgn: 4000, dietary: "Chef Special" },
        { name: "Double Cheese Beef Burger", desc: "Charbroiled beef patty, cheddar slice, caramelized onions, brioche bun with fries", priceNgn: 6000 },
      ],
      desserts: [
        { name: "Fresh Cinnamon Glazed Doughnuts (2 pcs)", desc: "Warm bakery delight made fresh daily", priceNgn: 2000 },
      ],
      beverages: [
        { name: "Iced Caramel Macchiato", desc: "Fresh espresso, cold milk, and rich vanilla caramel drizzle", priceNgn: 3000 },
      ],
    },
  },
];

export default function RestaurantsPage() {
  const [activeVenue, setActiveVenue] = useState<string>("elysian-restaurant");
  const venue = RESTAURANTS.find((r) => r.id === activeVenue) || RESTAURANTS[0];

  return (
    <PageWrapper
      title="Restaurants & Dining — Grace Arena Resorts"
      description="Enjoy fine dining, authentic Yoruba delicacies, flame-grilled suya, and refreshing beverages across our scenic resort restaurants."
      jsonLd={generateRestaurantJsonLd(venue.name)}>
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
            Exquisite Flavors
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "46px" }} fontWeight="bold">
            Restaurants &amp; Culinary Delights
          </Text>
          <Text fontSize="15px" color="gray.300">
            From candlelit fine dining at <strong>GAR Elysian</strong> to authentic local amala and evening suya by the
            fire, savor wholesome meals prepared with organic ingredients.
          </Text>
        </Stack>

        {/* Venue Selector Tabs */}
        <Flex justify="center" mt={8} gap={2} flexWrap="wrap">
          {RESTAURANTS.map((r) => (
            <Box
              key={r.id}
              as="button"
              onClick={() => setActiveVenue(r.id)}
              px={4}
              py={2.5}
              borderRadius="12px"
              fontSize="13px"
              fontWeight="bold"
              bg={activeVenue === r.id ? "accent.500" : "#1E293B"}
              color={activeVenue === r.id ? "dark.500" : "gray.300"}
              border="1px solid"
              borderColor={activeVenue === r.id ? "accent.500" : "#334155"}
              cursor="pointer"
              transition="all 0.2s">
              {r.name}
            </Box>
          ))}
        </Flex>
      </Box>

      {/* Selected Venue Showcase */}
      <Box py={{ base: 12, md: 16 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" color="white" minH="70vh">
        <Box maxW="82rem" mx="auto">
          {/* Venue Banner Card */}
          <SimpleGrid
            columns={{ base: 1, lg: 2 }}
            gap={8}
            bg="#0F172A"
            borderRadius="24px"
            border="1px solid #1E293B"
            overflow="hidden"
            p={{ base: 6, md: 8 }}
            alignItems="center"
            mb={12}>
            <Box h={{ base: "260px", md: "340px" }} borderRadius="16px" overflow="hidden">
              <Image src={venue.image} alt={venue.name} w="full" h="full" objectFit="cover" />
            </Box>

            <Stack gap={4}>
              <Box>
                <Badge bg="accent.500" color="black" px={2.5} py={1} borderRadius="full" fontSize="11px" mb={2}>
                  {venue.type}
                </Badge>
                <Text fontSize={{ base: "24px", md: "32px" }} fontWeight="bold">
                  {venue.name}
                </Text>
              </Box>

              <HStack gap={2} fontSize="13px" color="accent.500">
                <Icon as={FaClock} boxSize={3.5} />
                <Text>{venue.hours}</Text>
              </HStack>

              <Text fontSize="14px" color="gray.300" lineHeight="tall">
                {venue.description}
              </Text>

              {/* Reservation CTA (SRS 3.6 Requirement: handled via WhatsApp) */}
              <Box pt={2}>
                <a
                  href={`https://wa.me/2348123456789?text=${encodeURIComponent(
                    `Hello Grace Arena Resorts, I would like to reserve a dining table at ${venue.name}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}>
                  <HStack
                    px={5}
                    py={3}
                    borderRadius="10px"
                    bg="#25D366"
                    color="white"
                    fontWeight="bold"
                    fontSize="14px"
                    w="fit-content"
                    cursor="pointer">
                    <Icon as={FaWhatsapp} boxSize={4} />
                    <Text>Make a Dining Reservation via WhatsApp</Text>
                  </HStack>
                </a>
                <Text fontSize="11px" color="gray.400" mt={1.5}>
                  Reservations for lunch &amp; dinner are confirmed promptly by our resort maître d&apos;.
                </Text>
              </Box>
            </Stack>
          </SimpleGrid>

          {/* Menus Section (SRS 3.6 Item 4) */}
          <Stack gap={8}>
            <Box textAlign="center">
              <Text fontSize="12px" fontWeight="bold" color="accent.500" letterSpacing="3px" textTransform="uppercase">
                A Taste of Grace
              </Text>
              <Text fontSize={{ base: "24px", md: "32px" }} fontWeight="bold">
                {venue.name} Menu
              </Text>
            </Box>

            {/* Menu Categories */}
            {[
              { title: "Starters & Appetizers", items: venue.menu.starters },
              { title: "Mains & Chef Specialties", items: venue.menu.mains },
              { title: "Desserts & Sweet Finishes", items: venue.menu.desserts },
              { title: "Refreshing Beverages & Mocktails", items: venue.menu.beverages },
            ].map(({ title, items }) => {
              if (items.length === 0) return null;

              return (
                <Box key={title} bg="#0F172A" p={{ base: 6, md: 8 }} borderRadius="20px" border="1px solid #1E293B">
                  <Text fontSize="16px" fontWeight="bold" color="accent.500" mb={6} textTransform="uppercase">
                    {title}
                  </Text>

                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                    {items.map((item, idx) => (
                      <Flex
                        key={idx}
                        justify="space-between"
                        align="flex-start"
                        p={3.5}
                        borderRadius="12px"
                        bg="#1E293B"
                        gap={4}>
                        <Stack gap={1}>
                          <HStack gap={2}>
                            <Text fontSize="15px" fontWeight="bold" color="white">
                              {item.name}
                            </Text>
                            {item.dietary === "Chef Special" && (
                              <Badge bg="accent.500" color="black" fontSize="9px">
                                Chef Choice
                              </Badge>
                            )}
                            {item.dietary === "Spicy" && (
                              <Icon as={FaPepperHot} color="red.400" boxSize={3} />
                            )}
                            {item.dietary === "Vegetarian" && (
                              <Icon as={FaLeaf} color="green.400" boxSize={3} />
                            )}
                          </HStack>
                          <Text fontSize="12px" color="gray.300" lineHeight="tall">
                            {item.desc}
                          </Text>
                        </Stack>
                        <Text fontSize="16px" fontWeight="bold" color="accent.500" whiteSpace="nowrap">
                          ₦{item.priceNgn.toLocaleString()}
                        </Text>
                      </Flex>
                    ))}
                  </SimpleGrid>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>
    </PageWrapper>
  );
}
