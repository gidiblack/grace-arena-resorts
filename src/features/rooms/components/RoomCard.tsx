import React from "react";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Image,
  Stack,
  Text,
  Badge,
} from "@chakra-ui/react";
import Link from "next/link";
import Button from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ROUTES } from "@/constants/ROUTES";
import { RoomType } from "../types";
import { resolveRoomImage, FALLBACK_ROOM_IMAGE } from "../utils/image-resolver";
import { FaCheck, FaHardHat, FaPray, FaUsers } from "react-icons/fa";

interface RoomCardProps {
  room: RoomType;
  onOpenDetails: (room: RoomType) => void;
  onOpenNotify: (room: RoomType) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  onOpenDetails,
  onOpenNotify,
}) => {
  const isUnderConstruction = room.isUnderConstruction;
  const imageSrc = resolveRoomImage(room.image);

  return (
    <Flex
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
      data-testid={`room-card-${room.id}`}
    >
      {/* Image Area */}
      <Box h="230px" position="relative" bg="#1E293B" overflow="hidden">
        <Image
          src={imageSrc}
          alt={room.name}
          w="full"
          h="full"
          objectFit="cover"
          filter={isUnderConstruction ? "grayscale(40%)" : "none"}
          transition="transform 0.4s ease"
          _hover={{ transform: "scale(1.05)" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = FALLBACK_ROOM_IMAGE;
          }}
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
              data-testid="under-construction-badge"
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
            {room.campusTitle} • {room.buildingName}
          </Text>
          <Text fontSize="20px" fontWeight="bold" color="white">
            {room.name}
          </Text>
          <Text fontSize="13px" color="gray.300" lineHeight="tall">
            {room.shortDesc}
          </Text>

          {/* Top Key Amenities Summary with conditional Prayer Hut tooltip */}
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
              {room.keyAmenities.map((amenity, i) => {
                const isPrayerHut =
                  amenity.toLowerCase().includes("prayer") ||
                  amenity.toLowerCase().includes("hut");
                const isSharedAmenity =
                  isPrayerHut ||
                  amenity.toLowerCase().includes("pool") ||
                  amenity.toLowerCase().includes("park") ||
                  amenity.toLowerCase().includes("mall");

                const amenityRow = (
                  <HStack gap={2} cursor={isSharedAmenity ? "help" : "default"}>
                    <Icon
                      as={isPrayerHut ? FaPray : FaCheck}
                      boxSize={3}
                      color={isPrayerHut ? "accent.500" : "green.400"}
                    />
                    <Text
                      fontSize="12px"
                      color={isPrayerHut ? "accent.500" : "gray.300"}
                      fontWeight={isPrayerHut ? "bold" : "normal"}
                    >
                      {amenity}
                    </Text>
                    {isSharedAmenity && (
                      <Text
                        as="span"
                        fontSize="10px"
                        color="gray.400"
                        fontStyle="italic"
                        display={{ base: "inline", sm: "none" }}
                      >
                        (Subject to availability)
                      </Text>
                    )}
                  </HStack>
                );

                if (isSharedAmenity) {
                  return (
                    <Tooltip
                      key={i}
                      content="Subject to availability"
                      showArrow
                    >
                      {amenityRow}
                    </Tooltip>
                  );
                }

                return <Box key={i}>{amenityRow}</Box>;
              })}
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
              data-testid="room-price"
            >
              {isUnderConstruction
                ? "Price TBD"
                : `₦${room.basePriceNgn?.toLocaleString()}`}
            </Text>
          </Flex>

          <Flex gap={2}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenDetails(room)}
              style={{ flex: 1, fontSize: "12px", padding: "8px" }}
            >
              View Details
            </Button>

            {isUnderConstruction ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenNotify(room)}
                data-testid="notify-me-button"
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
              <Link
                href={`${ROUTES.booking}?room=${room.id}`}
                style={{ flex: 1.2, textDecoration: "none" }}
              >
                <Button
                  as="span"
                  size="sm"
                  data-testid="book-room-button"
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    padding: "8px",
                    textAlign: "center",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
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
};

export default RoomCard;
