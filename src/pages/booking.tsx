import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Image,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Badge,
} from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/button";
import { ROUTES } from "@/constants/ROUTES";

// Assets
import suite from "@/assets/suite.jpg";
import suite2 from "@/assets/suite2.jpg";
import hut from "@/assets/hut.jpg";
import elysian from "@/assets/gar-elysian.jpg";

// Icons
import {
  FaCalendarAlt,
  FaUserFriends,
  FaBed,
  FaCreditCard,
  FaCheckCircle,
  FaTrash,
  FaWhatsapp,
  FaPray,
  FaPlus,
  FaMinus,
  FaShieldAlt,
  FaPrint,
} from "react-icons/fa";

interface AvailableRoom {
  id: string;
  name: string;
  campusTitle: string;
  tier: string;
  pricePerNight: number;
  maxGuests: number;
  image: string;
}

const AVAILABLE_ROOMS: AvailableRoom[] = [
  {
    id: "elysian-fountain-standard",
    name: "Standard Room",
    campusTitle: "GAR Elysian",
    tier: "Standard",
    pricePerNight: 60000,
    maxGuests: 2,
    image: suite2.src,
  },
  {
    id: "elysian-fountain-deluxe",
    name: "Deluxe Room",
    campusTitle: "GAR Elysian",
    tier: "Deluxe",
    pricePerNight: 70000,
    maxGuests: 2,
    image: suite.src,
  },
  {
    id: "elysian-oasis-deluxe-suite",
    name: "Deluxe Suite with Kitchenette",
    campusTitle: "GAR Elysian",
    tier: "Deluxe",
    pricePerNight: 80000,
    maxGuests: 2,
    image: suite2.src,
  },
  {
    id: "elysian-oasis-premium-suite",
    name: "Premium Suite Apartment",
    campusTitle: "GAR Elysian",
    tier: "Premium",
    pricePerNight: 90000,
    maxGuests: 2,
    image: suite.src,
  },
  {
    id: "elysian-cabana-premium",
    name: "The Cabana Premium Suite",
    campusTitle: "GAR Elysian",
    tier: "Premium",
    pricePerNight: 120000,
    maxGuests: 2,
    image: elysian.src,
  },
  {
    id: "village-executive-hut",
    name: "Executive Thatched Hut",
    campusTitle: "GAR Village",
    tier: "Executive",
    pricePerNight: 100000,
    maxGuests: 2,
    image: hut.src,
  },
];

export default function BookingPage() {
  const router = useRouter();

  // Wizard Step: 1, 2, 3, 4, 5 (5 is Confirmation)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Dates & Guests
  const [checkInDate, setCheckInDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [nights, setNights] = useState<number>(2);
  const [adults, setAdults] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);

  // Step 2: Selected Rooms
  const [selectedRooms, setSelectedRooms] = useState<{ room: AvailableRoom; count: number }[]>([]);

  // Step 3: Guest Information
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("+234");
  const [prayerHutInterest, setPrayerHutInterest] = useState(true);
  const [specialRequests, setSpecialRequests] = useState("");

  // Step 4: Payment simulation state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  // Auto-calculate check-out date
  const checkOutDate = (() => {
    if (!checkInDate) return "";
    const date = new Date(checkInDate);
    date.setDate(date.getDate() + nights);
    return date.toISOString().split("T")[0];
  })();

  // Pre-select room if query parameter exists
  useEffect(() => {
    if (!router.isReady || !router.query.room) return;
    const match = AVAILABLE_ROOMS.find((r) => r.id === router.query.room);
    if (match && selectedRooms.length === 0) {
      const timer = setTimeout(() => {
        setSelectedRooms([{ room: match, count: 1 }]);
        setCurrentStep(2);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [router.isReady, router.query.room, selectedRooms.length]);

  // Toggle or add room
  const handleAddRoom = (room: AvailableRoom) => {
    const existing = selectedRooms.find((r) => r.room.id === room.id);
    if (existing) {
      setSelectedRooms(
        selectedRooms.map((r) => (r.room.id === room.id ? { ...r, count: r.count + 1 } : r))
      );
    } else {
      setSelectedRooms([...selectedRooms, { room, count: 1 }]);
    }
  };

  const handleRemoveRoom = (roomId: string) => {
    setSelectedRooms(selectedRooms.filter((r) => r.room.id !== roomId));
  };

  // Pricing calculations (Formula in SRS 3.3)
  const subtotal = selectedRooms.reduce(
    (acc, item) => acc + item.room.pricePerNight * item.count * nights,
    0
  );
  const vatRate = 0.075; // 7.5% Nigerian VAT
  const vatAmount = subtotal * vatRate;
  const totalAmount = subtotal + vatAmount;

  // Handle Complete Booking
  const handleSimulatePayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      const randomRef = `GAR-${Math.floor(100000 + Math.random() * 900000)}`;
      setBookingRef(randomRef);
      setIsProcessingPayment(false);
      setCurrentStep(5); // Confirmation
    }, 1200);
  };

  return (
    <PageWrapper
      title="Book Your Stay — Grace Arena Resorts"
      description="Reserve your peaceful Christian retreat, luxury suite or thatched hut at Grace Arena Resorts."
    >
      {/* Page Header */}
      <Box
        bg="linear-gradient(rgba(7, 7, 7, 0.75), rgba(7, 7, 7, 0.95)), #070707"
        pt={{ base: "90px", md: "120px" }}
        pb={{ base: 6, md: 8 }}
        px={{ base: 4, md: 8 }}
        color="white"
        textAlign="center"
      >
        <Stack maxW="40rem" mx="auto" gap={2} align="center">
          <Text
            fontSize="12px"
            fontWeight="bold"
            color="accent.500"
            letterSpacing="3px"
            textTransform="uppercase"
          >
            Secure Booking Engine
          </Text>
          <Text as="h1" fontSize={{ base: "26px", md: "38px" }} fontWeight="bold">
            Reserve Your Sanctuary
          </Text>
        </Stack>

        {/* Stepper Bar (SRS 3.3 Item 1) */}
        {currentStep <= 4 && (
          <Flex
            maxW="52rem"
            mx="auto"
            mt={8}
            justify="space-between"
            align="center"
            position="relative"
            px={4}
          >
            {[
              { num: 1, label: "Dates & Guests" },
              { num: 2, label: "Select Rooms" },
              { num: 3, label: "Guest Details" },
              { num: 4, label: "Review & Pay" },
            ].map(({ num, label }) => {
              const isActive = currentStep === num;
              const isDone = currentStep > num;

              return (
                <Flex
                  key={num}
                  direction="column"
                  align="center"
                  gap={1.5}
                  cursor={isDone ? "pointer" : "default"}
                  onClick={() => isDone && setCurrentStep(num)}
                  zIndex={2}
                >
                  <Flex
                    boxSize={{ base: 8, md: 9 }}
                    borderRadius="full"
                    align="center"
                    justify="center"
                    bg={isActive ? "accent.500" : isDone ? "#22C55E" : "#1E293B"}
                    color={isActive ? "dark.500" : "white"}
                    fontWeight="bold"
                    fontSize="13px"
                    border="2px solid"
                    borderColor={isActive ? "accent.500" : isDone ? "#22C55E" : "#334155"}
                  >
                    {isDone ? <Icon as={FaCheckCircle} /> : num}
                  </Flex>
                  <Text
                    fontSize="11px"
                    fontWeight={isActive ? "bold" : "medium"}
                    color={isActive ? "accent.500" : isDone ? "white" : "gray.400"}
                    display={{ base: isActive ? "block" : "none", sm: "block" }}
                  >
                    {label}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Box>

      {/* Main Wizard Area */}
      <Box
        py={{ base: 8, md: 12 }}
        px={{ base: 4, md: 8, xl: 12 }}
        bg="#070707"
        color="white"
        minH="75vh"
      >
        <Box maxW="84rem" mx="auto">
          {currentStep === 5 ? (
            /* Confirmation Screen (SRS 3.3 Item 8) */
            <Box
              maxW="46rem"
              mx="auto"
              bg="#0F172A"
              p={{ base: 6, md: 10 }}
              borderRadius="24px"
              border="1px solid #1E293B"
            >
              <Stack align="center" textAlign="center" gap={4}>
                <Box bg="green.500/20" color="#22C55E" p={4} borderRadius="full">
                  <Icon as={FaCheckCircle} boxSize={12} />
                </Box>
                <Text
                  fontSize="12px"
                  fontWeight="bold"
                  color="accent.500"
                  letterSpacing="widest"
                  textTransform="uppercase"
                >
                  Booking Confirmed
                </Text>
                <Text fontSize={{ base: "26px", md: "34px" }} fontWeight="bold">
                  We look forward to welcoming you!
                </Text>

                <Box bg="#1E293B" py={3} px={6} borderRadius="12px" border="1px dashed #FCCA46">
                  <Text fontSize="12px" color="gray.400">
                    Your Booking Reference:
                  </Text>
                  <Text fontSize="24px" fontWeight="bold" color="accent.500" letterSpacing="wider">
                    {bookingRef}
                  </Text>
                </Box>

                <Text fontSize="14px" color="gray.300" maxW="34rem">
                  A confirmation email has been dispatched to <strong>{guestEmail}</strong>. Your
                  reservation is confirmed at Grace Arena Resorts, Igbo-Ora.
                </Text>

                {/* Summary Box */}
                <Box w="full" bg="#0A0F1D" p={5} borderRadius="14px" textAlign="left" my={2}>
                  <Text
                    fontSize="13px"
                    fontWeight="bold"
                    color="accent.500"
                    mb={3}
                    textTransform="uppercase"
                  >
                    Reservation Details
                  </Text>
                  <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} fontSize="13px">
                    <Box>
                      <Text color="gray.400">Guest Name:</Text>
                      <Text fontWeight="semibold">{guestName}</Text>
                    </Box>
                    <Box>
                      <Text color="gray.400">Dates:</Text>
                      <Text fontWeight="semibold">
                        {checkInDate} to {checkOutDate} ({nights} nights)
                      </Text>
                    </Box>
                    <Box>
                      <Text color="gray.400">Guests:</Text>
                      <Text fontWeight="semibold">
                        {adults} Adults {childrenCount > 0 && `, ${childrenCount} Children`}
                      </Text>
                    </Box>
                    <Box>
                      <Text color="gray.400">Total Paid:</Text>
                      <Text fontWeight="bold" color="accent.500">
                        ₦{totalAmount.toLocaleString()} (Incl. VAT)
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Box>

                <HStack gap={3} flexWrap="wrap" justify="center" pt={4}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.print()}
                    style={{ fontSize: "13px", padding: "10px 20px" }}
                  >
                    <Icon as={FaPrint} mr={2} /> Print / Save PDF
                  </Button>
                  <a
                    href={`https://wa.me/2348123456789?text=Hello%20Grace%20Arena,%20I%20just%20completed%20booking%20ref:%20${bookingRef}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <HStack
                      px={4}
                      py={2.5}
                      borderRadius="8px"
                      bg="#25D366"
                      color="white"
                      fontWeight="bold"
                      fontSize="13px"
                      cursor="pointer"
                    >
                      <Icon as={FaWhatsapp} boxSize={4} />
                      <Text>Message Concierge on WhatsApp</Text>
                    </HStack>
                  </a>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push(ROUTES.home)}
                    style={{ fontSize: "13px", padding: "10px 20px" }}
                  >
                    Return to Homepage
                  </Button>
                </HStack>
              </Stack>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1, lg: 12 }} gap={8}>
              {/* Wizard Form Stage (8 Columns) */}
              <Box gridColumn={{ base: "span 1", lg: "span 8" }}>
                {/* STEP 1: Dates & Guests */}
                {currentStep === 1 && (
                  <Box
                    bg="#0F172A"
                    p={{ base: 6, md: 8 }}
                    borderRadius="20px"
                    border="1px solid #1E293B"
                  >
                    <HStack gap={3} mb={6}>
                      <Icon as={FaCalendarAlt} color="accent.500" boxSize={5} />
                      <Text fontSize="20px" fontWeight="bold">
                        Step 1: Select Dates &amp; Guests
                      </Text>
                    </HStack>

                    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={6}>
                      <Box>
                        <Text fontSize="13px" fontWeight="medium" mb={2} color="gray.300">
                          Check-in Date
                        </Text>
                        <Input
                          type="date"
                          value={checkInDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          bg="#1E293B"
                          border="1px solid #334155"
                          color="white"
                          p={3}
                          borderRadius="10px"
                          _focus={{ borderColor: "accent.500" }}
                        />
                      </Box>

                      <Box>
                        <Text fontSize="13px" fontWeight="medium" mb={2} color="gray.300">
                          Number of Nights
                        </Text>
                        <Flex align="center" gap={3}>
                          <Box
                            as="button"
                            boxSize={10}
                            borderRadius="8px"
                            bg="#1E293B"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            cursor="pointer"
                            onClick={() => setNights(Math.max(1, nights - 1))}
                          >
                            <Icon as={FaMinus} boxSize={3} />
                          </Box>
                          <Text fontSize="18px" fontWeight="bold" minW="40px" textAlign="center">
                            {nights}
                          </Text>
                          <Box
                            as="button"
                            boxSize={10}
                            borderRadius="8px"
                            bg="#1E293B"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            cursor="pointer"
                            onClick={() => setNights(Math.min(30, nights + 1))}
                          >
                            <Icon as={FaPlus} boxSize={3} />
                          </Box>
                          <Text fontSize="12px" color="gray.400">
                            (Departs: {checkOutDate})
                          </Text>
                        </Flex>
                      </Box>
                    </SimpleGrid>

                    <Box mt={6} pt={6} borderTop="1px solid #1E293B">
                      <HStack gap={3} mb={4}>
                        <Icon as={FaUserFriends} color="accent.500" boxSize={4} />
                        <Text fontSize="16px" fontWeight="bold">
                          Guests Breakdown
                        </Text>
                      </HStack>

                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={6}>
                        <Box bg="#1E293B" p={4} borderRadius="12px">
                          <Flex justify="space-between" align="center">
                            <Box>
                              <Text fontSize="14px" fontWeight="bold">
                                Adults
                              </Text>
                              <Text fontSize="11px" color="gray.400">
                                Age 13 and above
                              </Text>
                            </Box>
                            <HStack gap={3}>
                              <Box
                                as="button"
                                boxSize={8}
                                borderRadius="6px"
                                bg="#334155"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                onClick={() => setAdults(Math.max(1, adults - 1))}
                              >
                                <Icon as={FaMinus} boxSize={2.5} />
                              </Box>
                              <Text fontWeight="bold">{adults}</Text>
                              <Box
                                as="button"
                                boxSize={8}
                                borderRadius="6px"
                                bg="#334155"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                onClick={() => setAdults(Math.min(10, adults + 1))}
                              >
                                <Icon as={FaPlus} boxSize={2.5} />
                              </Box>
                            </HStack>
                          </Flex>
                        </Box>

                        <Box bg="#1E293B" p={4} borderRadius="12px">
                          <Flex justify="space-between" align="center">
                            <Box>
                              <Text fontSize="14px" fontWeight="bold">
                                Children
                              </Text>
                              <Text fontSize="11px" color="gray.400">
                                Age 0–12
                              </Text>
                            </Box>
                            <HStack gap={3}>
                              <Box
                                as="button"
                                boxSize={8}
                                borderRadius="6px"
                                bg="#334155"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                              >
                                <Icon as={FaMinus} boxSize={2.5} />
                              </Box>
                              <Text fontWeight="bold">{childrenCount}</Text>
                              <Box
                                as="button"
                                boxSize={8}
                                borderRadius="6px"
                                bg="#334155"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                onClick={() => setChildrenCount(Math.min(8, childrenCount + 1))}
                              >
                                <Icon as={FaPlus} boxSize={2.5} />
                              </Box>
                            </HStack>
                          </Flex>
                        </Box>
                      </SimpleGrid>
                    </Box>

                    <Flex justify="flex-end" mt={8}>
                      <Button variant="primary" size="md" onClick={() => setCurrentStep(2)}>
                        Proceed to Select Rooms &rarr;
                      </Button>
                    </Flex>
                  </Box>
                )}

                {/* STEP 2: Select Rooms */}
                {currentStep === 2 && (
                  <Box
                    bg="#0F172A"
                    p={{ base: 6, md: 8 }}
                    borderRadius="20px"
                    border="1px solid #1E293B"
                  >
                    <HStack justify="space-between" align="center" mb={6}>
                      <HStack gap={3}>
                        <Icon as={FaBed} color="accent.500" boxSize={5} />
                        <Text fontSize="20px" fontWeight="bold">
                          Step 2: Choose Available Rooms
                        </Text>
                      </HStack>
                      <Button variant="secondary" size="sm" onClick={() => setCurrentStep(1)}>
                        &larr; Back to Dates
                      </Button>
                    </HStack>

                    <Stack gap={4}>
                      {AVAILABLE_ROOMS.map((room) => {
                        const isSelected = selectedRooms.some((r) => r.room.id === room.id);
                        const selectedCount =
                          selectedRooms.find((r) => r.room.id === room.id)?.count || 0;

                        return (
                          <Flex
                            key={room.id}
                            direction={{ base: "column", sm: "row" }}
                            bg="#1E293B"
                            borderRadius="14px"
                            overflow="hidden"
                            border="1px solid"
                            borderColor={isSelected ? "accent.500" : "#334155"}
                            align={{ sm: "center" }}
                            justify="space-between"
                            p={{ base: 4, sm: 4 }}
                            gap={4}
                          >
                            <HStack gap={4}>
                              <Image
                                src={room.image}
                                alt={room.name}
                                boxSize={{ base: "70px", sm: "80px" }}
                                borderRadius="10px"
                                objectFit="cover"
                              />
                              <Box>
                                <HStack gap={2} mb={1}>
                                  <Badge bg="accent.500" color="black" fontSize="10px">
                                    {room.campusTitle}
                                  </Badge>
                                  <Badge variant="outline" color="gray.300" fontSize="10px">
                                    {room.tier}
                                  </Badge>
                                </HStack>
                                <Text fontSize="16px" fontWeight="bold">
                                  {room.name}
                                </Text>
                                <Text fontSize="12px" color="gray.300">
                                  Up to {room.maxGuests} guests • Complimentary breakfast
                                </Text>
                              </Box>
                            </HStack>

                            <Flex align="center" justify="space-between" gap={4}>
                              <Box textAlign={{ sm: "right" }}>
                                <Text fontSize="11px" color="gray.400">
                                  Per night:
                                </Text>
                                <Text fontSize="17px" fontWeight="bold" color="accent.500">
                                  ₦{room.pricePerNight.toLocaleString()}
                                </Text>
                              </Box>

                              {isSelected ? (
                                <HStack gap={2}>
                                  <Box
                                    as="button"
                                    onClick={() => handleAddRoom(room)}
                                    px={3}
                                    py={1.5}
                                    borderRadius="8px"
                                    bg="#22C55E"
                                    color="white"
                                    fontSize="12px"
                                    fontWeight="bold"
                                  >
                                    Added ({selectedCount})
                                  </Box>
                                  <Box
                                    as="button"
                                    onClick={() => handleRemoveRoom(room.id)}
                                    p={2}
                                    color="red.400"
                                    _hover={{ color: "red.300" }}
                                    cursor="pointer"
                                  >
                                    <Icon as={FaTrash} boxSize={3.5} />
                                  </Box>
                                </HStack>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleAddRoom(room)}
                                  style={{ fontSize: "12px", padding: "8px 16px" }}
                                >
                                  Add Room
                                </Button>
                              )}
                            </Flex>
                          </Flex>
                        );
                      })}
                    </Stack>

                    <Flex justify="space-between" align="center" mt={8}>
                      <Text fontSize="13px" color="gray.400">
                        {selectedRooms.length} room type(s) selected
                      </Text>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={selectedRooms.length === 0}
                        onClick={() => setCurrentStep(3)}
                      >
                        Proceed to Guest Info &rarr;
                      </Button>
                    </Flex>
                  </Box>
                )}

                {/* STEP 3: Guest Information */}
                {currentStep === 3 && (
                  <Box
                    bg="#0F172A"
                    p={{ base: 6, md: 8 }}
                    borderRadius="20px"
                    border="1px solid #1E293B"
                  >
                    <HStack justify="space-between" align="center" mb={6}>
                      <HStack gap={3}>
                        <Icon as={FaUserFriends} color="accent.500" boxSize={5} />
                        <Text fontSize="20px" fontWeight="bold">
                          Step 3: Primary Guest Information
                        </Text>
                      </HStack>
                      <Button variant="secondary" size="sm" onClick={() => setCurrentStep(2)}>
                        &larr; Back to Rooms
                      </Button>
                    </HStack>

                    <Stack gap={4}>
                      <Box>
                        <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                          Full Name *
                        </Text>
                        <Input
                          required
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="e.g. Pastor David Adeleke"
                          bg="#1E293B"
                          border="1px solid #334155"
                          color="white"
                          p={3}
                          borderRadius="8px"
                          fontSize="14px"
                        />
                      </Box>

                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                        <Box>
                          <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                            Email Address *
                          </Text>
                          <Input
                            required
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="e.g. david@example.com"
                            bg="#1E293B"
                            border="1px solid #334155"
                            color="white"
                            p={3}
                            borderRadius="8px"
                            fontSize="14px"
                          />
                        </Box>

                        <Box>
                          <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                            Phone Number (Nigerian +234 format) *
                          </Text>
                          <Input
                            required
                            type="tel"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="+234 812 345 6789"
                            bg="#1E293B"
                            border="1px solid #334155"
                            color="white"
                            p={3}
                            borderRadius="8px"
                            fontSize="14px"
                          />
                        </Box>
                      </SimpleGrid>

                      {/* Prayer Hut Request (SRS Distinction) */}
                      <Box
                        bg="#1E293B"
                        p={4}
                        borderRadius="12px"
                        border="1px solid rgba(252, 202, 70, 0.3)"
                      >
                        <Flex align="flex-start" gap={3}>
                          <input
                            type="checkbox"
                            checked={prayerHutInterest}
                            onChange={(e) => setPrayerHutInterest(e.target.checked)}
                            style={{
                              cursor: "pointer",
                              marginTop: "4px",
                              accentColor: "#FCCA46",
                              width: "16px",
                              height: "16px",
                            }}
                          />
                          <Box>
                            <HStack gap={2}>
                              <Icon as={FaPray} color="accent.500" boxSize={3.5} />
                              <Text fontSize="14px" fontWeight="bold" color="white">
                                Reserve Dedicated Prayer Hut Session
                              </Text>
                            </HStack>
                            <Text fontSize="12px" color="gray.300" mt={1}>
                              Complimentary for guests. Our team will schedule private quiet hours
                              for you at the sanctuary during your stay.
                            </Text>
                          </Box>
                        </Flex>
                      </Box>

                      <Box>
                        <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                          Special Dietary or Arrival Requests
                        </Text>
                        <Textarea
                          value={specialRequests}
                          onChange={(e) => setSpecialRequests(e.target.value)}
                          placeholder="Let us know if you require early check-in, twin bed configuration, or airport transfer from Ibadan/Lagos."
                          bg="#1E293B"
                          border="1px solid #334155"
                          color="white"
                          p={3}
                          borderRadius="8px"
                          fontSize="13px"
                          rows={3}
                        />
                      </Box>
                    </Stack>

                    <Flex justify="flex-end" mt={8}>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={!guestName || !guestEmail || !guestPhone}
                        onClick={() => setCurrentStep(4)}
                      >
                        Review &amp; Payment &rarr;
                      </Button>
                    </Flex>
                  </Box>
                )}

                {/* STEP 4: Review & Payment */}
                {currentStep === 4 && (
                  <Box
                    bg="#0F172A"
                    p={{ base: 6, md: 8 }}
                    borderRadius="20px"
                    border="1px solid #1E293B"
                  >
                    <HStack justify="space-between" align="center" mb={6}>
                      <HStack gap={3}>
                        <Icon as={FaCreditCard} color="accent.500" boxSize={5} />
                        <Text fontSize="20px" fontWeight="bold">
                          Step 4: Review &amp; Payment
                        </Text>
                      </HStack>
                      <Button variant="secondary" size="sm" onClick={() => setCurrentStep(3)}>
                        &larr; Back to Guest Info
                      </Button>
                    </HStack>

                    {/* Summary Card */}
                    <Box bg="#1E293B" p={5} borderRadius="14px" mb={6}>
                      <Text
                        fontSize="13px"
                        fontWeight="bold"
                        color="accent.500"
                        mb={3}
                        textTransform="uppercase"
                      >
                        Stay Overview
                      </Text>
                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3} fontSize="13px">
                        <Box>
                          <Text color="gray.400">Guest:</Text>
                          <Text fontWeight="bold">{guestName}</Text>
                          <Text color="gray.300" fontSize="12px">
                            {guestEmail} • {guestPhone}
                          </Text>
                        </Box>
                        <Box>
                          <Text color="gray.400">Dates &amp; Duration:</Text>
                          <Text fontWeight="bold">
                            {checkInDate} to {checkOutDate} ({nights} nights)
                          </Text>
                          <Text color="gray.300" fontSize="12px">
                            {adults} Adults {childrenCount > 0 && `, ${childrenCount} Children`}
                          </Text>
                        </Box>
                      </SimpleGrid>
                    </Box>

                    {/* Payment Mode */}
                    <Box mb={6}>
                      <Text fontSize="14px" fontWeight="bold" mb={3}>
                        Select Payment Method
                      </Text>
                      <Stack gap={3}>
                        <Box
                          p={4}
                          borderRadius="12px"
                          border="2px solid"
                          borderColor="accent.500"
                          bg="rgba(252, 202, 70, 0.08)"
                        >
                          <Flex justify="space-between" align="center">
                            <HStack gap={3}>
                              <Icon as={FaShieldAlt} color="accent.500" boxSize={5} />
                              <Box>
                                <Text fontSize="14px" fontWeight="bold">
                                  Paystack Secure Online Payment
                                </Text>
                                <Text fontSize="12px" color="gray.400">
                                  Instant confirmation via Debit Card, Bank Transfer, or USSD
                                </Text>
                              </Box>
                            </HStack>
                            <Badge bg="accent.500" color="black">
                              Recommended
                            </Badge>
                          </Flex>
                        </Box>

                        <Box p={4} borderRadius="12px" border="1px solid #334155" bg="#1E293B">
                          <a
                            href={`https://wa.me/2348123456789?text=Hello%20Grace%20Arena,%20I%20would%20like%20to%20pay%20manually%20for%20my%20booking%20(${guestName},%20${totalAmount}NGN)`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: "none", color: "inherit", display: "block" }}
                          >
                            <Flex justify="space-between" align="center">
                              <HStack gap={3}>
                                <Icon as={FaWhatsapp} color="#25D366" boxSize={5} />
                                <Box>
                                  <Text fontSize="14px" fontWeight="bold">
                                    Direct Bank Transfer / WhatsApp Assistance
                                  </Text>
                                  <Text fontSize="12px" color="gray.400">
                                    Speak directly with our front desk cashier on WhatsApp
                                  </Text>
                                </Box>
                              </HStack>
                              <Text fontSize="12px" color="#25D366" fontWeight="bold">
                                Chat &rarr;
                              </Text>
                            </Flex>
                          </a>
                        </Box>
                      </Stack>
                    </Box>

                    <Flex justify="flex-end">
                      <Button
                        variant="primary"
                        size="lg"
                        disabled={isProcessingPayment}
                        onClick={handleSimulatePayment}
                        style={{ padding: "14px 36px" }}
                      >
                        {isProcessingPayment
                          ? "Securing Reservation..."
                          : `Pay ₦${totalAmount.toLocaleString()} with Paystack`}
                      </Button>
                    </Flex>
                  </Box>
                )}
              </Box>

              {/* Sticky Summary Sidebar (4 Columns) (SRS 3.3 Item 5) */}
              <Box gridColumn={{ base: "span 1", lg: "span 4" }}>
                <Box
                  bg="#0F172A"
                  p={6}
                  borderRadius="20px"
                  border="1px solid #1E293B"
                  position="sticky"
                  top="90px"
                >
                  <Text fontSize="16px" fontWeight="bold" color="white" mb={4}>
                    Booking Summary
                  </Text>

                  {/* Dates preview */}
                  <Box pb={4} mb={4} borderBottom="1px solid #1E293B">
                    <Text fontSize="11px" color="gray.400" textTransform="uppercase">
                      Dates:
                    </Text>
                    <Text fontSize="14px" fontWeight="semibold">
                      {checkInDate} &rarr; {checkOutDate} ({nights} nights)
                    </Text>
                    <Text fontSize="12px" color="gray.400">
                      {adults} Adults {childrenCount > 0 ? `, ${childrenCount} Children` : ""}
                    </Text>
                  </Box>

                  {/* Room breakdown */}
                  <Box pb={4} mb={4} borderBottom="1px solid #1E293B">
                    <Text fontSize="11px" color="gray.400" textTransform="uppercase" mb={2}>
                      Selected Rooms:
                    </Text>
                    {selectedRooms.length === 0 ? (
                      <Text fontSize="13px" color="gray.500" fontStyle="italic">
                        No rooms chosen yet
                      </Text>
                    ) : (
                      <Stack gap={2}>
                        {selectedRooms.map(({ room, count }) => (
                          <Flex
                            key={room.id}
                            justify="space-between"
                            align="center"
                            fontSize="13px"
                          >
                            <Box>
                              <Text fontWeight="medium">{room.name}</Text>
                              <Text fontSize="11px" color="gray.400">
                                {count}x @ ₦{room.pricePerNight.toLocaleString()} / night
                              </Text>
                            </Box>
                            <Text fontWeight="bold">
                              ₦{(room.pricePerNight * count * nights).toLocaleString()}
                            </Text>
                          </Flex>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  {/* Taxes & Total */}
                  <Stack gap={2} fontSize="13px" pb={4} mb={4} borderBottom="1px solid #1E293B">
                    <Flex justify="space-between" color="gray.300">
                      <Text>Room Subtotal:</Text>
                      <Text>₦{subtotal.toLocaleString()}</Text>
                    </Flex>
                    <Flex justify="space-between" color="gray.300">
                      <Text>VAT (7.5%):</Text>
                      <Text>₦{vatAmount.toLocaleString()}</Text>
                    </Flex>
                  </Stack>

                  <Flex justify="space-between" align="baseline" mb={4}>
                    <Text fontSize="15px" fontWeight="bold">
                      Total (NGN):
                    </Text>
                    <Text fontSize="22px" fontWeight="bold" color="accent.500">
                      ₦{totalAmount.toLocaleString()}
                    </Text>
                  </Flex>

                  {/* Help banner */}
                  <Box bg="#1E293B" p={3.5} borderRadius="10px">
                    <HStack gap={2} mb={1}>
                      <Icon as={FaWhatsapp} color="#25D366" boxSize={4} />
                      <Text fontSize="12px" fontWeight="bold" color="white">
                        Need Help Booking?
                      </Text>
                    </HStack>
                    <Text fontSize="11px" color="gray.400">
                      Our desk is available 24/7 on WhatsApp: +234 812 345 6789.
                    </Text>
                  </Box>
                </Box>
              </Box>
            </SimpleGrid>
          )}
        </Box>
      </Box>
    </PageWrapper>
  );
}
