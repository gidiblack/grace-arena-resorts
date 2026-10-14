import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  HStack,
  Icon,
  Link,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/button";
import NotifyMeModal from "@/components/common/NotifyMeModal";
import { ROUTES } from "@/constants/ROUTES";
import { generateRoomsPageJsonLd } from "@/lib/seo/meta";
import { MOCK_ROOMS } from "@/data/mock/resort-data";
import {
  RoomType,
  RoomCard,
  RoomFilterBar,
  RoomDetailsModal,
} from "@/features/rooms";
import { FaWhatsapp } from "react-icons/fa";

export default function RoomsPage() {
  const router = useRouter();
  const [selectedCampus, setSelectedCampus] = useState<"all" | "elysian" | "village">("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");

  // Modals state
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyRoom, setNotifyRoom] = useState<{ id: string; title: string; campus: string }>({
    id: "",
    title: "",
    campus: "",
  });

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeRoomDetails, setActiveRoomDetails] = useState<RoomType | null>(null);

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

  const handleOpenNotify = (room: RoomType) => {
    setNotifyRoom({ id: room.id, title: room.name, campus: room.campusTitle });
    setNotifyModalOpen(true);
  };

  const handleOpenDetails = (room: RoomType) => {
    setActiveRoomDetails(room);
    setDetailsModalOpen(true);
  };

  const filteredRooms = MOCK_ROOMS.filter((room) => {
    const campusMatch = selectedCampus === "all" || room.campus === selectedCampus;
    const tierMatch = selectedTier === "all" || room.tier === selectedTier;
    return campusMatch && tierMatch;
  });

  const elysianCount = MOCK_ROOMS.filter((r) => r.campus === "elysian").length;
  const villageCount = MOCK_ROOMS.filter((r) => r.campus === "village").length;

  return (
    <PageWrapper
      title="Rooms & Thatched Suites — Grace Arena Resorts"
      description="Browse available luxury suites and authentic thatched huts across GAR Elysian and GAR Village in Igbo-Ora, Nigeria."
      jsonLd={generateRoomsPageJsonLd(MOCK_ROOMS)}
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

      {/* Filter Bar (SRS 3.2 item 2 & Step 7 requirement) */}
      <RoomFilterBar
        selectedCampus={selectedCampus}
        onCampusChange={handleCampusChange}
        selectedTier={selectedTier}
        onTierChange={setSelectedTier}
        totalRoomsCount={MOCK_ROOMS.length}
        elysianCount={elysianCount}
        villageCount={villageCount}
      />

      {/* Rooms Grid: 1 col mobile, 2 col tablet, 3 col desktop */}
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
              {filteredRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onOpenDetails={handleOpenDetails}
                  onOpenNotify={handleOpenNotify}
                />
              ))}
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
        roomTypeId={notifyRoom.id}
      />

      {/* Full Amenities Detail Dialog (Categorized In-Room vs Resort Amenities) */}
      <RoomDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        room={activeRoomDetails}
        onOpenNotify={handleOpenNotify}
      />
    </PageWrapper>
  );
}
