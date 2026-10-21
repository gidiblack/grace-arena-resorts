import React, { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Badge,
} from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import { generateEventJsonLd } from "@/lib/seo/meta";
import Button from "@/components/ui/button";
import ActionLoadingOverlay from "@/components/common/ActionLoadingOverlay";
import elysian from "@/assets/gar-elysian.jpg";
import village from "@/assets/gar-village.jpg";
import hut from "@/assets/hut.jpg";
import dining from "@/assets/dining.jpg";
import { FaChurch, FaRing, FaUsers, FaCamera, FaCheckCircle } from "react-icons/fa";
import { getRecaptchaToken } from "@/lib/recaptcha/client";

export default function EventsPage() {
  const [eventType, setEventType] = useState("Church / Leadership Retreat");
  const [guestCount, setGuestCount] = useState("50");
  const [eventDate, setEventDate] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("+234");
  const [specialNeeds, setSpecialNeeds] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const parsedGuestCount = parseInt(guestCount, 10);
      const recaptchaToken = await getRecaptchaToken("event_inquiry");
      const res = await fetch("/api/v1/events/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: contactName,
          email: contactEmail,
          phoneNumber: contactPhone,
          eventType,
          estimatedGuests: isNaN(parsedGuestCount) ? undefined : parsedGuestCount,
          preferredDate: eventDate || undefined,
          notes: specialNeeds || undefined,
          recaptchaToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit event inquiry. Please try again.");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again later.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const EVENT_PACKAGES = [
    {
      title: "Church & Leadership Retreats",
      icon: FaChurch,
      image: elysian.src,
      capacity: "Up to 250 Attendees",
      desc: "Designed for pastoral boards, prayer ministries, and church executive retreats. Includes access to conference audio, the Prayer Hut, and customized meal packages.",
    },
    {
      title: "Christian Weddings & Receptions",
      icon: FaRing,
      image: dining.src,
      capacity: "Up to 400 Guests",
      desc: "An idyllic, alcohol-free Christian garden wedding paradise. Beautiful ceremony backdrop under umbrella trees, banquet hall seating, and luxury bridal suites.",
    },
    {
      title: "Family Reunions & Milestones",
      icon: FaUsers,
      image: village.src,
      capacity: "Up to 150 Guests",
      desc: "Celebrate family togetherness in the tranquil warmth of GAR Village. Evening fire pit bonfires, lawn sports, and traditional feast preparations.",
    },
    {
      title: "Film & Photo Shoot Productions",
      icon: FaCamera,
      image: hut.src,
      capacity: "Production Crews",
      desc: "A breathtaking mix of rustic thatched huts, glass modern architecture, and scenic natural landscapes for music videos, faith films, and brand photography.",
    },
  ];

  return (
    <PageWrapper
      title="Events & Retreats — Grace Arena Resorts"
      description="Host your church retreats, Christian weddings, family reunions, and executive conferences at Grace Arena Resorts."
      jsonLd={generateEventJsonLd(
        "Christian Retreats & Special Events",
        "Host your church retreats, Christian weddings, family reunions, and executive conferences at Grace Arena Resorts."
      )}
    >
      <ActionLoadingOverlay isOpen={loading} message="Submitting your event inquiry..." />
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
            Sacred Celebrations &amp; Fellowships
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "46px" }} fontWeight="bold">
            Events &amp; Retreat Experiences
          </Text>
          <Text fontSize="15px" color="gray.300">
            Whether gathering for profound spiritual renewal or celebrating holy matrimony, our
            resort pavilions provide unmatched serenity, catering, and audio-visual support.
          </Text>
        </Stack>
      </Box>

      {/* Packages Grid */}
      <Box py={{ base: 12, md: 16 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" color="white">
        <Box maxW="82rem" mx="auto">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} mb={16}>
            {EVENT_PACKAGES.map((pkg, i) => (
              <Flex
                key={i}
                direction="column"
                borderRadius="24px"
                bg="#0F172A"
                border="1px solid #1E293B"
                overflow="hidden"
                boxShadow="0 10px 30px rgba(0,0,0,0.4)"
              >
                <Box h="220px" bg={`url(${pkg.image})`} bgSize="cover" bgPos="center" p={4}>
                  <Badge bg="accent.500" color="black" px={3} py={1} borderRadius="full">
                    {pkg.capacity}
                  </Badge>
                </Box>
                <Stack p={6} gap={2} flex="1" justify="space-between">
                  <Stack gap={2}>
                    <HStack gap={3}>
                      <Icon as={pkg.icon} color="accent.500" boxSize={5} />
                      <Text fontSize="20px" fontWeight="bold">
                        {pkg.title}
                      </Text>
                    </HStack>
                    <Text fontSize="13px" color="gray.300" lineHeight="tall">
                      {pkg.desc}
                    </Text>
                  </Stack>
                </Stack>
              </Flex>
            ))}
          </SimpleGrid>

          {/* Event Inquiry Form (SRS 3.8 Item 3) */}
          <Box
            maxW="46rem"
            mx="auto"
            bg="#0F172A"
            p={{ base: 6, md: 10 }}
            borderRadius="24px"
            border="1px solid #1E293B"
          >
            <Stack gap={2} textAlign="center" mb={6}>
              <Text
                fontSize="12px"
                fontWeight="bold"
                color="accent.500"
                letterSpacing="3px"
                textTransform="uppercase"
              >
                Plan Your Event
              </Text>
              <Text fontSize={{ base: "24px", md: "30px" }} fontWeight="bold">
                Event &amp; Retreat Inquiry Form
              </Text>
              <Text fontSize="13px" color="gray.300">
                Submit your proposed date and requirements. Our event coordinator will contact you
                within 24 hours.
              </Text>
            </Stack>

            {submitted ? (
              <Stack align="center" textAlign="center" py={8} gap={4}>
                <Icon as={FaCheckCircle} color="#22C55E" boxSize={12} />
                <Text fontSize="20px" fontWeight="bold">
                  Inquiry Received with Gratitude!
                </Text>
                <Text fontSize="14px" color="gray.300" maxW="380px">
                  Our event coordinator has received your details for <strong>{eventType}</strong>{" "}
                  and will call you at <strong>{contactPhone}</strong> with a detailed itinerary and
                  quote.
                </Text>
                <Button variant="primary" size="sm" onClick={() => setSubmitted(false)}>
                  Submit Another Inquiry
                </Button>
              </Stack>
            ) : (
              <form onSubmit={handleSubmit}>
                <Stack gap={4}>
                  <Box>
                    <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                      Event Category *
                    </Text>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: "#1E293B",
                        border: "1px solid #334155",
                        color: "#F8FAFC",
                        borderRadius: "8px",
                        fontSize: "14px",
                        outline: "none",
                      }}
                    >
                      <option value="Church / Leadership Retreat">
                        Church / Leadership Retreat
                      </option>
                      <option value="Christian Wedding / Reception">
                        Christian Wedding / Reception
                      </option>
                      <option value="Family Reunion / Milestone">Family Reunion / Milestone</option>
                      <option value="Film / Photo Shoot Production">
                        Film / Photo Shoot Production
                      </option>
                      <option value="Corporate / Academic Seminar">
                        Corporate / Academic Seminar
                      </option>
                    </select>
                  </Box>

                  <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                    <Box>
                      <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                        Target Date *
                      </Text>
                      <Input
                        required
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        bg="#1E293B"
                        border="1px solid #334155"
                        color="white"
                        p={2.5}
                        borderRadius="8px"
                        fontSize="14px"
                        style={{ colorScheme: "dark" }}
                        _placeholder={{ color: "gray.400", opacity: 1 }}
                        _focus={{
                          borderColor: "accent.500",
                          outline: "none",
                          boxShadow: "0 0 0 1px #D4AF37",
                        }}
                      />
                    </Box>

                    <Box>
                      <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                        Estimated Number of Attendees *
                      </Text>
                      <Input
                        required
                        type="number"
                        value={guestCount}
                        onChange={(e) => setGuestCount(e.target.value)}
                        placeholder="e.g. 75"
                        bg="#1E293B"
                        border="1px solid #334155"
                        color="white"
                        p={2.5}
                        borderRadius="8px"
                        fontSize="14px"
                        _placeholder={{ color: "gray.400", opacity: 1 }}
                        _focus={{
                          borderColor: "accent.500",
                          outline: "none",
                          boxShadow: "0 0 0 1px #D4AF37",
                        }}
                      />
                    </Box>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                    <Box>
                      <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                        Your Full Name *
                      </Text>
                      <Input
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Pastor / Mr / Mrs..."
                        bg="#1E293B"
                        border="1px solid #334155"
                        color="white"
                        p={2.5}
                        borderRadius="8px"
                        fontSize="14px"
                        _placeholder={{ color: "gray.400", opacity: 1 }}
                        _focus={{
                          borderColor: "accent.500",
                          outline: "none",
                          boxShadow: "0 0 0 1px #D4AF37",
                        }}
                      />
                    </Box>

                    <Box>
                      <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                        Phone Number (WhatsApp) *
                      </Text>
                      <Input
                        required
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+234 812 345 6789"
                        bg="#1E293B"
                        border="1px solid #334155"
                        color="white"
                        p={2.5}
                        borderRadius="8px"
                        fontSize="14px"
                        _placeholder={{ color: "gray.400", opacity: 1 }}
                        _focus={{
                          borderColor: "accent.500",
                          outline: "none",
                          boxShadow: "0 0 0 1px #D4AF37",
                        }}
                      />
                    </Box>
                  </SimpleGrid>

                  <Box>
                    <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                      Email Address *
                    </Text>
                    <Input
                      required
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="e.g. fellowship@church.org"
                      bg="#1E293B"
                      border="1px solid #334155"
                      color="white"
                      p={2.5}
                      borderRadius="8px"
                      fontSize="14px"
                      _placeholder={{ color: "gray.400", opacity: 1 }}
                      _focus={{
                        borderColor: "accent.500",
                        outline: "none",
                        boxShadow: "0 0 0 1px #D4AF37",
                      }}
                    />
                  </Box>

                  <Box>
                    <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                      Special Requirements (Catering, PA System, Prayer Hut scheduling)
                    </Text>
                    <Textarea
                      value={specialNeeds}
                      onChange={(e) => setSpecialNeeds(e.target.value)}
                      placeholder="Tell us about audio/visual setup, lodging count, or meal preferences..."
                      bg="#1E293B"
                      border="1px solid #334155"
                      color="white"
                      p={2.5}
                      borderRadius="8px"
                      fontSize="13px"
                      rows={3}
                      _placeholder={{ color: "gray.400", opacity: 1 }}
                      _focus={{
                        borderColor: "accent.500",
                        outline: "none",
                        boxShadow: "0 0 0 1px #D4AF37",
                      }}
                    />
                  </Box>

                  {error && (
                    <Box bg="red.900" border="1px solid red" p={3} borderRadius="8px">
                      <Text fontSize="13px" color="red.200">
                        {error}
                      </Text>
                    </Box>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={loading}
                    style={{
                      width: "100%",
                      marginTop: "12px",
                      padding: "12px",
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? "Submitting Inquiry..." : "Submit Event Inquiry"}
                  </Button>
                </Stack>
              </form>
            )}
          </Box>
        </Box>
      </Box>
    </PageWrapper>
  );
}
