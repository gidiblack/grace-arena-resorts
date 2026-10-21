import React, { useState } from "react";
import { Box, Flex, HStack, Icon, Text, Badge, SimpleGrid } from "@chakra-ui/react";
import Button from "@/components/ui/button";
import ActionLoadingOverlay from "@/components/common/ActionLoadingOverlay";
import {
  FaFilePdf,
  FaEnvelope,
  FaWhatsapp,
  FaCalendarAlt,
  FaBed,
  FaTimes,
  FaCreditCard,
  FaInfoCircle,
} from "react-icons/fa";
import CancellationModal from "./CancellationModal";
import { formatLongDate } from "@/lib/formatters/date";

export interface BookingRecord {
  id: string;
  reference: string;
  status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
  check_in_date: string;
  check_out_date: string;
  nights: number;
  adults: number;
  children: number;
  subtotal: number;
  deal_discount: number;
  tax: number;
  total: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  special_requests: string | null;
  created_at: string;
  booking_line_items?: Array<{
    id: string;
    room_type_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    currency: string;
    gateway: string;
    status: string;
    refund_amount: number | null;
  }>;
}

interface BookingCardProps {
  booking: BookingRecord;
  onRefresh: () => void;
}

export default function BookingCard({ booking, onRefresh }: BookingCardProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Status color badges per SRS specification:
  // Confirmed: green, Pending: yellow, Cancelled: red, Checked-In: blue, Checked-Out: grey
  const getStatusBadge = (status: BookingRecord["status"]) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge bg="rgba(72, 187, 120, 0.2)" color="#48BB78" px={2.5} py={0.5} borderRadius="full">
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge
            bg="rgba(252, 202, 70, 0.2)"
            color="accent.500"
            px={2.5}
            py={0.5}
            borderRadius="full"
          >
            Pending Payment
          </Badge>
        );
      case "checked_in":
        return (
          <Badge bg="rgba(99, 179, 237, 0.2)" color="#63B3ED" px={2.5} py={0.5} borderRadius="full">
            Checked In
          </Badge>
        );
      case "checked_out":
        return (
          <Badge
            bg="rgba(160, 174, 192, 0.2)"
            color="#A0AEC0"
            px={2.5}
            py={0.5}
            borderRadius="full"
          >
            Checked Out
          </Badge>
        );
      case "cancelled":
        return (
          <Badge bg="rgba(229, 62, 62, 0.2)" color="#FC8181" px={2.5} py={0.5} borderRadius="full">
            Cancelled
          </Badge>
        );
      case "no_show":
        return (
          <Badge bg="rgba(237, 137, 54, 0.2)" color="#ED8936" px={2.5} py={0.5} borderRadius="full">
            No Show
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleResendConfirmation = async () => {
    setResending(true);
    setResendNotice(null);
    try {
      const res = await fetch(`/api/v1/bookings/${booking.reference}/confirmation`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setResendNotice("Voucher email sent!");
      } else {
        setResendNotice(json.error?.message || "Failed to resend");
      }
    } catch {
      setResendNotice("Network error");
    } finally {
      setResending(false);
      setTimeout(() => setResendNotice(null), 4000);
    }
  };

  // The settled payment (if any) carries refund state; ignore failed/abandoned attempts
  const paymentRecord =
    booking.payments?.find((p) =>
      ["success", "refund_pending", "refunded", "partially_refunded"].includes(p.status)
    ) ?? null;

  const handleCompletePayment = async () => {
    setPaying(true);
    setPayError(null);
    try {
      const res = await fetch("/api/v1/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingReference: booking.reference }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data?.authorizationUrl) {
        window.location.href = json.data.authorizationUrl;
        return;
      }
      setPayError(json.error?.message || "Unable to start payment. Please try again.");
    } catch {
      setPayError("Network error while starting payment.");
    }
    setPaying(false);
  };

  const refundNotice = (() => {
    if (!paymentRecord || !paymentRecord.refund_amount) {
      return "Cancelled reservation. No refund applicable.";
    }
    const amount = `₦${paymentRecord.refund_amount.toLocaleString()}`;
    if (paymentRecord.status === "refund_pending") {
      return `${amount} refund in progress (typically 5–10 business days).`;
    }
    return `${amount} refunded.`;
  })();

  return (
    <>
      <ActionLoadingOverlay
        isOpen={resending || paying}
        message={paying ? "Redirecting to secure payment..." : "Resending confirmation email..."}
      />
      <Box
        bg="#0F172A"
        borderRadius="18px"
        border="1px solid #1E293B"
        p={{ base: 5, md: 6 }}
        mb={4}
      >
        {/* Top Reference & Status */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={2} mb={4}>
          <HStack gap={3}>
            <Text fontSize="16px" fontWeight="bold" color="accent.500" letterSpacing="1px">
              {booking.reference}
            </Text>
            {getStatusBadge(booking.status)}
          </HStack>
          <Text fontSize="12px" color="gray.400">
            Booked on {formatLongDate(booking.created_at)}
          </Text>
        </Flex>

        {/* Details Grid */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} py={3} borderY="1px solid #1E293B" mb={4}>
          <Box>
            <HStack gap={2} mb={1}>
              <Icon as={FaCalendarAlt} color="accent.500" boxSize={3.5} />
              <Text fontSize="11px" color="gray.400" textTransform="uppercase">
                Stay Schedule
              </Text>
            </HStack>
            <Text fontSize="14px" fontWeight="bold">
              {formatLongDate(booking.check_in_date)} &rarr;{" "}
              {formatLongDate(booking.check_out_date)}
            </Text>
            <Text fontSize="12px" color="gray.400">
              {booking.nights} {booking.nights === 1 ? "Night" : "Nights"} • {booking.adults} Adults
            </Text>
          </Box>

          <Box>
            <HStack gap={2} mb={1}>
              <Icon as={FaBed} color="accent.500" boxSize={3.5} />
              <Text fontSize="11px" color="gray.400" textTransform="uppercase">
                Reserved Units
              </Text>
            </HStack>
            <Text fontSize="14px" fontWeight="bold">
              {booking.booking_line_items && booking.booking_line_items.length > 0
                ? `${booking.booking_line_items.reduce((s, i) => s + i.quantity, 0)} Room(s)`
                : "Resort Accommodation"}
            </Text>
            <Text fontSize="12px" color="gray.400">
              Check-in: 14:00 • Check-out: 11:00
            </Text>
          </Box>

          <Box textAlign={{ base: "left", md: "right" }}>
            <Text fontSize="11px" color="gray.400" textTransform="uppercase" mb={1}>
              Total Amount
            </Text>
            <Text fontSize="20px" fontWeight="extrabold" color="white">
              ₦{booking.total.toLocaleString()}
            </Text>
            <Text fontSize="11px" color="gray.400">
              {booking.status === "confirmed"
                ? "Fully Settled"
                : booking.status === "pending"
                  ? "Payment Due"
                  : "Settlement Closed"}
            </Text>
          </Box>
        </SimpleGrid>

        {payError && (
          <Box
            p={2}
            mb={3}
            borderRadius="6px"
            bg="rgba(229, 62, 62, 0.15)"
            color="#FC8181"
            fontSize="12px"
            textAlign="center"
            role="alert"
          >
            {payError}
          </Box>
        )}

        {/* Resend feedback banner */}
        {resendNotice && (
          <Box
            p={2}
            mb={3}
            borderRadius="6px"
            bg={
              resendNotice.includes("sent") ? "rgba(72, 187, 120, 0.15)" : "rgba(229, 62, 62, 0.15)"
            }
            color={resendNotice.includes("sent") ? "#68D391" : "#FC8181"}
            fontSize="12px"
            textAlign="center"
          >
            {resendNotice}
          </Box>
        )}

        {/* Action Buttons per Status */}
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          {/* Status specific notices */}
          {booking.status === "cancelled" && (
            <HStack gap={2} color="gray.300" fontSize="12px">
              <Icon as={FaInfoCircle} color="#FC8181" boxSize={4} />
              <Text>Refund status: {refundNotice}</Text>
            </HStack>
          )}

          {booking.status === "no_show" && (
            <HStack gap={2} color="gray.400" fontSize="12px">
              <Icon as={FaInfoCircle} boxSize={4} />
              <Text>
                Marked No-Show after 24h post-check-in window. Reservation expired without refund.
              </Text>
            </HStack>
          )}

          {/* Action Button Groups */}
          <HStack gap={2} flexWrap="wrap" ml="auto">
            {/* PENDING: Complete Payment, Cancel */}
            {booking.status === "pending" && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={paying}
                  onClick={handleCompletePayment}
                >
                  <HStack gap={2}>
                    <Icon as={FaCreditCard} />
                    <Text>Complete Payment</Text>
                  </HStack>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(true)}
                  style={{ borderColor: "#FC8181", color: "#FC8181" }}
                >
                  <HStack gap={1.5}>
                    <Icon as={FaTimes} />
                    <Text>Cancel Hold</Text>
                  </HStack>
                </Button>
              </>
            )}

            {/* CONFIRMED: Download PDF, Resend Email, Cancel, WhatsApp */}
            {booking.status === "confirmed" && (
              <>
                <a
                  href={`/api/v1/bookings/${booking.reference}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button variant="secondary" size="sm">
                    <HStack gap={1.5}>
                      <Icon as={FaFilePdf} />
                      <Text>Download Voucher (PDF)</Text>
                    </HStack>
                  </Button>
                </a>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={resending}
                  onClick={handleResendConfirmation}
                >
                  <HStack gap={1.5}>
                    <Icon as={FaEnvelope} />
                    <Text>{resending ? "Sending..." : "Resend Email"}</Text>
                  </HStack>
                </Button>

                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Grace Arena, I am inquiring about my booking ${booking.reference}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    style={{ borderColor: "#25D366", color: "#25D366" }}
                  >
                    <HStack gap={1.5}>
                      <Icon as={FaWhatsapp} />
                      <Text>WhatsApp Concierge</Text>
                    </HStack>
                  </Button>
                </a>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(true)}
                  style={{ borderColor: "#FC8181", color: "#FC8181" }}
                >
                  <HStack gap={1.5}>
                    <Icon as={FaTimes} />
                    <Text>Cancel Booking</Text>
                  </HStack>
                </Button>
              </>
            )}

            {/* CHECKED_IN */}
            {booking.status === "checked_in" && (
              <a
                href={`/api/v1/bookings/${booking.reference}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Button variant="secondary" size="sm">
                  <HStack gap={1.5}>
                    <Icon as={FaFilePdf} />
                    <Text>Voucher (PDF)</Text>
                  </HStack>
                </Button>
              </a>
            )}

            {/* CHECKED_OUT: Download Receipt */}
            {booking.status === "checked_out" && (
              <a
                href={`/api/v1/bookings/${booking.reference}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Button variant="secondary" size="sm">
                  <HStack gap={1.5}>
                    <Icon as={FaFilePdf} />
                    <Text>Download Receipt (PDF)</Text>
                  </HStack>
                </Button>
              </a>
            )}
          </HStack>
        </Flex>
      </Box>

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        bookingReference={booking.reference}
        onSuccess={onRefresh}
      />
    </>
  );
}
