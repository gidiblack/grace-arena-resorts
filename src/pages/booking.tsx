import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import BookingConfirmationView from "@/features/booking/components/BookingConfirmationView";
import { step1DatesGuestsSchema, step3GuestSchema } from "@/features/booking/schemas";

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
  FaTrash,
  FaWhatsapp,
  FaPray,
  FaPlus,
  FaMinus,
  FaShieldAlt,
  FaTag,
  FaExclamationTriangle,
} from "react-icons/fa";

interface AvailableRoom {
  id: string;
  name: string;
  campusTitle: string;
  tier: string;
  pricePerNight: number;
  maxGuests: number;
  image: string;
  totalUnits?: number;
  status?: string;
}

const DEFAULT_ROOMS: AvailableRoom[] = [
  {
    id: "elysian-fountain-standard",
    name: "Standard Room",
    campusTitle: "GAR Elysian",
    tier: "Standard",
    pricePerNight: 60000,
    maxGuests: 2,
    image: suite2.src,
    status: "available",
  },
  {
    id: "elysian-fountain-deluxe",
    name: "Deluxe Room",
    campusTitle: "GAR Elysian",
    tier: "Deluxe",
    pricePerNight: 70000,
    maxGuests: 2,
    image: suite.src,
    status: "available",
  },
  {
    id: "elysian-oasis-deluxe-suite",
    name: "Deluxe Suite with Kitchenette",
    campusTitle: "GAR Elysian",
    tier: "Deluxe",
    pricePerNight: 80000,
    maxGuests: 2,
    image: suite2.src,
    status: "available",
  },
  {
    id: "elysian-oasis-premium-suite",
    name: "Premium Suite Apartment",
    campusTitle: "GAR Elysian",
    tier: "Premium",
    pricePerNight: 90000,
    maxGuests: 2,
    image: suite.src,
    status: "available",
  },
  {
    id: "elysian-cabana-premium",
    name: "The Cabana Premium Suite",
    campusTitle: "GAR Elysian",
    tier: "Premium",
    pricePerNight: 120000,
    maxGuests: 2,
    image: elysian.src,
    status: "available",
  },
  {
    id: "village-executive-hut",
    name: "Executive Thatched Hut",
    campusTitle: "GAR Village",
    tier: "Executive",
    pricePerNight: 100000,
    maxGuests: 2,
    image: hut.src,
    status: "available",
  },
];

interface AppliedDeal {
  code: string;
  title: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  applicableRoomTypeIds?: string[];
}

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
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>(DEFAULT_ROOMS);
  const [selectedRooms, setSelectedRooms] = useState<{ room: AvailableRoom; count: number }[]>([]);
  const [campusFilter, setCampusFilter] = useState<string>("all");

  // Step 3: Guest Information
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("+234");
  const [prayerHutInterest, setPrayerHutInterest] = useState(true);
  const [specialRequests, setSpecialRequests] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Deals / Discounts
  const [dealInputCode, setDealInputCode] = useState("");
  const [appliedDeal, setAppliedDeal] = useState<AppliedDeal | null>(null);
  const [dealMessage, setDealMessage] = useState<string | null>(null);
  const [dealError, setDealError] = useState<string | null>(null);

  // Step 4: Payment & Fallback State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isGatewayDowntimeActive, setIsGatewayDowntimeActive] = useState(false);

  // Confirmation state
  const [confirmedBookingData, setConfirmedBookingData] = useState<{
    reference: string;
    guestName: string;
    guestEmail: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    total: number;
  } | null>(null);

  // Check-out date calculation
  const checkOutDate = useMemo(() => {
    if (!checkInDate) return "";
    const date = new Date(checkInDate);
    date.setDate(date.getDate() + nights);
    return date.toISOString().split("T")[0];
  }, [checkInDate, nights]);

  // Load authenticated user profile if logged in
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setGuestName((prev) => prev || json.data.fullName || "");
            setGuestEmail((prev) => prev || json.data.email || "");
            if (json.data.phone) {
              setGuestPhone(json.data.phone);
            }
          }
        }
      } catch {
        // Guest browsing anonymously
      }
    }
    loadCurrentUser();
  }, []);

  // Fetch live availability from API
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/v1/availability?checkIn=${checkInDate}&nights=${nights}`);
        if (!isMounted) return;
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            // Filter out under-construction rooms
            const activeOnly = json.data
              .filter((r: { status?: string }) => r.status !== "under_construction")
              .map((r: { id: string; name: string; tier: string; effective_nightly_price?: number; base_price?: number; max_guests?: number; total_units?: number; status?: string }) => {
                const matchedFallback = DEFAULT_ROOMS.find((dr) => dr.id === r.id);
                return {
                  id: r.id,
                  name: r.name,
                  campusTitle: r.id.startsWith("village") ? "GAR Village" : "GAR Elysian",
                  tier: r.tier.charAt(0).toUpperCase() + r.tier.slice(1),
                  pricePerNight: r.effective_nightly_price || r.base_price || 60000,
                  maxGuests: r.max_guests || 2,
                  image: matchedFallback?.image || suite.src,
                  totalUnits: r.total_units || 5,
                  status: r.status || "available",
                };
              });

            if (activeOnly.length > 0 && isMounted) {
              setAvailableRooms(activeOnly);
            }
          }
        }
      } catch {
        // Fallback to initial catalogue if backend unavailable
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [checkInDate, nights]);

  // Query pre-selection: ?room={id}
  useEffect(() => {
    if (!router.isReady || !router.query.room) return;
    const roomId = router.query.room as string;
    const timer = setTimeout(() => {
      setSelectedRooms((prev) => {
        if (prev.length > 0) return prev;
        const match = availableRooms.find((r) => r.id === roomId);
        return match ? [{ room: match, count: 1 }] : prev;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [router.isReady, router.query.room, availableRooms]);

  // Query pre-selection: ?deal={code}
  const validateDeal = useCallback(async (code: string) => {
    if (!code) return;
    setDealError(null);
    setDealMessage(null);
    try {
      const res = await fetch(`/api/v1/deals/validate/${encodeURIComponent(code)}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const d = json.data;
        setAppliedDeal({
          code: d.code,
          title: d.title,
          discountType: d.discountType,
          discountValue: d.discountValue,
          applicableRoomTypeIds: d.applicableRoomTypeIds,
        });
        setDealMessage(`Promo "${d.code}" applied: ${d.discountType === "percentage" ? `${d.discountValue}% off` : `₦${d.discountValue.toLocaleString()} off`}`);
      } else {
        setDealError(json.error?.message || "Invalid promo code");
      }
    } catch {
      setDealError("Unable to validate promo code at this time.");
    }
  }, []);

  useEffect(() => {
    if (!router.isReady || !router.query.deal) return;
    const code = router.query.deal as string;
    let isCancelled = false;
    async function loadDeal() {
      await validateDeal(code);
      if (!isCancelled) {
        setDealInputCode(code);
      }
    }
    loadDeal();
    return () => {
      isCancelled = true;
    };
  }, [router.isReady, router.query.deal, validateDeal]);

  // Check if returning from Paystack callback: ?confirmed=true&reference=...
  useEffect(() => {
    if (!router.isReady) return;
    const { confirmed, reference } = router.query;
    if (confirmed === "true" && typeof reference === "string" && reference.length > 0) {
      const refStr: string = reference;
      async function loadConfirmation() {
        try {
          const res = await fetch(`/api/v1/payments/verify?reference=${encodeURIComponent(refStr)}`);
          const json = await res.json();
          if (res.ok && json.success) {
            setConfirmedBookingData({
              reference: refStr,
              guestName: guestName || "Valued Guest",
              guestEmail: guestEmail || "guest@example.com",
              checkInDate,
              checkOutDate,
              nights,
              total: json.data?.total || 0,
            });
            setCurrentStep(5);
          }
        } catch {
          // If verify network fails, load basic reference
          setConfirmedBookingData({
            reference: refStr,
            guestName: guestName || "Valued Guest",
            guestEmail: guestEmail || "guest@example.com",
            checkInDate,
            checkOutDate,
            nights,
            total: 0,
          });
          setCurrentStep(5);
        }
      }
      loadConfirmation();
    }
  }, [router.isReady, router.query, guestName, guestEmail, checkInDate, checkOutDate, nights]);

  // Pricing calculation aligned with GAR-SRS Section 4.3
  const pricing = useMemo(() => {
    const rawSubtotal = selectedRooms.reduce(
      (sum, { room, count }) => sum + room.pricePerNight * count * nights,
      0
    );

    let dealDiscount = 0;
    if (appliedDeal) {
      if (appliedDeal.discountType === "percentage") {
        let applicableSubtotal = 0;
        selectedRooms.forEach(({ room, count }) => {
          if (
            !appliedDeal.applicableRoomTypeIds ||
            appliedDeal.applicableRoomTypeIds.length === 0 ||
            appliedDeal.applicableRoomTypeIds.includes(room.id)
          ) {
            applicableSubtotal += room.pricePerNight * count * nights;
          }
        });
        dealDiscount = Math.round(applicableSubtotal * (appliedDeal.discountValue / 100));
      } else {
        dealDiscount = Math.min(rawSubtotal, appliedDeal.discountValue);
      }
    }

    const discountedSubtotal = Math.max(0, rawSubtotal - dealDiscount);
    const tax = Math.round(discountedSubtotal * 0.075); // 7.5% Nigerian VAT
    const total = discountedSubtotal + tax;

    return {
      subtotal: rawSubtotal,
      dealDiscount,
      tax,
      total,
    };
  }, [selectedRooms, nights, appliedDeal]);

  // Room quantity controls
  const handleAddRoom = (room: AvailableRoom) => {
    setSelectedRooms((prev) => {
      const existing = prev.find((item) => item.room.id === room.id);
      if (existing) {
        return prev.map((item) =>
          item.room.id === room.id ? { ...item, count: item.count + 1 } : item
        );
      }
      return [...prev, { room, count: 1 }];
    });
  };

  const handleRemoveRoom = (roomId: string) => {
    setSelectedRooms((prev) => {
      const existing = prev.find((item) => item.room.id === roomId);
      if (existing && existing.count > 1) {
        return prev.map((item) =>
          item.room.id === roomId ? { ...item, count: item.count - 1 } : item
        );
      }
      return prev.filter((item) => item.room.id !== roomId);
    });
  };

  const handleClearRoom = (roomId: string) => {
    setSelectedRooms((prev) => prev.filter((item) => item.room.id !== roomId));
  };

  // Step 3 validation
  const validateGuestDetails = () => {
    setPhoneError(null);
    const result = step3GuestSchema.safeParse({
      fullName: guestName,
      email: guestEmail,
      phone: guestPhone,
      specialRequests,
      prayerHutSession: prayerHutInterest,
    });

    if (!result.success) {
      const issue = result.error.issues[0];
      if (issue.path.includes("phone")) {
        setPhoneError("Phone number must be in +234XXXXXXXXXX Nigerian format (10 digits after +234)");
      } else {
        setPaymentError(issue.message);
      }
      return false;
    }
    return true;
  };

  // Step 4 Payment Submission
  const handleProceedToPayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    // 1. Create booking reservation via API
    try {
      const bookingPayload = {
        checkInDate,
        nights,
        rooms: selectedRooms.map(({ room, count }) => ({
          roomTypeId: room.id,
          quantity: count,
        })),
        adults,
        children: childrenCount,
        guest: {
          fullName: guestName,
          email: guestEmail,
          phone: guestPhone,
          specialRequests: `${specialRequests}${prayerHutInterest ? " [Requested complimentary Prayer Hut Quiet Session]" : ""}`,
        },
        dealCode: appliedDeal?.code,
        paymentMethod: "paystack",
      };

      const bookingRes = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload),
      });

      const bookingData = await bookingRes.json();

      if (!bookingRes.ok || !bookingData.success) {
        // If unauthenticated or email not verified per SRS 4.1
        if (bookingData.error?.code === "UNAUTHORIZED" || bookingData.error?.code === "EMAIL_NOT_VERIFIED") {
          router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`);
          return;
        }

        setPaymentError(bookingData.error?.message || "Failed to reserve rooms.");
        setIsProcessingPayment(false);
        return;
      }

      const ref = bookingData.data.booking.reference;

      // 2. Initiate Paystack payment
      const callbackUrl = `${window.location.origin}/booking?confirmed=true&reference=${encodeURIComponent(ref)}`;
      const paymentRes = await fetch("/api/v1/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingReference: ref,
          callbackUrl,
        }),
      });

      const paymentData = await paymentRes.json();

      if (!paymentRes.ok || !paymentData.success) {
        if (paymentData.error?.details?.downtimeFallbackRecommended) {
          setIsGatewayDowntimeActive(true);
        }
        setPaymentError(paymentData.error?.message || "Payment initiation error. Please retry or contact on WhatsApp.");
        setIsProcessingPayment(false);
        return;
      }

      // 3. Redirect to Paystack Checkout URL
      if (paymentData.data?.authorizationUrl) {
        window.location.href = paymentData.data.authorizationUrl;
      } else {
        // Direct confirmation fallback
        setConfirmedBookingData({
          reference: ref,
          guestName,
          guestEmail,
          checkInDate,
          checkOutDate,
          nights,
          total: pricing.total,
        });
        setCurrentStep(5);
      }
    } catch {
      setPaymentError("A network exception occurred while processing your reservation.");
      setIsProcessingPayment(false);
    }
  };

  // Filter rooms by campus
  const filteredRooms = useMemo(() => {
    if (campusFilter === "elysian") {
      return availableRooms.filter((r) => r.campusTitle.includes("Elysian"));
    }
    if (campusFilter === "village") {
      return availableRooms.filter((r) => r.campusTitle.includes("Village"));
    }
    return availableRooms;
  }, [availableRooms, campusFilter]);

  return (
    <PageWrapper
      title="Reserve Your Stay — Grace Arena Resorts"
      description="Select your campus, dates, and accommodation at Grace Arena Resorts. Faith, hospitality, and serene retreat."
    >
      <Box bg="#0B132B" color="white" minH="90vh" py={{ base: 8, md: 14 }}>
        <Box maxW="1200px" mx="auto" px={{ base: 4, sm: 6, lg: 8 }}>
          {/* Header */}
          <Box textAlign="center" mb={{ base: 8, md: 12 }}>
            <Badge bg="accent.500" color="black" px={3} py={1} borderRadius="full" mb={3}>
              Online Reservation Engine
            </Badge>
            <Text
              as="h1"
              fontSize={{ base: "28px", sm: "36px", md: "44px" }}
              fontWeight="extrabold"
              letterSpacing="-0.5px"
            >
              Reserve Your Sacred Getaway
            </Text>
            <Text fontSize={{ base: "14px", md: "16px" }} color="gray.400" mt={2}>
              Experience holy hospitality across our Elysian Sanctuary &amp; Village Retreat.
            </Text>
          </Box>

          {/* STEP 5: Confirmation View */}
          {currentStep === 5 && confirmedBookingData ? (
            <BookingConfirmationView
              reference={confirmedBookingData.reference}
              guestName={confirmedBookingData.guestName}
              guestEmail={confirmedBookingData.guestEmail}
              checkInDate={confirmedBookingData.checkInDate}
              checkOutDate={confirmedBookingData.checkOutDate}
              nights={confirmedBookingData.nights}
              total={confirmedBookingData.total || pricing.total}
            />
          ) : (
            /* Wizard Steps 1 to 4 */
            <SimpleGrid columns={{ base: 1, lg: 12 }} gap={8}>
              {/* Main Steps Content (8 Columns) */}
              <Box gridColumn={{ base: "span 1", lg: "span 8" }}>
                {/* Responsive Step Indicator Banner */}
                <Box bg="#0F172A" p={4} borderRadius="16px" border="1px solid #1E293B" mb={6}>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text fontSize="13px" fontWeight="bold" color="accent.500" textTransform="uppercase">
                      Step {currentStep} of 4
                    </Text>
                    <Text fontSize="12px" color="gray.400">
                      {currentStep === 1 && "Dates & Guests"}
                      {currentStep === 2 && "Room Selection"}
                      {currentStep === 3 && "Guest Information"}
                      {currentStep === 4 && "Review & Payment"}
                    </Text>
                  </Flex>

                  {/* Progress bar line */}
                  <Box w="100%" h="6px" bg="#1E293B" borderRadius="full" overflow="hidden">
                    <Box
                      h="100%"
                      bg="accent.500"
                      w={`${(currentStep / 4) * 100}%`}
                      transition="width 0.3s ease"
                    />
                  </Box>
                </Box>

                {/* Gateway Downtime Fallback Warning Banner */}
                {isGatewayDowntimeActive && (
                  <Box
                    bg="rgba(237, 137, 54, 0.15)"
                    p={4}
                    borderRadius="14px"
                    border="1px solid #ED8936"
                    mb={6}
                  >
                    <HStack gap={3} align="flex-start">
                      <Icon as={FaExclamationTriangle} color="#ED8936" boxSize={5} mt={0.5} />
                      <Box>
                        <Text fontSize="14px" fontWeight="bold" color="#ED8936">
                          Online Payment Temporarily Unavailable
                        </Text>
                        <Text fontSize="13px" color="gray.300" mt={1}>
                          Our gateway is currently undergoing maintenance. Your room hold is extended to 2 hours!
                          Please message our concierge directly on WhatsApp to confirm with manual transfer.
                        </Text>
                        <a
                          href={`https://wa.me/2348123456789?text=${encodeURIComponent(`Hello Grace Arena, I want to confirm my booking hold (${guestName}, ${pricing.total} NGN)`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "none", display: "inline-block", marginTop: "8px" }}
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            style={{ borderColor: "#25D366", color: "#25D366" }}
                          >
                            <HStack gap={2}>
                              <Icon as={FaWhatsapp} />
                              <Text>Book Instantly via WhatsApp</Text>
                            </HStack>
                          </Button>
                        </a>
                      </Box>
                    </HStack>
                  </Box>
                )}

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
                        Step 1: Dates &amp; Guests
                      </Text>
                    </HStack>

                    <Stack gap={6}>
                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                        <Box>
                          <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                            Check-in Date (14:00 Check-in)
                          </Text>
                          <Input
                            type="date"
                            min={new Date().toISOString().split("T")[0]}
                            value={checkInDate}
                            onChange={(e) => setCheckInDate(e.target.value)}
                            bg="#1E293B"
                            border="1px solid #334155"
                            color="white"
                            p={3}
                            borderRadius="8px"
                          />
                        </Box>
                        <Box>
                          <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                            Length of Stay (Nights)
                          </Text>
                          <Flex align="center" gap={3}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setNights((n) => Math.max(1, n - 1))}
                            >
                              <Icon as={FaMinus} />
                            </Button>
                            <Text fontWeight="bold" fontSize="16px" w="40px" textAlign="center">
                              {nights}
                            </Text>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setNights((n) => Math.min(30, n + 1))}
                            >
                              <Icon as={FaPlus} />
                            </Button>
                            <Text fontSize="12px" color="gray.400">
                              Check-out: {checkOutDate} (11:00 AM)
                            </Text>
                          </Flex>
                        </Box>
                      </SimpleGrid>

                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                        <Box>
                          <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                            Adults (18+)
                          </Text>
                          <Flex align="center" gap={3}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setAdults((a) => Math.max(1, a - 1))}
                            >
                              <Icon as={FaMinus} />
                            </Button>
                            <Text fontWeight="bold" fontSize="16px" w="40px" textAlign="center">
                              {adults}
                            </Text>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setAdults((a) => Math.min(10, a + 1))}
                            >
                              <Icon as={FaPlus} />
                            </Button>
                          </Flex>
                        </Box>
                        <Box>
                          <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                            Children (0–17)
                          </Text>
                          <Flex align="center" gap={3}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setChildrenCount((c) => Math.max(0, c - 1))}
                            >
                              <Icon as={FaMinus} />
                            </Button>
                            <Text fontWeight="bold" fontSize="16px" w="40px" textAlign="center">
                              {childrenCount}
                            </Text>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setChildrenCount((c) => Math.min(10, c + 1))}
                            >
                              <Icon as={FaPlus} />
                            </Button>
                          </Flex>
                        </Box>
                      </SimpleGrid>
                    </Stack>

                    <Flex justify="flex-end" mt={8}>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                          const parsed = step1DatesGuestsSchema.safeParse({
                            checkInDate,
                            nights,
                            adults,
                            children: childrenCount,
                          });
                          if (parsed.success) {
                            setCurrentStep(2);
                          }
                        }}
                      >
                        Select Rooms &rarr;
                      </Button>
                    </Flex>
                  </Box>
                )}

                {/* STEP 2: Room Selection */}
                {currentStep === 2 && (
                  <Box
                    bg="#0F172A"
                    p={{ base: 6, md: 8 }}
                    borderRadius="20px"
                    border="1px solid #1E293B"
                  >
                    <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={3}>
                      <HStack gap={3}>
                        <Icon as={FaBed} color="accent.500" boxSize={5} />
                        <Text fontSize="20px" fontWeight="bold">
                          Step 2: Choose Accommodation
                        </Text>
                      </HStack>
                      <Button variant="secondary" size="sm" onClick={() => setCurrentStep(1)}>
                        &larr; Change Dates
                      </Button>
                    </Flex>

                    {/* Campus Filter */}
                    <HStack gap={2} mb={6} overflowX="auto" pb={2}>
                      <Button
                        variant={campusFilter === "all" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setCampusFilter("all")}
                      >
                        All Accommodations ({availableRooms.length})
                      </Button>
                      <Button
                        variant={campusFilter === "elysian" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setCampusFilter("elysian")}
                      >
                        Elysian Sanctuary
                      </Button>
                      <Button
                        variant={campusFilter === "village" ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setCampusFilter("village")}
                      >
                        Village Thatched Retreat
                      </Button>
                    </HStack>

                    {/* Deal preselection banner if active */}
                    {appliedDeal && (
                      <Box
                        p={3}
                        mb={4}
                        borderRadius="10px"
                        bg="rgba(252, 202, 70, 0.15)"
                        border="1px solid rgba(252, 202, 70, 0.4)"
                      >
                        <HStack gap={2}>
                          <Icon as={FaTag} color="accent.500" />
                          <Text fontSize="13px" fontWeight="bold" color="white">
                            {dealMessage || `Deal Active: ${appliedDeal.title}`}
                          </Text>
                        </HStack>
                      </Box>
                    )}

                    {/* Rooms List */}
                    <Stack gap={4}>
                      {filteredRooms.map((room) => {
                        const selected = selectedRooms.find((item) => item.room.id === room.id);
                        const isUnderConstruction = room.status === "under_construction";

                        if (isUnderConstruction) return null; // Never selectable in wizard per SRS

                        return (
                          <Box
                            key={room.id}
                            bg="#1E293B"
                            p={4}
                            borderRadius="16px"
                            border="1px solid"
                            borderColor={selected ? "accent.500" : "#334155"}
                          >
                            <SimpleGrid columns={{ base: 1, sm: 12 }} gap={4} alignContent="center">
                              <Box gridColumn={{ base: "span 1", sm: "span 4" }}>
                                <Image
                                  src={room.image}
                                  alt={room.name}
                                  borderRadius="10px"
                                  w="100%"
                                  h={{ base: "140px", sm: "100%" }}
                                  objectFit="cover"
                                />
                              </Box>
                              <Box gridColumn={{ base: "span 1", sm: "span 8" }}>
                                <Flex justify="space-between" align="flex-start" flexWrap="wrap">
                                  <Box>
                                    <Badge bg="#334155" color="gray.300" fontSize="10px" mb={1}>
                                      {room.campusTitle} • {room.tier}
                                    </Badge>
                                    <Text fontSize="16px" fontWeight="bold" color="white">
                                      {room.name}
                                    </Text>
                                    <HStack gap={3} mt={1} color="gray.400" fontSize="12px">
                                      <HStack gap={1}>
                                        <Icon as={FaUserFriends} />
                                        <Text>Up to {room.maxGuests} guests</Text>
                                      </HStack>
                                    </HStack>
                                  </Box>
                                  <Box textAlign={{ base: "left", sm: "right" }} mt={{ base: 2, sm: 0 }}>
                                    <Text fontSize="18px" fontWeight="extrabold" color="accent.500">
                                      ₦{room.pricePerNight.toLocaleString()}
                                    </Text>
                                    <Text fontSize="11px" color="gray.400">
                                      per night
                                    </Text>
                                  </Box>
                                </Flex>

                                <Flex justify="flex-end" align="center" mt={4} gap={3}>
                                  {selected ? (
                                    <HStack gap={2}>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleRemoveRoom(room.id)}
                                      >
                                        <Icon as={FaMinus} />
                                      </Button>
                                      <Text fontWeight="bold" fontSize="15px" w="30px" textAlign="center">
                                        {selected.count}
                                      </Text>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleAddRoom(room)}
                                      >
                                        <Icon as={FaPlus} />
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleClearRoom(room.id)}
                                        style={{ marginLeft: "8px" }}
                                      >
                                        <Icon as={FaTrash} color="#E53E3E" />
                                      </Button>
                                    </HStack>
                                  ) : (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleAddRoom(room)}
                                    >
                                      Select Room
                                    </Button>
                                  )}
                                </Flex>
                              </Box>
                            </SimpleGrid>
                          </Box>
                        );
                      })}
                    </Stack>

                    <Flex justify="flex-end" mt={8}>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={selectedRooms.length === 0}
                        onClick={() => setCurrentStep(3)}
                      >
                        Guest Information &rarr;
                      </Button>
                    </Flex>
                  </Box>
                )}

                {/* STEP 3: Guest Details Form */}
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
                          Step 3: Guest Information
                        </Text>
                      </HStack>
                      <Button variant="secondary" size="sm" onClick={() => setCurrentStep(2)}>
                        &larr; Back to Rooms
                      </Button>
                    </HStack>

                    <Stack gap={5}>
                      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                        <Box>
                          <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                            Full Legal Name *
                          </Text>
                          <Input
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="e.g. Samuel Adeyemi"
                            bg="#1E293B"
                            border="1px solid #334155"
                            color="white"
                            p={3}
                            borderRadius="8px"
                          />
                        </Box>
                        <Box>
                          <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                            Email Address (for PDF confirmation) *
                          </Text>
                          <Input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="samuel@example.com"
                            bg="#1E293B"
                            border="1px solid #334155"
                            color="white"
                            p={3}
                            borderRadius="8px"
                          />
                        </Box>
                      </SimpleGrid>

                      <Box>
                        <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                          Nigerian Phone Number (+234XXXXXXXXXX) *
                        </Text>
                        <Input
                          value={guestPhone}
                          onChange={(e) => {
                            setGuestPhone(e.target.value);
                            setPhoneError(null);
                          }}
                          placeholder="+2348012345678"
                          bg="#1E293B"
                          border="1px solid"
                          borderColor={phoneError ? "#E53E3E" : "#334155"}
                          color="white"
                          p={3}
                          borderRadius="8px"
                        />
                        {phoneError && (
                          <Text fontSize="12px" color="#FC8181" mt={1}>
                            {phoneError}
                          </Text>
                        )}
                      </Box>

                      {/* Prayer Hut Request */}
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
                              Complimentary for registered guests. Our staff schedules quiet hours for you during your stay.
                            </Text>
                          </Box>
                        </Flex>
                      </Box>

                      {/* Special Requests */}
                      <Box>
                        <Flex justify="space-between" mb={1.5}>
                          <Text fontSize="13px" fontWeight="medium" color="gray.300">
                            Special Requests / Dietary Requirements
                          </Text>
                          <Text fontSize="12px" color={specialRequests.length > 500 ? "#FC8181" : "gray.400"}>
                            {specialRequests.length} / 500 chars
                          </Text>
                        </Flex>
                        <Textarea
                          value={specialRequests}
                          onChange={(e) => setSpecialRequests(e.target.value.slice(0, 500))}
                          placeholder="e.g. ground floor preference, early check-in, or airport transfer coordination."
                          bg="#1E293B"
                          border="1px solid #334155"
                          color="white"
                          p={3}
                          borderRadius="8px"
                          rows={3}
                        />
                      </Box>
                    </Stack>

                    <Flex justify="flex-end" mt={8}>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                          if (validateGuestDetails()) {
                            setCurrentStep(4);
                          }
                        }}
                      >
                        Review &amp; Payment &rarr;
                      </Button>
                    </Flex>
                  </Box>
                )}

                {/* STEP 4: Summary & Paystack Checkout */}
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

                    {/* Breakdown with Per-section Edit Links */}
                    <Stack gap={4} mb={6}>
                      {/* Section 1: Dates & Duration */}
                      <Box bg="#1E293B" p={4} borderRadius="12px" border="1px solid #334155">
                        <Flex justify="space-between" align="center" mb={1}>
                          <Text fontSize="12px" fontWeight="bold" color="gray.400" textTransform="uppercase">
                            Dates &amp; Stay Duration
                          </Text>
                          <Text
                            as="button"
                            fontSize="12px"
                            color="accent.500"
                            fontWeight="bold"
                            onClick={() => setCurrentStep(1)}
                            cursor="pointer"
                          >
                            Edit Dates
                          </Text>
                        </Flex>
                        <Text fontSize="14px" fontWeight="bold">
                          {checkInDate} to {checkOutDate} ({nights} nights)
                        </Text>
                        <Text fontSize="12px" color="gray.400">
                          {adults} Adults {childrenCount > 0 ? `, ${childrenCount} Children` : ""}
                        </Text>
                      </Box>

                      {/* Section 2: Selected Rooms */}
                      <Box bg="#1E293B" p={4} borderRadius="12px" border="1px solid #334155">
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontSize="12px" fontWeight="bold" color="gray.400" textTransform="uppercase">
                            Selected Rooms
                          </Text>
                          <Text
                            as="button"
                            fontSize="12px"
                            color="accent.500"
                            fontWeight="bold"
                            onClick={() => setCurrentStep(2)}
                            cursor="pointer"
                          >
                            Edit Rooms
                          </Text>
                        </Flex>
                        <Stack gap={2}>
                          {selectedRooms.map(({ room, count }) => (
                            <Flex key={room.id} justify="space-between" fontSize="13px">
                              <Text>
                                {count}x {room.name} ({room.campusTitle})
                              </Text>
                              <Text fontWeight="bold">
                                ₦{(room.pricePerNight * count * nights).toLocaleString()}
                              </Text>
                            </Flex>
                          ))}
                        </Stack>
                      </Box>

                      {/* Section 3: Guest Details */}
                      <Box bg="#1E293B" p={4} borderRadius="12px" border="1px solid #334155">
                        <Flex justify="space-between" align="center" mb={1}>
                          <Text fontSize="12px" fontWeight="bold" color="gray.400" textTransform="uppercase">
                            Guest Details
                          </Text>
                          <Text
                            as="button"
                            fontSize="12px"
                            color="accent.500"
                            fontWeight="bold"
                            onClick={() => setCurrentStep(3)}
                            cursor="pointer"
                          >
                            Edit Info
                          </Text>
                        </Flex>
                        <Text fontSize="14px" fontWeight="bold">
                          {guestName}
                        </Text>
                        <Text fontSize="12px" color="gray.400">
                          {guestEmail} • {guestPhone}
                        </Text>
                      </Box>

                      {/* Promo Code Input */}
                      <Box bg="#1E293B" p={4} borderRadius="12px" border="1px solid #334155">
                        <Text fontSize="12px" fontWeight="bold" color="gray.400" textTransform="uppercase" mb={2}>
                          Have a Promo or Retreat Code?
                        </Text>
                        <Flex gap={2}>
                          <Input
                            value={dealInputCode}
                            onChange={(e) => setDealInputCode(e.target.value.toUpperCase())}
                            placeholder="e.g. SUMMER2026"
                            bg="#0F172A"
                            border="1px solid #334155"
                            color="white"
                            p={2.5}
                            borderRadius="8px"
                            fontSize="13px"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => validateDeal(dealInputCode)}
                          >
                            Apply Code
                          </Button>
                        </Flex>
                        {dealMessage && (
                          <Text fontSize="12px" color="#68D391" mt={2}>
                            {dealMessage}
                          </Text>
                        )}
                        {dealError && (
                          <Text fontSize="12px" color="#FC8181" mt={2}>
                            {dealError}
                          </Text>
                        )}
                      </Box>
                    </Stack>

                    {/* Payment Error Alert */}
                    {paymentError && (
                      <Box p={3} mb={6} borderRadius="8px" bg="rgba(229, 62, 62, 0.15)" color="#FC8181" fontSize="13px">
                        {paymentError}
                      </Box>
                    )}

                    {/* Paystack Checkout CTA */}
                    <Box mb={6}>
                      <Text fontSize="14px" fontWeight="bold" mb={3}>
                        Payment Gateway
                      </Text>
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
                                Paystack Secure Payment
                              </Text>
                              <Text fontSize="12px" color="gray.400">
                                Debit Card, Bank Transfer, USSD, or Apple Pay
                              </Text>
                            </Box>
                          </HStack>
                          <Badge bg="accent.500" color="black">
                            Instant Confirmation
                          </Badge>
                        </Flex>
                      </Box>
                    </Box>

                    <Flex justify="flex-end">
                      <Button
                        variant="primary"
                        size="lg"
                        disabled={isProcessingPayment}
                        onClick={handleProceedToPayment}
                        style={{ padding: "14px 36px" }}
                      >
                        {isProcessingPayment
                          ? "Securing Reservation..."
                          : `Pay ₦${pricing.total.toLocaleString()} with Paystack`}
                      </Button>
                    </Flex>
                  </Box>
                )}
              </Box>

              {/* Sticky Summary Sidebar (4 Columns) */}
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

                  {/* Taxes, Discounts & Total */}
                  <Stack gap={2} fontSize="13px" pb={4} mb={4} borderBottom="1px solid #1E293B">
                    <Flex justify="space-between" color="gray.300">
                      <Text>Room Subtotal:</Text>
                      <Text>₦{pricing.subtotal.toLocaleString()}</Text>
                    </Flex>
                    {pricing.dealDiscount > 0 && (
                      <Flex justify="space-between" color="#68D391">
                        <Text>Promo Discount:</Text>
                        <Text>-₦{pricing.dealDiscount.toLocaleString()}</Text>
                      </Flex>
                    )}
                    <Flex justify="space-between" color="gray.300">
                      <Text>VAT (7.5%):</Text>
                      <Text>₦{pricing.tax.toLocaleString()}</Text>
                    </Flex>
                  </Stack>

                  <Flex justify="space-between" align="baseline" mb={4}>
                    <Text fontSize="15px" fontWeight="bold">
                      Total (NGN):
                    </Text>
                    <Text fontSize="22px" fontWeight="bold" color="accent.500">
                      ₦{pricing.total.toLocaleString()}
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
                      Our concierge is active on WhatsApp: +234 812 345 6789.
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
