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
} from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import MapSection from "@/components/common/MapSection";
import { generateContactPageJsonLd } from "@/lib/seo/meta";
import Button from "@/components/ui/button";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaWhatsapp,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaClock,
} from "react-icons/fa";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+234");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: name,
          email,
          phoneNumber: phone,
          subject,
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit message. Please try again.");
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

  return (
    <PageWrapper
      title="Contact Us — Grace Arena Resorts"
      description="Get in touch with Grace Arena Resorts in Igbo-Ora, Oyo State, Nigeria. Bookings, directions, and WhatsApp inquiries."
      jsonLd={generateContactPageJsonLd()}
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
            We Are Here to Serve You
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "46px" }} fontWeight="bold">
            Contact Grace Arena Resorts
          </Text>
          <Text fontSize="15px" color="gray.300">
            Have questions about room rates, campus directions, church retreat dates, or special
            dietary arrangements? Reach out to our hospitality team.
          </Text>
        </Stack>
      </Box>

      {/* Main Content Grid */}
      <Box
        py={{ base: 12, md: 16 }}
        px={{ base: 4, md: 8, xl: 12 }}
        bg="#070707"
        color="white"
        minH="70vh"
      >
        <Box maxW="82rem" mx="auto">
          <SimpleGrid columns={{ base: 1, lg: 12 }} gap={{ base: 8, lg: 12 }}>
            {/* Left Column: Direct Contact Info (5 cols) */}
            <Box gridColumn={{ base: "span 1", lg: "span 5" }}>
              <Stack gap={6}>
                <Box
                  bg="#0F172A"
                  p={{ base: 6, md: 8 }}
                  borderRadius="20px"
                  border="1px solid #1E293B"
                >
                  <Text fontSize="18px" fontWeight="bold" mb={4} color="white">
                    Resort Contact Details
                  </Text>

                  <Stack gap={4}>
                    <HStack align="flex-start" gap={3}>
                      <Icon as={FaMapMarkerAlt} color="accent.500" boxSize={5} mt={1} />
                      <Box>
                        <Text fontSize="14px" fontWeight="bold">
                          Address
                        </Text>
                        <Text fontSize="13px" color="gray.300">
                          Grace Arena Resorts, Igbo-Ora, Ibarapa Central Local Government, Oyo
                          State, Nigeria
                        </Text>
                      </Box>
                    </HStack>

                    <HStack align="flex-start" gap={3}>
                      <Icon as={FaPhoneAlt} color="accent.500" boxSize={4} mt={1} />
                      <Box>
                        <Text fontSize="14px" fontWeight="bold">
                          Phone Lines
                        </Text>
                        <Text fontSize="13px" color="gray.300">
                          +234 812 345 6789 / +234 803 123 4567
                        </Text>
                      </Box>
                    </HStack>

                    <HStack align="flex-start" gap={3}>
                      <Icon as={FaEnvelope} color="accent.500" boxSize={4} mt={1} />
                      <Box>
                        <Text fontSize="14px" fontWeight="bold">
                          Email
                        </Text>
                        <Text fontSize="13px" color="gray.300">
                          info@gracearenaresorts.com
                        </Text>
                        <Text fontSize="13px" color="gray.300">
                          bookings@gracearenaresorts.com
                        </Text>
                      </Box>
                    </HStack>

                    <HStack align="flex-start" gap={3}>
                      <Icon as={FaClock} color="accent.500" boxSize={4} mt={1} />
                      <Box>
                        <Text fontSize="14px" fontWeight="bold">
                          Front Desk &amp; Check-In
                        </Text>
                        <Text fontSize="13px" color="gray.300">
                          Check-in: 2:00 PM | Check-out: 11:00 AM
                        </Text>
                        <Text fontSize="12px" color="gray.400">
                          Front desk concierge open 24/7
                        </Text>
                      </Box>
                    </HStack>
                  </Stack>
                </Box>

                {/* WhatsApp Direct Card (SRS Requirement: Primary CTA) */}
                <Box
                  bg="#0F172A"
                  p={{ base: 6, md: 8 }}
                  borderRadius="20px"
                  border="1px solid #22c55e"
                  boxShadow="0 10px 30px rgba(34, 197, 94, 0.15)"
                >
                  <HStack gap={3} mb={3}>
                    <Icon as={FaWhatsapp} color="#25D366" boxSize={6} />
                    <Text fontSize="18px" fontWeight="bold" color="white">
                      Instant WhatsApp Chat
                    </Text>
                  </HStack>
                  <Text fontSize="13px" color="gray.300" mb={4}>
                    Get immediate responses for booking inquiries, road directions, or custom food
                    preferences directly with the manager on duty.
                  </Text>
                  <a
                    href="https://wa.me/2348123456789?text=Hello%20Grace%20Arena%20Resorts,%20I%20have%20an%20inquiry."
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", display: "inline-block" }}
                  >
                    <Flex
                      align="center"
                      gap={2}
                      px={5}
                      py={3}
                      borderRadius="10px"
                      bg="#25D366"
                      color="white"
                      fontWeight="bold"
                      fontSize="14px"
                    >
                      <Icon as={FaWhatsapp} /> Chat on WhatsApp Now
                    </Flex>
                  </a>
                </Box>
              </Stack>
            </Box>

            {/* Right Column: Contact Message Form (7 cols) */}
            <Box gridColumn={{ base: "span 1", lg: "span 7" }}>
              <Box
                bg="#0F172A"
                p={{ base: 6, md: 8 }}
                borderRadius="20px"
                border="1px solid #1E293B"
              >
                <Text fontSize="20px" fontWeight="bold" mb={2}>
                  Send Us a Direct Message
                </Text>
                <Text fontSize="13px" color="gray.400" mb={6}>
                  Fill in your details below and we will respond to your email promptly.
                </Text>

                {submitted ? (
                  <Stack align="center" textAlign="center" py={8} gap={4}>
                    <Icon as={FaCheckCircle} color="#22C55E" boxSize={12} />
                    <Text fontSize="20px" fontWeight="bold">
                      Message Sent Successfully!
                    </Text>
                    <Text fontSize="14px" color="gray.300" maxW="380px">
                      Thank you, <strong>{name}</strong>. Our front desk team has received your
                      message and will reply to <strong>{email}</strong> within a few hours.
                    </Text>
                    <Button variant="primary" size="sm" onClick={() => setSubmitted(false)}>
                      Send Another Message
                    </Button>
                  </Stack>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <Stack gap={4}>
                      <Box>
                        <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                          Your Full Name *
                        </Text>
                        <Input
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Samuel Olawale"
                          bg="#1E293B"
                          border="1px solid #334155"
                          color="white"
                          p={3}
                          borderRadius="8px"
                          fontSize="14px"
                          _placeholder={{ color: "gray.400", opacity: 1 }}
                          _focus={{ borderColor: "accent.500", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
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
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. samuel@example.com"
                            bg="#1E293B"
                            border="1px solid #334155"
                            color="white"
                            p={3}
                            borderRadius="8px"
                            fontSize="14px"
                            _placeholder={{ color: "gray.400", opacity: 1 }}
                            _focus={{ borderColor: "accent.500", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
                          />
                        </Box>

                        <Box>
                          <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                            Phone / WhatsApp Number *
                          </Text>
                          <Input
                            required
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+234 812 345 6789"
                            bg="#1E293B"
                            border="1px solid #334155"
                            color="white"
                            p={3}
                            borderRadius="8px"
                            fontSize="14px"
                            _placeholder={{ color: "gray.400", opacity: 1 }}
                            _focus={{ borderColor: "accent.500", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
                          />
                        </Box>
                      </SimpleGrid>

                      <Box>
                        <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                          Subject *
                        </Text>
                        <Input
                          required
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="e.g. Family Retreat Booking Inquiry"
                          bg="#1E293B"
                          border="1px solid #334155"
                          color="white"
                          p={3}
                          borderRadius="8px"
                          fontSize="14px"
                          _placeholder={{ color: "gray.400", opacity: 1 }}
                          _focus={{ borderColor: "accent.500", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
                        />
                      </Box>

                      <Box>
                        <Text fontSize="13px" fontWeight="medium" mb={1.5} color="gray.300">
                          Message *
                        </Text>
                        <Textarea
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="How can we assist you in preparing for your visit to Grace Arena Resorts?"
                          bg="#1E293B"
                          border="1px solid #334155"
                          color="white"
                          p={3}
                          borderRadius="8px"
                          fontSize="13px"
                          rows={4}
                          _placeholder={{ color: "gray.400", opacity: 1 }}
                          _focus={{ borderColor: "accent.500", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
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
                          marginTop: "8px",
                          padding: "12px",
                          opacity: loading ? 0.7 : 1,
                        }}
                      >
                        {loading ? "Sending Message..." : "Send Message"}
                      </Button>
                    </Stack>
                  </form>
                )}
              </Box>
            </Box>
          </SimpleGrid>

          {/* Interactive Location Map Frame (SRS 3.10) */}
          <Box mt={14}>
            <MapSection />
          </Box>
        </Box>
      </Box>
    </PageWrapper>
  );
}
