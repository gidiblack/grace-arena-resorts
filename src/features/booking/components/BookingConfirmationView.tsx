import React, { useState } from "react";
import Link from "next/link";
import { Box, Flex, HStack, Icon, Stack, Text, Badge, SimpleGrid } from "@chakra-ui/react";
import Button from "@/components/ui/button";
import {
  FaCheckCircle,
  FaFilePdf,
  FaEnvelope,
  FaWhatsapp,
  FaPrint,
  FaCalendarCheck,
  FaClock,
  FaLink,
  FaUserPlus,
} from "react-icons/fa";

export interface BookingConfirmationProps {
  reference: string;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  total: number;
  status?: string;
  /** Private "Manage booking" link (guest checkout); works without an account */
  manageUrl?: string | null;
  isSignedIn?: boolean;
}

export default function BookingConfirmationView({
  reference,
  guestName,
  guestEmail,
  checkInDate,
  checkOutDate,
  nights,
  total,
  status = "confirmed",
  manageUrl,
  isSignedIn = false,
}: BookingConfirmationProps) {
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyManageLink = async () => {
    if (!manageUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(manageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const accountQuery = new URLSearchParams({
    email: guestEmail,
    name: guestName,
    redirect: "/account/bookings",
  }).toString();

  const handleResendEmail = async () => {
    setResending(true);
    setResendStatus(null);
    try {
      const res = await fetch(`/api/v1/bookings/${reference}/confirmation`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendStatus("Confirmation email has been resent successfully!");
      } else {
        setResendStatus(data.error?.message || "Failed to resend confirmation email.");
      }
    } catch {
      setResendStatus("Network error while resending confirmation email.");
    } finally {
      setResending(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Grace Arena Resorts Concierge, I just booked reservation ${reference} for ${guestName}. Could you please confirm arrival details?`
  );

  return (
    <Box
      bg="#0F172A"
      p={{ base: 6, md: 10 }}
      borderRadius="24px"
      border="1px solid #1E293B"
      maxWidth="800px"
      mx="auto"
    >
      <Flex direction="column" align="center" textAlign="center" mb={8}>
        <Flex
          w="72px"
          h="72px"
          borderRadius="full"
          bg="rgba(72, 187, 120, 0.15)"
          align="center"
          justify="center"
          mb={4}
        >
          <Icon as={FaCheckCircle} color="#48BB78" boxSize={10} />
        </Flex>

        <Badge
          bg={status === "confirmed" ? "rgba(72, 187, 120, 0.2)" : "rgba(252, 202, 70, 0.2)"}
          color={status === "confirmed" ? "#48BB78" : "accent.500"}
          px={3}
          py={1}
          borderRadius="full"
          fontSize="12px"
          fontWeight="bold"
          mb={2}
          textTransform="uppercase"
        >
          {status === "confirmed" ? "Reservation Confirmed" : "Hold Reserved"}
        </Badge>

        <Text fontSize={{ base: "24px", md: "30px" }} fontWeight="bold" color="white" mb={1}>
          Thank You, {guestName}!
        </Text>
        <Text fontSize="15px" color="gray.400">
          Your booking voucher has been issued. We&apos;re emailing a copy to{" "}
          <Text as="span" color="white" fontWeight="medium">
            {guestEmail}
          </Text>
          .
        </Text>
      </Flex>

      {/* Reference Banner */}
      <Box
        bg="#1E293B"
        p={6}
        borderRadius="16px"
        border="1px solid rgba(252, 202, 70, 0.3)"
        mb={8}
        textAlign="center"
      >
        <Text fontSize="12px" color="gray.400" textTransform="uppercase" letterSpacing="1px" mb={1}>
          Booking Reference
        </Text>
        <Text
          fontSize={{ base: "26px", md: "32px" }}
          fontWeight="extrabold"
          color="accent.500"
          letterSpacing="2px"
        >
          {reference}
        </Text>
        <Text fontSize="12px" color="gray.400" mt={1}>
          Please present this reference number or your digital voucher upon check-in.
        </Text>
      </Box>

      {manageUrl && (
        <Box
          bg="#1E293B"
          p={5}
          borderRadius="16px"
          border="1px solid #334155"
          mb={8}
          data-testid="manage-booking-box"
        >
          <HStack gap={2} mb={2}>
            <Icon as={FaLink} color="accent.500" />
            <Text fontSize="15px" fontWeight="bold" color="white">
              Manage your booking — no account needed
            </Text>
          </HStack>
          <Text fontSize="13px" color="gray.300" mb={4}>
            Save this private link to view, download, or cancel your reservation at any time (valid
            until 30 days after check-out). Anyone with the link can manage this booking, so keep it
            private.
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
            <a href={manageUrl} style={{ textDecoration: "none", width: "100%" }}>
              <Button
                variant="primary"
                size="md"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Open Manage Booking
              </Button>
            </a>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCopyManageLink}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {copied ? "Link Copied!" : "Copy Link"}
            </Button>
          </SimpleGrid>
        </Box>
      )}

      {!isSignedIn && (
        <Box
          bg="rgba(252, 202, 70, 0.08)"
          p={5}
          borderRadius="16px"
          border="1px solid rgba(252, 202, 70, 0.3)"
          mb={8}
          data-testid="account-cta"
        >
          <HStack gap={2} mb={2}>
            <Icon as={FaUserPlus} color="accent.500" />
            <Text fontSize="15px" fontWeight="bold" color="white">
              Track all your stays in one place
            </Text>
          </HStack>
          <Text fontSize="13px" color="gray.300" mb={4}>
            Create a free account with {guestEmail} to see this and future bookings, download
            receipts, and cancel any time. Bookings made with your email are added automatically
            once you verify it.
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
            <Link href={`/register?${accountQuery}`} style={{ textDecoration: "none" }}>
              <Button
                variant="primary"
                size="md"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Create an Account
              </Button>
            </Link>
            <Link
              href={`/login?redirect=${encodeURIComponent("/account/bookings")}`}
              style={{ textDecoration: "none" }}
            >
              <Button
                variant="secondary"
                size="md"
                style={{ width: "100%", justifyContent: "center" }}
              >
                I Already Have an Account
              </Button>
            </Link>
          </SimpleGrid>
        </Box>
      )}

      {/* Reservation Details Grid */}
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4} mb={8}>
        <Box bg="#1E293B" p={4} borderRadius="12px" border="1px solid #334155">
          <HStack gap={2} mb={1}>
            <Icon as={FaCalendarCheck} color="accent.500" boxSize={4} />
            <Text fontSize="12px" color="gray.400" textTransform="uppercase">
              Check-in Date
            </Text>
          </HStack>
          <Text fontSize="16px" fontWeight="bold" color="white">
            {checkInDate}
          </Text>
          <HStack gap={1} mt={1} color="gray.400" fontSize="12px">
            <Icon as={FaClock} boxSize={3} />
            <Text>From 14:00 (2:00 PM)</Text>
          </HStack>
        </Box>

        <Box bg="#1E293B" p={4} borderRadius="12px" border="1px solid #334155">
          <HStack gap={2} mb={1}>
            <Icon as={FaCalendarCheck} color="accent.500" boxSize={4} />
            <Text fontSize="12px" color="gray.400" textTransform="uppercase">
              Check-out Date
            </Text>
          </HStack>
          <Text fontSize="16px" fontWeight="bold" color="white">
            {checkOutDate}
          </Text>
          <HStack gap={1} mt={1} color="gray.400" fontSize="12px">
            <Icon as={FaClock} boxSize={3} />
            <Text>
              By 11:00 (11:00 AM) • {nights} {nights === 1 ? "Night" : "Nights"}
            </Text>
          </HStack>
        </Box>
      </SimpleGrid>

      {/* Total Settled */}
      <Flex
        justify="space-between"
        align="center"
        bg="#1E293B"
        p={4}
        borderRadius="12px"
        border="1px solid #334155"
        mb={8}
      >
        <Text fontSize="14px" fontWeight="medium" color="gray.300">
          Total Amount Settled:
        </Text>
        <Text fontSize="20px" fontWeight="bold" color="accent.500">
          ₦{total.toLocaleString()}
        </Text>
      </Flex>

      {/* Resend status message */}
      {resendStatus && (
        <Box
          p={3}
          mb={6}
          borderRadius="8px"
          bg={
            resendStatus.includes("success")
              ? "rgba(72, 187, 120, 0.15)"
              : "rgba(229, 62, 62, 0.15)"
          }
          color={resendStatus.includes("success") ? "#68D391" : "#FC8181"}
          fontSize="13px"
          textAlign="center"
        >
          {resendStatus}
        </Box>
      )}

      {/* Action Buttons */}
      <Stack gap={3}>
        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
          <a
            href={`/api/v1/bookings/${reference}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", width: "100%" }}
          >
            <Button variant="primary" size="md" style={{ width: "100%", justifyContent: "center" }}>
              <HStack gap={2}>
                <Icon as={FaFilePdf} />
                <Text>Download Voucher (PDF)</Text>
              </HStack>
            </Button>
          </a>

          <Button
            variant="secondary"
            size="md"
            disabled={resending}
            onClick={handleResendEmail}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <HStack gap={2}>
              <Icon as={FaEnvelope} />
              <Text>{resending ? "Sending..." : "Resend Email"}</Text>
            </HStack>
          </Button>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", width: "100%" }}
          >
            <Button
              variant="secondary"
              size="md"
              style={{
                width: "100%",
                justifyContent: "center",
                borderColor: "#25D366",
                color: "#25D366",
              }}
            >
              <HStack gap={2}>
                <Icon as={FaWhatsapp} color="#25D366" />
                <Text>Contact on WhatsApp</Text>
              </HStack>
            </Button>
          </a>

          <Button
            variant="secondary"
            size="md"
            onClick={() => window.print()}
            style={{ width: "100%", justifyContent: "center" }}
          >
            <HStack gap={2}>
              <Icon as={FaPrint} />
              <Text>Print Confirmation</Text>
            </HStack>
          </Button>
        </SimpleGrid>

        {isSignedIn && (
          <Flex justify="center" mt={4}>
            <Link href="/account/bookings" style={{ textDecoration: "none" }}>
              <Button variant="secondary" size="md">
                View All My Bookings &rarr;
              </Button>
            </Link>
          </Flex>
        )}
      </Stack>
    </Box>
  );
}
