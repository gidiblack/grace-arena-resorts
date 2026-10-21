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
import ActionLoadingOverlay from "@/components/common/ActionLoadingOverlay";
import { formatLongDate } from "@/lib/formatters/date";
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
  slug: string;
  name: string;
  campus: string;
  campusTitle: string;
  tier: string;
  /** Average nightly rate for the selected dates (seasonal-aware) */
  pricePerNight: number;
  /** Price of one unit for the whole stay, before deals and tax (from the server) */
  stayPrice: number;
  maxGuests: number;
  image: string;
  availableUnits: number;
  status?: string;
}

interface ApiAvailabilityRoom {
  id: string;
  slug: string;
  name: string;
  tier: string;
  campus: string;
  campusTitle: string;
  maxGuests: number;
  availableUnits: number;
  status: string;
  stayPrice: number;
  averageNightlyRate: number;
}

const ROOM_IMAGES: Record<string, string> = {
  "elysian-fountain-standard": suite2.src,
  "elysian-fountain-deluxe": suite.src,
  "elysian-oasis-deluxe-suite": suite2.src,
  "elysian-oasis-premium-suite": suite.src,
  "elysian-cabana-premium": elysian.src,
  "elysian-cabana-executive": elysian.src,
  "village-executive-hut": hut.src,
  "village-presidential-hut": hut.src,
  "village-royal-hut": hut.src,
};

function toAvailableRoom(r: ApiAvailabilityRoom): AvailableRoom {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    campus: r.campus,
    campusTitle: r.campusTitle,
    tier: r.tier.charAt(0).toUpperCase() + r.tier.slice(1),
    pricePerNight: r.averageNightlyRate,
    stayPrice: r.stayPrice,
    maxGuests: r.maxGuests,
    image: ROOM_IMAGES[r.slug] || (r.campus === "village" ? hut.src : suite.src),
    availableUnits: r.availableUnits,
    status: r.status,
  };
}

/** Tomorrow as a local calendar date (YYYY-MM-DD) */
function tomorrowLocalDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

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
  const [checkInDate, setCheckInDate] = useState(tomorrowLocalDate);
  const [nights, setNights] = useState<number>(2);
  const [adults, setAdults] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);

  // Step 2: Selected Rooms
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState(0.075);
  const [selectedRooms, setSelectedRooms] = useState<{ room: AvailableRoom; count: number }[]>([]);
  const [campusFilter, setCampusFilter] = useState<string>("all");

  // Step 3: Guest Information
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [guestDetailsError, setGuestDetailsError] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
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
  // Pending booking created for the current selection; reused if payment initiation is retried
  const [pendingBookingRef, setPendingBookingRef] = useState<string | null>(null);
  // Result of returning from Paystack when the booking could not be confirmed
  const [paymentOutcome, setPaymentOutcome] = useState<{
    title: string;
    message: string;
    bookingRef?: string;
  } | null>(null);

  // Confirmation state
  const [confirmedBookingData, setConfirmedBookingData] = useState<{
    reference: string;
    guestName: string;
    guestEmail: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    total: number;
    manageUrl?: string | null;
    isSignedIn?: boolean;
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
            setIsSignedIn(true);
            setGuestName((prev) => prev || json.data.fullName || "");
            setGuestEmail((prev) => prev || json.data.email || "");
            setConfirmEmail((prev) => prev || json.data.email || "");
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

  // Debounce date/night edits so typing a date does not fire a request per keystroke
  const [stayQuery, setStayQuery] = useState({ checkInDate, nights });
  useEffect(() => {
    const timer = setTimeout(() => setStayQuery({ checkInDate, nights }), 300);
    return () => clearTimeout(timer);
  }, [checkInDate, nights]);

  // Fetch live availability from API (no client-side fallback catalogue: rooms must be bookable)
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setRoomsLoading(true);
      setRoomsError(null);
      try {
        const res = await fetch(
          `/api/v1/availability?checkIn=${encodeURIComponent(stayQuery.checkInDate)}&nights=${stayQuery.nights}`
        );
        const json = await res.json();
        if (!isMounted) return;
        if (res.ok && json.success && Array.isArray(json.data?.rooms)) {
          const rooms = (json.data.rooms as ApiAvailabilityRoom[])
            .filter((r) => r.status !== "under_construction")
            .map(toAvailableRoom);
          setAvailableRooms(rooms);
          if (typeof json.data.taxRate === "number") setTaxRate(json.data.taxRate);
          // Refresh prices/availability of rooms already selected for the new dates
          setSelectedRooms((prev) =>
            prev
              .map(({ room, count }) => {
                const fresh = rooms.find((r) => r.id === room.id);
                return fresh ? { room: fresh, count: Math.min(count, fresh.availableUnits) } : null;
              })
              .filter((item): item is { room: AvailableRoom; count: number } =>
                Boolean(item && item.count > 0)
              )
          );
        } else {
          setAvailableRooms([]);
          setRoomsError(json.error?.message || "Unable to load available rooms for these dates.");
        }
      } catch {
        if (isMounted) {
          setAvailableRooms([]);
          setRoomsError("Unable to load available rooms. Please check your connection.");
        }
      } finally {
        if (isMounted) setRoomsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [stayQuery]);

  // Any change to the stay invalidates a previously created pending booking
  useEffect(() => {
    setPendingBookingRef(null);
  }, [checkInDate, nights, selectedRooms, appliedDeal, adults, childrenCount]);

  // Query pre-selection: ?room={id}
  useEffect(() => {
    if (!router.isReady || !router.query.room) return;
    const roomId = router.query.room as string;
    const timer = setTimeout(() => {
      setSelectedRooms((prev) => {
        if (prev.length > 0) return prev;
        const match = availableRooms.find((r) => r.id === roomId || r.slug === roomId);
        return match && match.availableUnits > 0 ? [{ room: match, count: 1 }] : prev;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [router.isReady, router.query.room, availableRooms]);

  // Query pre-selection: ?deal={code}
  const validateDeal = useCallback(
    async (code: string) => {
      if (!code) return;
      setDealError(null);
      setDealMessage(null);
      try {
        const res = await fetch(
          `/api/v1/deals/validate/${encodeURIComponent(code)}?checkIn=${encodeURIComponent(checkInDate)}`
        );
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
          setDealMessage(
            `Promo "${d.code}" applied: ${d.discountType === "percentage" ? `${d.discountValue}% off` : `₦${d.discountValue.toLocaleString()} off`}`
          );
        } else {
          setDealError(json.error?.message || "Invalid promo code");
        }
      } catch {
        setDealError("Unable to validate promo code at this time.");
      }
    },
    [checkInDate]
  );

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

  // Returning from Paystack: /booking?bookingRef=GAR-XXXX&reference=<payment ref>&trxref=<payment ref>
  useEffect(() => {
    if (!router.isReady) return;
    const { bookingRef, reference, trxref } = router.query;
    const paymentRef = [reference, trxref].flat().find((v): v is string => typeof v === "string");
    if (typeof bookingRef !== "string" || !paymentRef) return;
    const bookingReference: string = bookingRef;

    let cancelled = false;
    async function loadPaymentResult() {
      try {
        const res = await fetch(
          `/api/v1/payments/verify?reference=${encodeURIComponent(paymentRef!)}`
        );
        const json = await res.json();
        if (cancelled) return;

        if (res.status === 403) {
          setPaymentOutcome({
            title: "Open Your Booking Link",
            message:
              'This browser can\'t access the reservation. Use the "Manage Your Booking" link from your confirmation email, or contact us on WhatsApp with your reference.',
            bookingRef: bookingReference,
          });
          return;
        }

        const booking = json.data?.booking;
        if (res.ok && json.success && json.data?.bookingStatus === "confirmed" && booking) {
          setConfirmedBookingData({
            reference: booking.reference,
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            nights: booking.nights,
            total: booking.total,
            manageUrl: json.data?.manageUrl ?? null,
            isSignedIn: Boolean(json.data?.isSignedIn),
          });
          setCurrentStep(5);
          return;
        }

        const paymentStatus = json.data?.paymentStatus;
        setPaymentOutcome(
          paymentStatus === "refund_pending" || paymentStatus === "refunded"
            ? {
                title: "Payment Refunded",
                message:
                  "Your payment arrived after the booking hold expired, so a full refund has been initiated. Please start a new reservation or contact us on WhatsApp.",
                bookingRef: bookingReference,
              }
            : paymentStatus === "failed"
              ? {
                  title: "Payment Not Completed",
                  message:
                    json.data?.gatewayMessage ||
                    "Your payment was declined or cancelled. You can retry from My Bookings while your hold is active.",
                  bookingRef: bookingReference,
                }
              : {
                  title: "Confirming Your Payment",
                  message:
                    json.error?.message ||
                    "We have not received confirmation from the payment gateway yet. Your booking will update automatically once it does — check My Bookings shortly.",
                  bookingRef: bookingReference,
                }
        );
      } catch {
        if (!cancelled) {
          setPaymentOutcome({
            title: "Confirming Your Payment",
            message:
              "We could not reach our servers to confirm your payment. Please check My Bookings shortly; you will also receive an email once it is confirmed.",
            bookingRef: bookingReference,
          });
        }
      }
    }
    loadPaymentResult();
    return () => {
      cancelled = true;
    };
  }, [router, router.isReady, router.query]);

  // Pricing calculation aligned with GAR-SRS Section 4.3
  const pricing = useMemo(() => {
    const rawSubtotal = selectedRooms.reduce(
      (sum, { room, count }) => sum + room.stayPrice * count,
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
            applicableSubtotal += room.stayPrice * count;
          }
        });
        dealDiscount = Math.round(applicableSubtotal * (appliedDeal.discountValue / 100));
      } else {
        dealDiscount = Math.min(rawSubtotal, appliedDeal.discountValue);
      }
    }

    const discountedSubtotal = Math.max(0, rawSubtotal - dealDiscount);
    const tax = Math.round(discountedSubtotal * taxRate); // VAT at the configured rate
    const total = discountedSubtotal + tax;

    return {
      subtotal: rawSubtotal,
      dealDiscount,
      tax,
      total,
    };
  }, [selectedRooms, appliedDeal, taxRate]);

  // Room quantity controls
  const handleAddRoom = (room: AvailableRoom) => {
    setSelectedRooms((prev) => {
      const existing = prev.find((item) => item.room.id === room.id);
      if (existing && existing.count >= room.availableUnits) return prev;
      if (existing) {
        return prev.map((item) =>
          item.room.id === room.id ? { ...item, count: item.count + 1 } : item
        );
      }
      return room.availableUnits > 0 ? [...prev, { room, count: 1 }] : prev;
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
    setGuestDetailsError(null);
    if (guestEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setGuestDetailsError("Email addresses do not match. Please check your email for typos.");
      return false;
    }
    if (!privacyConsent) {
      setGuestDetailsError("Please accept the Privacy Policy to continue.");
      return false;
    }
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
        setPhoneError(
          "Phone number must be in +234XXXXXXXXXX Nigerian format (10 digits after +234)"
        );
      } else {
        setGuestDetailsError(issue.message);
      }
      return false;
    }
    return true;
  };

  // Step 4 Payment Submission
  const handleProceedToPayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // 1. Create the booking hold once per selection; retries reuse it
      let ref = pendingBookingRef;
      if (!ref) {
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
          promoCode: appliedDeal?.code,
          paymentMethod: "paystack",
          privacyConsent,
        };

        const bookingRes = await fetch("/api/v1/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingPayload),
        });

        const bookingData = await bookingRes.json();

        if (!bookingRes.ok || !bookingData.success) {
          // No account needed (SRS v1.3); hold/rate limits and validation return readable messages
          setPaymentError(bookingData.error?.message || "Failed to reserve rooms.");
          setIsProcessingPayment(false);
          return;
        }

        ref = bookingData.data.booking.reference as string;
        setPendingBookingRef(ref);
      }

      // 2. Initiate Paystack payment (the server sets the callback URL)
      const paymentRes = await fetch("/api/v1/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference: ref }),
      });

      const paymentData = await paymentRes.json();

      if (!paymentRes.ok || !paymentData.success) {
        if (paymentData.error?.details?.downtimeFallbackRecommended) {
          setIsGatewayDowntimeActive(true);
        }
        if (paymentData.error?.code === "HOLD_EXPIRED") {
          setPendingBookingRef(null);
        }
        setPaymentError(
          paymentData.error?.message ||
            "Payment initiation error. Please retry or contact on WhatsApp."
        );
        setIsProcessingPayment(false);
        return;
      }

      // 3. Redirect to Paystack Checkout; confirmation happens only after payment is verified
      if (paymentData.data?.authorizationUrl) {
        window.location.href = paymentData.data.authorizationUrl;
        return;
      }

      setPaymentError("Payment gateway did not return a checkout link. Please retry.");
      setIsProcessingPayment(false);
    } catch {
      setPaymentError("A network exception occurred while processing your reservation.");
      setIsProcessingPayment(false);
    }
  };

  // Filter rooms by campus
  const filteredRooms = useMemo(() => {
    if (campusFilter === "elysian") {
      return availableRooms.filter((r) => r.campus === "elysian");
    }
    if (campusFilter === "village") {
      return availableRooms.filter((r) => r.campus === "village");
    }
    return availableRooms;
  }, [availableRooms, campusFilter]);

  const scrollToWizardTop = () => {
    if (typeof window === "undefined") return;
    const el = document.getElementById("booking-wizard-top");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextFromStep1 = () => {
    const parsed = step1DatesGuestsSchema.safeParse({
      checkInDate,
      nights,
      adults,
      children: childrenCount,
    });
    if (parsed.success) {
      setCurrentStep(2);
      scrollToWizardTop();
    }
  };

  const handleNextFromStep2 = () => {
    if (selectedRooms.length > 0) {
      setCurrentStep(3);
      scrollToWizardTop();
    }
  };

  const handleNextFromStep3 = () => {
    if (validateGuestDetails()) {
      setCurrentStep(4);
      scrollToWizardTop();
    }
  };

  return (
    <PageWrapper
      title="Reserve Your Stay — Grace Arena Resorts"
      description="Select your campus, dates, and accommodation at Grace Arena Resorts. Faith, hospitality, and serene retreat."
    >
      <ActionLoadingOverlay isOpen={isProcessingPayment} message="Securing your reservation..." />
      <Box
        bg="#0B132B"
        color="white"
        minH="90vh"
        pt={{ base: "110px", md: "140px" }}
        pb={{ base: 12, md: 16 }}
      >
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
          {paymentOutcome && !confirmedBookingData ? (
            <Box
              maxW="640px"
              mx="auto"
              bg="#0F172A"
              p={{ base: 6, md: 8 }}
              borderRadius="20px"
              border="1px solid #1E293B"
              textAlign="center"
              role="status"
            >
              <Icon as={FaExclamationTriangle} color="accent.500" boxSize={8} mb={3} />
              <Text as="h2" fontSize="22px" fontWeight="bold" mb={2}>
                {paymentOutcome.title}
              </Text>
              {paymentOutcome.bookingRef && (
                <Text fontSize="13px" color="gray.400" mb={3}>
                  Reservation {paymentOutcome.bookingRef}
                </Text>
              )}
              <Text fontSize="15px" color="gray.300" mb={6}>
                {paymentOutcome.message}
              </Text>
              <Flex gap={3} justify="center" flexWrap="wrap">
                <Button variant="primary" onClick={() => router.push("/account/bookings")}>
                  View My Bookings
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPaymentOutcome(null);
                    router.replace("/booking");
                  }}
                >
                  Start New Reservation
                </Button>
              </Flex>
            </Box>
          ) : currentStep === 5 && confirmedBookingData ? (
            <BookingConfirmationView
              reference={confirmedBookingData.reference}
              guestName={confirmedBookingData.guestName}
              guestEmail={confirmedBookingData.guestEmail}
              checkInDate={confirmedBookingData.checkInDate}
              checkOutDate={confirmedBookingData.checkOutDate}
              nights={confirmedBookingData.nights}
              total={confirmedBookingData.total}
              manageUrl={confirmedBookingData.manageUrl}
              isSignedIn={confirmedBookingData.isSignedIn ?? isSignedIn}
            />
          ) : (
            /* Wizard Steps 1 to 4 */
            <SimpleGrid
              id="booking-wizard-top"
              scrollMarginTop={{ base: "90px", md: "120px" }}
              columns={{ base: 1, lg: 12 }}
              gap={8}
            >
              {/* Main Steps Content (8 Columns) */}
              <Box gridColumn={{ base: "span 1", lg: "span 8" }}>
                {/* Responsive Step Indicator Banner */}
                <Box bg="#0F172A" p={4} borderRadius="16px" border="1px solid #1E293B" mb={6}>
                  <Flex justify="space-between" align="center" mb={2}>
                    <Text
                      fontSize="13px"
                      fontWeight="bold"
                      color="accent.500"
                      textTransform="uppercase"
                    >
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
                          Our gateway is currently undergoing maintenance. Your room hold is
                          extended to 2 hours! Please message our concierge directly on WhatsApp to
                          confirm with manual transfer.
                        </Text>
                        <a
                          href={`https://wa.me/2348123456789?text=${encodeURIComponent(`Hello Grace Arena, I want to confirm my booking hold (${guestName}, ${pricing.total} NGN)`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            textDecoration: "none",
                            display: "inline-block",
                            marginTop: "8px",
                          }}
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
                            style={{ colorScheme: "dark" }}
                            _placeholder={{ color: "gray.400", opacity: 1 }}
                            _focus={{ borderColor: "accent.500", outline: "none" }}
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
                              Check-out: {formatLongDate(checkOutDate)} (11:00 AM)
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
                      <Button variant="primary" size="md" onClick={handleNextFromStep1}>
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
                    {roomsLoading && (
                      <Text fontSize="14px" color="gray.400" mb={4} role="status">
                        Checking live availability for your dates…
                      </Text>
                    )}
                    {roomsError && !roomsLoading && (
                      <Box
                        p={4}
                        mb={4}
                        borderRadius="12px"
                        bg="rgba(229, 62, 62, 0.12)"
                        border="1px solid rgba(229, 62, 62, 0.4)"
                        role="alert"
                      >
                        <Text fontSize="14px" color="red.200">
                          {roomsError}
                        </Text>
                      </Box>
                    )}
                    {!roomsLoading && !roomsError && filteredRooms.length === 0 && (
                      <Text fontSize="14px" color="gray.400" mb={4}>
                        No rooms are available for these dates. Try different dates or contact us on
                        WhatsApp.
                      </Text>
                    )}
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
                                  <Box
                                    textAlign={{ base: "left", sm: "right" }}
                                    mt={{ base: 2, sm: 0 }}
                                  >
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
                                      <Text
                                        fontWeight="bold"
                                        fontSize="15px"
                                        w="30px"
                                        textAlign="center"
                                      >
                                        {selected.count}
                                      </Text>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        disabled={selected.count >= room.availableUnits}
                                        aria-label={`Add another ${room.name}`}
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
                                      disabled={room.availableUnits === 0}
                                      onClick={() => handleAddRoom(room)}
                                    >
                                      {room.availableUnits === 0 ? "Sold Out" : "Select Room"}
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
                        onClick={handleNextFromStep2}
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
                            _placeholder={{ color: "gray.400", opacity: 1 }}
                            _focus={{ borderColor: "accent.500", outline: "none" }}
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
                            _placeholder={{ color: "gray.400", opacity: 1 }}
                            _focus={{ borderColor: "accent.500", outline: "none" }}
                          />
                        </Box>
                      </SimpleGrid>

                      <Box>
                        <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                          Confirm Email Address *
                        </Text>
                        <Input
                          type="email"
                          value={confirmEmail}
                          onChange={(e) => setConfirmEmail(e.target.value)}
                          onPaste={(e) => e.preventDefault()}
                          placeholder="Re-enter your email address"
                          aria-label="Confirm email address"
                          bg="#1E293B"
                          border="1px solid #334155"
                          color="white"
                          p={3}
                          borderRadius="8px"
                          _placeholder={{ color: "gray.400", opacity: 1 }}
                          _focus={{ borderColor: "accent.500", outline: "none" }}
                        />
                        <Text fontSize="12px" color="gray.400" mt={1}>
                          Your confirmation and private &quot;Manage booking&quot; link are sent
                          here. No account is needed to book.
                        </Text>
                      </Box>

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
                          _placeholder={{ color: "gray.400", opacity: 1 }}
                          _focus={{
                            borderColor: phoneError ? "#E53E3E" : "accent.500",
                            outline: "none",
                          }}
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
                              Complimentary for registered guests. Our staff schedules quiet hours
                              for you during your stay.
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
                          <Text
                            fontSize="12px"
                            color={specialRequests.length > 500 ? "#FC8181" : "gray.400"}
                          >
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
                          _placeholder={{ color: "gray.400", opacity: 1 }}
                          _focus={{ borderColor: "accent.500", outline: "none" }}
                        />
                      </Box>
                      {/* NDPR consent (guests may not have registered) */}
                      <Flex align="flex-start" gap={3}>
                        <input
                          id="privacy-consent"
                          type="checkbox"
                          checked={privacyConsent}
                          onChange={(e) => setPrivacyConsent(e.target.checked)}
                          style={{
                            cursor: "pointer",
                            marginTop: "4px",
                            accentColor: "#FCCA46",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <label
                          htmlFor="privacy-consent"
                          style={{ fontSize: "13px", color: "#CBD5E1" }}
                        >
                          I agree to the Grace Arena Resorts{" "}
                          <a
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#FCCA46", textDecoration: "underline" }}
                          >
                            Privacy Policy
                          </a>{" "}
                          and consent to my details being used to manage this reservation. *
                        </label>
                      </Flex>

                      {guestDetailsError && (
                        <Box
                          p={3}
                          borderRadius="8px"
                          bg="rgba(229, 62, 62, 0.12)"
                          border="1px solid rgba(229, 62, 62, 0.4)"
                          role="alert"
                        >
                          <Text fontSize="13px" color="red.200">
                            {guestDetailsError}
                          </Text>
                        </Box>
                      )}
                    </Stack>

                    <Flex justify="flex-end" mt={8}>
                      <Button variant="primary" size="md" onClick={handleNextFromStep3}>
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
                          <Text
                            fontSize="12px"
                            fontWeight="bold"
                            color="gray.400"
                            textTransform="uppercase"
                          >
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
                          {formatLongDate(checkInDate)} to {formatLongDate(checkOutDate)} ({nights}{" "}
                          nights)
                        </Text>
                        <Text fontSize="12px" color="gray.400">
                          {adults} Adults {childrenCount > 0 ? `, ${childrenCount} Children` : ""}
                        </Text>
                      </Box>

                      {/* Section 2: Selected Rooms */}
                      <Box bg="#1E293B" p={4} borderRadius="12px" border="1px solid #334155">
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text
                            fontSize="12px"
                            fontWeight="bold"
                            color="gray.400"
                            textTransform="uppercase"
                          >
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
                                ₦{(room.stayPrice * count).toLocaleString()}
                              </Text>
                            </Flex>
                          ))}
                        </Stack>
                      </Box>

                      {/* Section 3: Guest Details */}
                      <Box bg="#1E293B" p={4} borderRadius="12px" border="1px solid #334155">
                        <Flex justify="space-between" align="center" mb={1}>
                          <Text
                            fontSize="12px"
                            fontWeight="bold"
                            color="gray.400"
                            textTransform="uppercase"
                          >
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
                        <Text
                          fontSize="12px"
                          fontWeight="bold"
                          color="gray.400"
                          textTransform="uppercase"
                          mb={2}
                        >
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
                            _placeholder={{ color: "gray.400", opacity: 1 }}
                            _focus={{ borderColor: "accent.500", outline: "none" }}
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
                      <Box
                        p={3}
                        mb={6}
                        borderRadius="8px"
                        bg="rgba(229, 62, 62, 0.15)"
                        color="#FC8181"
                        fontSize="13px"
                      >
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
                      {formatLongDate(checkInDate)} &rarr; {formatLongDate(checkOutDate)} ({nights}{" "}
                      nights)
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
                                {count}x @ ₦{room.pricePerNight.toLocaleString()} / night (avg)
                              </Text>
                            </Box>
                            <Text fontWeight="bold">
                              ₦{(room.stayPrice * count).toLocaleString()}
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

                  {/* Summary Next Step Action Button */}
                  {currentStep < 4 ? (
                    <Button
                      variant="primary"
                      size="md"
                      w="full"
                      mb={4}
                      disabled={currentStep === 2 && selectedRooms.length === 0}
                      onClick={() => {
                        if (currentStep === 1) handleNextFromStep1();
                        else if (currentStep === 2) handleNextFromStep2();
                        else if (currentStep === 3) handleNextFromStep3();
                      }}
                    >
                      {currentStep === 1 && "Select Rooms \u2192"}
                      {currentStep === 2 &&
                        (selectedRooms.length === 0
                          ? "Select a Room to Continue"
                          : "Guest Information \u2192")}
                      {currentStep === 3 && "Review & Payment \u2192"}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      w="full"
                      mb={4}
                      disabled={selectedRooms.length === 0 || isProcessingPayment}
                      onClick={handleProceedToPayment}
                    >
                      {isProcessingPayment
                        ? "Securing Reservation..."
                        : `Pay \u20A6${pricing.total.toLocaleString()} with Paystack`}
                    </Button>
                  )}

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
