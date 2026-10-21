import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Badge, Box, Flex, HStack, Icon, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import {
  FaCalendarCheck,
  FaFilePdf,
  FaEnvelope,
  FaTimes,
  FaCreditCard,
  FaUserPlus,
} from "react-icons/fa";
import PageWrapper from "@/components/layout/PageWrapper";
import ActionLoadingOverlay from "@/components/common/ActionLoadingOverlay";
import Button from "@/components/ui/button";
import CancellationModal from "@/features/account/components/CancellationModal";
import RequestManageLinkForm from "@/features/booking/components/RequestManageLinkForm";
import { formatLongDate } from "@/lib/formatters/date";

interface ManagedBooking {
  reference: string;
  status: string;
  guest_name: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  adults: number;
  children: number;
  subtotal: number;
  deal_discount: number;
  tax: number;
  total: number;
  hold_expires_at: string | null;
  isLinkedToAccount: boolean;
  booking_line_items: Array<{ room_name: string; quantity: number; line_total: number }>;
  payments: Array<{ status: string; refund_amount: number | null }>;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Awaiting Payment", color: "#ECC94B" },
  confirmed: { label: "Confirmed", color: "#48BB78" },
  checked_in: { label: "Checked In", color: "#4299E1" },
  checked_out: { label: "Checked Out", color: "#A0AEC0" },
  cancelled: { label: "Cancelled", color: "#FC8181" },
  no_show: { label: "No Show", color: "#ED8936" },
};

const BUSY_MESSAGE: Record<string, string> = {
  pay: "Redirecting to secure payment...",
  resend: "Sending confirmation email...",
  claim: "Adding booking to your account...",
};

export default function ManageBookingPage() {
  const router = useRouter();
  const ref = typeof router.query.ref === "string" ? router.query.ref.toUpperCase() : "";
  const token = typeof router.query.t === "string" ? router.query.t : "";
  const tokenQuery = token ? `?t=${encodeURIComponent(token)}` : "";

  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    if (!ref) return;
    setLoading(true);
    try {
      const [bookingRes, meRes] = await Promise.all([
        fetch(`/api/v1/bookings/${encodeURIComponent(ref)}${tokenQuery}`),
        fetch("/api/v1/auth/me"),
      ]);
      setIsSignedIn(meRes.ok);
      const json = await bookingRes.json();
      if (bookingRes.ok && json.success) {
        setBooking(json.data);
        setNotFound(false);
      } else {
        setBooking(null);
        setNotFound(true);
      }
    } catch {
      setNotice({ ok: false, text: "Network error loading your booking. Please refresh." });
    } finally {
      setLoading(false);
    }
  }, [ref, tokenQuery]);

  useEffect(() => {
    if (!router.isReady) return;
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [router.isReady, load]);

  const post = async (label: string, url: string, body?: unknown) => {
    setBusy(label);
    setNotice(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      return { ok: res.ok && json.success, json };
    } catch {
      return { ok: false, json: { error: { message: "Network error. Please try again." } } };
    } finally {
      setBusy(null);
    }
  };

  const handleResend = async () => {
    const { ok, json } = await post("resend", `/api/v1/bookings/${ref}/confirmation${tokenQuery}`);
    setNotice({
      ok,
      text: ok ? "Confirmation email sent." : json.error?.message || "Unable to resend right now.",
    });
  };

  const handlePay = async () => {
    const { ok, json } = await post("pay", `/api/v1/payments/initiate${tokenQuery}`, {
      bookingReference: ref,
    });
    if (ok && json.data?.authorizationUrl) {
      window.location.href = json.data.authorizationUrl;
      return;
    }
    setNotice({ ok: false, text: json.error?.message || "Unable to start payment." });
  };

  const handleClaim = async () => {
    const { ok, json } = await post("claim", `/api/v1/bookings/${ref}/claim${tokenQuery}`);
    setNotice({
      ok,
      text: ok
        ? "This booking now appears in your account."
        : json.error?.message || "Unable to add this booking to your account.",
    });
    if (ok) load();
  };

  const status = booking
    ? STATUS_LABEL[booking.status] || { label: booking.status, color: "#A0AEC0" }
    : null;
  const refund = booking?.payments.find((p) => p.refund_amount);
  const canCancel = booking && ["pending", "confirmed"].includes(booking.status);
  const overlayMessage = loading
    ? "Loading your reservation..."
    : busy
      ? BUSY_MESSAGE[busy]
      : undefined;

  return (
    <PageWrapper
      title="Manage Your Booking — Grace Arena Resorts"
      description="View, download, or cancel your Grace Arena Resorts reservation."
    >
      <ActionLoadingOverlay isOpen={Boolean(overlayMessage)} message={overlayMessage} />
      <Box bg="#0B132B" color="white" minH="80vh" py={{ base: 8, md: 14 }} px={4}>
        <Box maxW="760px" mx="auto">
          <Text as="h1" fontSize={{ base: "26px", md: "34px" }} fontWeight="extrabold" mb={6}>
            Manage Your Booking
          </Text>

          {!loading && notFound && (
            <Box bg="#0F172A" p={6} borderRadius="16px" border="1px solid #1E293B">
              <Text fontSize="16px" fontWeight="bold" mb={2}>
                This link is invalid or has expired
              </Text>
              <Text fontSize="14px" color="gray.300" mb={5}>
                Enter your booking reference and email and we&apos;ll send you a fresh link.
              </Text>
              <RequestManageLinkForm defaultReference={ref} />
            </Box>
          )}

          {!loading && booking && status && (
            <Stack gap={5}>
              <Box bg="#0F172A" p={6} borderRadius="16px" border="1px solid #1E293B">
                <Flex justify="space-between" align="center" wrap="wrap" gap={3} mb={4}>
                  <Text
                    fontSize="22px"
                    fontWeight="extrabold"
                    color="accent.500"
                    letterSpacing="1px"
                  >
                    {booking.reference}
                  </Text>
                  <Badge bg="whiteAlpha.100" color={status.color} px={3} py={1} borderRadius="full">
                    {status.label}
                  </Badge>
                </Flex>

                <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4} mb={4}>
                  <Box>
                    <HStack gap={2} color="gray.400" fontSize="12px" textTransform="uppercase">
                      <Icon as={FaCalendarCheck} color="accent.500" />
                      <Text>Stay</Text>
                    </HStack>
                    <Text fontWeight="bold">
                      {formatLongDate(booking.check_in_date)} →{" "}
                      {formatLongDate(booking.check_out_date)}
                    </Text>
                    <Text fontSize="13px" color="gray.400">
                      {booking.nights} {booking.nights === 1 ? "night" : "nights"} •{" "}
                      {booking.adults} adults
                      {booking.children ? `, ${booking.children} children` : ""}
                    </Text>
                  </Box>
                  <Box>
                    <Text color="gray.400" fontSize="12px" textTransform="uppercase">
                      Guest
                    </Text>
                    <Text fontWeight="bold">{booking.guest_name}</Text>
                    <Text fontSize="13px" color="gray.400">
                      {booking.guest_email}
                    </Text>
                  </Box>
                </SimpleGrid>

                <Stack gap={1} fontSize="14px" borderTop="1px solid #1E293B" pt={4}>
                  {booking.booking_line_items.map((li, i) => (
                    <Flex key={i} justify="space-between">
                      <Text>
                        {li.quantity}× {li.room_name}
                      </Text>
                      <Text>₦{li.line_total.toLocaleString()}</Text>
                    </Flex>
                  ))}
                  {booking.deal_discount > 0 && (
                    <Flex justify="space-between" color="#68D391">
                      <Text>Discount</Text>
                      <Text>−₦{booking.deal_discount.toLocaleString()}</Text>
                    </Flex>
                  )}
                  <Flex justify="space-between" color="gray.400">
                    <Text>VAT</Text>
                    <Text>₦{booking.tax.toLocaleString()}</Text>
                  </Flex>
                  <Flex justify="space-between" fontWeight="bold" fontSize="16px">
                    <Text>Total</Text>
                    <Text color="accent.500">₦{booking.total.toLocaleString()}</Text>
                  </Flex>
                </Stack>

                {booking.status === "cancelled" && refund?.refund_amount && (
                  <Text fontSize="13px" color="gray.300" mt={4}>
                    Refund: ₦{refund.refund_amount.toLocaleString()}{" "}
                    {refund.status === "refunded"
                      ? "processed."
                      : "in progress (5–10 business days)."}
                  </Text>
                )}
              </Box>

              {notice && (
                <Box
                  p={3}
                  borderRadius="8px"
                  bg={notice.ok ? "rgba(72, 187, 120, 0.15)" : "rgba(229, 62, 62, 0.15)"}
                  color={notice.ok ? "#68D391" : "#FC8181"}
                  fontSize="13px"
                  role={notice.ok ? "status" : "alert"}
                >
                  {notice.text}
                </Box>
              )}

              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                {booking.status === "pending" && (
                  <Button variant="primary" size="md" disabled={busy !== null} onClick={handlePay}>
                    <HStack gap={2}>
                      <Icon as={FaCreditCard} />
                      <Text>{busy === "pay" ? "Starting payment…" : "Complete Payment"}</Text>
                    </HStack>
                  </Button>
                )}
                {["confirmed", "checked_in", "checked_out"].includes(booking.status) && (
                  <>
                    <a
                      href={`/api/v1/bookings/${booking.reference}/pdf${tokenQuery}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Button variant="primary" size="md" style={{ width: "100%" }}>
                        <HStack gap={2} justify="center">
                          <Icon as={FaFilePdf} />
                          <Text>Download Voucher (PDF)</Text>
                        </HStack>
                      </Button>
                    </a>
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={busy !== null}
                      onClick={handleResend}
                    >
                      <HStack gap={2}>
                        <Icon as={FaEnvelope} />
                        <Text>{busy === "resend" ? "Sending…" : "Resend Confirmation Email"}</Text>
                      </HStack>
                    </Button>
                  </>
                )}
                {canCancel && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setCancelOpen(true)}
                    style={{ borderColor: "#FC8181", color: "#FC8181" }}
                  >
                    <HStack gap={2}>
                      <Icon as={FaTimes} />
                      <Text>{booking.status === "pending" ? "Cancel Hold" : "Cancel Booking"}</Text>
                    </HStack>
                  </Button>
                )}
              </SimpleGrid>

              {!booking.isLinkedToAccount && (
                <Box
                  bg="rgba(252, 202, 70, 0.08)"
                  p={5}
                  borderRadius="16px"
                  border="1px solid rgba(252, 202, 70, 0.3)"
                >
                  <HStack gap={2} mb={2}>
                    <Icon as={FaUserPlus} color="accent.500" />
                    <Text fontWeight="bold">Keep your bookings in one place</Text>
                  </HStack>
                  {isSignedIn ? (
                    <>
                      <Text fontSize="13px" color="gray.300" mb={3}>
                        Add this reservation to the account you&apos;re signed in with.
                      </Text>
                      <Button
                        variant="primary"
                        size="md"
                        disabled={busy !== null}
                        onClick={handleClaim}
                      >
                        {busy === "claim" ? "Adding…" : "Add to My Account"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Text fontSize="13px" color="gray.300" mb={3}>
                        Create a free account with {booking.guest_email} — once you verify your
                        email, this and future bookings appear automatically.
                      </Text>
                      <Flex gap={3} wrap="wrap">
                        <a
                          href={`/register?${new URLSearchParams({
                            email: booking.guest_email,
                            name: booking.guest_name,
                          }).toString()}`}
                          style={{ textDecoration: "none" }}
                        >
                          <Button variant="primary" size="md">
                            Create an Account
                          </Button>
                        </a>
                        <a
                          href={`/login?redirect=${encodeURIComponent(router.asPath)}`}
                          style={{ textDecoration: "none" }}
                        >
                          <Button variant="secondary" size="md">
                            Sign In
                          </Button>
                        </a>
                      </Flex>
                    </>
                  )}
                </Box>
              )}

              <Text fontSize="12px" color="gray.500">
                Keep this page&apos;s link private — anyone with it can manage this booking. It
                stays valid until 30 days after check-out.
              </Text>
            </Stack>
          )}
        </Box>
      </Box>

      {booking && (
        <CancellationModal
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          bookingReference={booking.reference}
          accessToken={token || undefined}
          onSuccess={() => {
            setNotice({ ok: true, text: "Your booking has been cancelled." });
            load();
          }}
        />
      )}
    </PageWrapper>
  );
}
