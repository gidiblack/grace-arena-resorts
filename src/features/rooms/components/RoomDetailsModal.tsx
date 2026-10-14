import React from "react";
import { useRouter } from "next/router";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Dialog,
  Portal,
} from "@chakra-ui/react";
import Button from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ROUTES } from "@/constants/ROUTES";
import { RoomType, parseRoomAmenities } from "../types";
import { resolveRoomImage, FALLBACK_ROOM_IMAGE } from "../utils/image-resolver";
import { cleanupModalLocks, useModalCleanup } from "@/helpers/modal-cleanup";
import { FaCheck, FaPray, FaTimes } from "react-icons/fa";

interface RoomDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomType | null;
  onOpenNotify: (room: RoomType) => void;
}

export const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
  isOpen,
  onClose,
  room,
  onOpenNotify,
}) => {
  const router = useRouter();
  useModalCleanup(isOpen && !!room);

  if (!room) return null;

  const parsedAmenities = parseRoomAmenities(room.amenities);
  const isUnderConstruction = room.isUnderConstruction;
  const imageSrc = resolveRoomImage(room.image);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose();
          cleanupModalLocks();
        }
      }}
      preventScroll={false}
      trapFocus={false}
      restoreFocus={false}
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.850" backdropFilter="blur(8px)" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="#0F172A"
            color="light.500"
            border="1px solid #334155"
            borderRadius="20px"
            p={{ base: 5, md: 8 }}
            maxW="640px"
            maxH="90vh"
            overflowY="auto"
            w="92vw"
            boxShadow="2xl"
            data-testid="room-details-modal"
            tabIndex={-1}
          >
          <Flex justify="space-between" align="flex-start" mb={3}>
            <Box>
              <Text
                fontSize="12px"
                fontWeight="bold"
                color="accent.500"
                textTransform="uppercase"
              >
                {room.campusTitle} • {room.buildingName}
              </Text>
              <Dialog.Title fontSize={{ base: "20px", md: "24px" }} fontWeight="bold" color="white">
                {room.name}
              </Dialog.Title>
            </Box>
            <Dialog.CloseTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  cleanupModalLocks();
                  onClose();
                }}
                aria-label="Close dialog"
                tabIndex={0}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "6px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "#94A3B8",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon as={FaTimes} boxSize={5} />
              </button>
            </Dialog.CloseTrigger>
          </Flex>

          {/* Room Image Preview with fallback */}
          <Box h={{ base: "140px", sm: "180px" }} borderRadius="12px" overflow="hidden" mb={3} position="relative" bg="#1E293B">
            <Image
              src={imageSrc}
              alt={room.name}
              w="full"
              h="full"
              objectFit="cover"
              filter={isUnderConstruction ? "grayscale(40%)" : "none"}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = FALLBACK_ROOM_IMAGE;
              }}
            />
          </Box>

          <Dialog.Description fontSize="13px" color="gray.300" mb={3} lineHeight="tall">
            {room.shortDesc}
          </Dialog.Description>

          <Stack gap={5} my={2}>
            {/* In-Room Amenities (Categorized from JSON) */}
            <Box>
              <Text
                fontSize="14px"
                fontWeight="bold"
                color="accent.500"
                mb={3}
                textTransform="uppercase"
                letterSpacing="wide"
              >
                In-Room Amenities
              </Text>
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2.5}>
                {parsedAmenities.inRoom.map((item, idx) => (
                  <HStack key={idx} gap={2} align="flex-start">
                    <Icon as={FaCheck} color="accent.500" boxSize={3.5} mt={1} />
                    <Text fontSize="13px" color="gray.300">
                      {item}
                    </Text>
                  </HStack>
                ))}
              </SimpleGrid>
            </Box>

            {/* Resort Amenities (Categorized from JSON with Prayer Hut & Shared Tooltips) */}
            <Box pt={3} borderTop="1px solid #1E293B">
              <Text
                fontSize="14px"
                fontWeight="bold"
                color="accent.500"
                mb={3}
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Resort &amp; Spiritual Amenities
              </Text>
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2.5}>
                {parsedAmenities.resort.map((item, idx) => {
                  const isPrayerHut =
                    item.toLowerCase().includes("prayer") ||
                    item.toLowerCase().includes("hut");
                  const isSharedAmenity =
                    isPrayerHut ||
                    item.toLowerCase().includes("pool") ||
                    item.toLowerCase().includes("gym") ||
                    item.toLowerCase().includes("fitness") ||
                    item.toLowerCase().includes("spa") ||
                    item.toLowerCase().includes("mall");

                  const itemContent = (
                    <HStack
                      gap={2}
                      align="flex-start"
                      cursor={isSharedAmenity ? "help" : "default"}
                    >
                      <Icon
                        as={isPrayerHut ? FaPray : FaCheck}
                        color={isPrayerHut ? "accent.500" : "green.400"}
                        boxSize={3.5}
                        mt={1}
                      />
                      <Text
                        fontSize="13px"
                        color={isPrayerHut ? "accent.500" : "gray.300"}
                        fontWeight={isPrayerHut ? "semibold" : "normal"}
                      >
                        {item}
                        {isSharedAmenity && (
                          <Text
                            as="span"
                            fontSize="11px"
                            color="gray.400"
                            ml={1.5}
                            fontStyle="italic"
                          >
                            *
                          </Text>
                        )}
                      </Text>
                    </HStack>
                  );

                  if (isSharedAmenity) {
                    return (
                      <Tooltip
                        key={idx}
                        content="Subject to availability"
                        showArrow
                      >
                        {itemContent}
                      </Tooltip>
                    );
                  }

                  return <Box key={idx}>{itemContent}</Box>;
                })}
              </SimpleGrid>
              <Text fontSize="11px" color="gray.400" mt={2} fontStyle="italic">
                * Note: Spiritual sanctuary and shared recreational amenities are subject to availability and reservation schedule.
              </Text>
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
                {isUnderConstruction
                  ? "Price TBD"
                  : `₦${room.basePriceNgn?.toLocaleString()} / night`}
              </Text>
            </Box>

            {isUnderConstruction ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                tabIndex={0}
                onClick={() => {
                  cleanupModalLocks();
                  onClose();
                  onOpenNotify(room);
                }}
                style={{
                  backgroundColor: "#F59E0B",
                  color: "#000",
                  fontWeight: "bold",
                }}
              >
                Notify Me
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                tabIndex={0}
                onClick={() => {
                  cleanupModalLocks();
                  onClose();
                  router.push(`${ROUTES.booking}?room=${room.id}`);
                }}
              >
                Book This Room
              </Button>
            )}
          </Flex>
        </Dialog.Content>
      </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default RoomDetailsModal;
