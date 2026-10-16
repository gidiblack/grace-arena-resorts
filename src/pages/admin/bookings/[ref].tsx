/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Heading,
  Badge,
  Button,
  Spinner,
  Icon,
  Table,
  Input,
  Textarea,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  FaCheckCircle,
  FaSignOutAlt,
  FaMoneyBillWave,
  FaBan,
  FaExclamationCircle,
  FaHistory,
  FaBed,
  FaUser,
  FaCreditCard,
  FaCheck,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import { formatNgn } from "@/lib/formatters/currency";
import { canMarkNoShow } from "@/domain/booking/state-machine";

interface AdminBookingDetailPageProps {
  adminUser: AdminUserSession;
  refCode: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "green",
  pending: "yellow",
  checked_in: "blue",
  checked_out: "gray",
  cancelled: "red",
  no_show: "orange",
};

export const getServerSideProps: GetServerSideProps<AdminBookingDetailPageProps> = async (ctx) => {
  const guardResult = await requireAdminPage<AdminBookingDetailPageProps>(ctx, [
    "content_manager",
    "resort_admin",
    "super_admin",
  ]);

  if ("redirect" in guardResult || "notFound" in guardResult) return guardResult;

  const refCode = String(ctx.params?.ref || "");
  const pageProps = await guardResult.props;
  return {
    props: {
      adminUser: pageProps.adminUser,
      refCode,
    },
  };
};

export default function AdminBookingDetailPage({
  adminUser,
  refCode,
}: AdminBookingDetailPageProps) {
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showOfflinePaymentModal, setShowOfflinePaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundOutcomeModal, setShowRefundOutcomeModal] = useState(false);

  // Form states
  const [availableUnitsMap, setAvailableUnitsMap] = useState<Record<string, any[]>>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({}); // lineItemId -> roomId

  const [offlineMethod, setOfflineMethod] = useState<"bank_transfer" | "cash" | "pos">("bank_transfer");
  const [offlineReference, setOfflineReference] = useState("");
  const [offlineNote, setOfflineNote] = useState("");

  const [refundPreview, setRefundPreview] = useState<any>(null);
  const [refundOverrideEnabled, setRefundOverrideEnabled] = useState(false);
  const [refundOverrideAmount, setRefundOverrideAmount] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState("");
  const [forceManualRefund, setForceManualRefund] = useState(false);

  const [refundOutcomeAction, setRefundOutcomeAction] = useState<"mark_processed" | "mark_failed" | "retry_paystack">("mark_processed");
  const [refundOutcomeRef, setRefundOutcomeRef] = useState("");
  const [refundBankName, setRefundBankName] = useState("");
  const [refundAccountLast4, setRefundAccountLast4] = useState("");
  const [refundOutcomeNote, setRefundOutcomeNote] = useState("");

  const isContentManager = adminUser.role === "content_manager";
  const isResortAdmin = ["resort_admin", "super_admin"].includes(adminUser.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      // 1. Fetch booking with line items and payments
      const res = await fetch(`/api/v1/bookings?reference=${refCode}&limit=1`);
      const json = await res.json();
      if (res.ok && json.success && json.data?.length > 0) {
        const b = json.data[0];
        setBooking(b);

        // Pre-fill offline payment reference
        setOfflineReference(`BT-${b.reference}-${Math.floor(Math.random() * 9000 + 1000)}`);

        // Fetch history and room assignments
        const [histRes, assignRes] = await Promise.all([
          fetch(`/api/v1/bookings/${refCode}`), // if endpoint exists, or load history
          fetch(`/api/v1/rooms/${b.booking_line_items?.[0]?.room_type_id || "all"}/units`),
        ]);

        if (histRes.ok) {
          const histJson = await histRes.json();
          if (histJson.data?.status_history) {
            setHistory(histJson.data.status_history);
          }
        }

        if (assignRes.ok) {
          const assignJson = await assignRes.json();
          if (assignJson.success) {
            setAssignments(assignJson.data?.filter((u: any) => u.activeAssignment) || []);
          }
        }
      } else {
        setActionError("Booking not found");
      }
    } catch {
      setActionError("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  }, [refCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Check-in opening
  const handleOpenCheckIn = async () => {
    if (!booking) return;
    setActionLoading(true);
    try {
      const unitsMap: Record<string, any[]> = {};
      const initialSelection: Record<string, string> = {};

      for (const item of booking.booking_line_items || []) {
        const res = await fetch(`/api/v1/rooms/${item.room_type_id}/units`);
        const json = await res.json();
        if (res.ok && json.success) {
          // Available units only
          const avail = (json.data || []).filter((u: any) => u.status === "available");
          unitsMap[item.id] = avail;
          if (avail.length > 0) {
            initialSelection[item.id] = avail[0].id;
          }
        }
      }

      setAvailableUnitsMap(unitsMap);
      setSelectedUnits(initialSelection);
      setShowCheckInModal(true);
    } catch {
      setActionError("Failed to load available room units for check-in");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Check-In
  const handleSubmitCheckIn = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const assignmentsPayload = Object.entries(selectedUnits).map(([lineItemId, roomId]) => ({
        bookingLineItemId: lineItemId,
        roomId,
      }));

      const res = await fetch(`/api/v1/bookings/${refCode}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "checked_in",
          assignments: assignmentsPayload,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setActionSuccess("Guest checked in successfully with unit assignments.");
        setShowCheckInModal(false);
        await loadData();
      } else {
        setActionError(json.error?.message || "Failed to check in booking");
      }
    } catch {
      setActionError("Error connecting to server for check-in");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Check-Out
  const handleSubmitCheckOut = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${refCode}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "checked_out" }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setActionSuccess("Booking checked out and units released.");
        setShowCheckOutModal(false);
        await loadData();
      } else {
        setActionError(json.error?.message || "Failed to check out booking");
      }
    } catch {
      setActionError("Error executing check-out");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit No-Show
  const handleMarkNoShow = async () => {
    if (!confirm("Are you sure you want to mark this reservation as No-Show? This action cannot be reversed.")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${refCode}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "no_show" }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setActionSuccess("Booking marked as No-Show.");
        await loadData();
      } else {
        setActionError(json.error?.message || "Failed to mark as no-show");
      }
    } catch {
      setActionError("Error recording no-show status");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/bookings/${refCode}/cancel`);
      const json = await res.json();
      if (res.ok && json.success) {
        setRefundPreview(json.data);
        setRefundOverrideAmount(json.data.estimatedRefundAmount || 0);
        setShowCancelModal(true);
      } else {
        setActionError("Failed to calculate refund preview");
      }
    } catch {
      setActionError("Error loading refund calculation");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Cancellation
  const handleSubmitCancel = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const body: any = {
        forceManualRefund,
      };

      if (refundOverrideEnabled) {
        body.refundAmountOverride = Number(refundOverrideAmount);
        body.overrideReason = overrideReason.trim();
      }

      const res = await fetch(`/api/v1/bookings/${refCode}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setActionSuccess(json.data?.message || "Booking successfully cancelled.");
        setShowCancelModal(false);
        await loadData();
      } else {
        setActionError(json.error?.message || "Failed to cancel booking");
      }
    } catch {
      setActionError("Error processing cancellation");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Offline Payment
  const handleSubmitOfflinePayment = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${refCode}/offline-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: offlineMethod,
          reference: offlineReference.trim(),
          amount: booking.total,
          note: offlineNote.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setActionSuccess("Offline payment recorded. Booking is now confirmed.");
        setShowOfflinePaymentModal(false);
        await loadData();
      } else {
        setActionError(json.error?.message || "Failed to record payment");
      }
    } catch {
      setActionError("Error recording offline payment");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Manual Refund Outcome
  const handleSubmitRefundOutcome = async () => {
    const payment = booking?.payments?.[0];
    if (!payment) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const payload: any = {
        action: refundOutcomeAction,
        note: refundOutcomeNote.trim() || undefined,
      };

      if (refundOutcomeAction === "mark_processed") {
        payload.reference = refundOutcomeRef.trim() || undefined;
        if (refundBankName.trim() && refundAccountLast4.trim()) {
          payload.destination = {
            bankName: refundBankName.trim(),
            accountLast4: refundAccountLast4.trim(),
          };
        }
      }

      const res = await fetch(`/api/v1/payments/${payment.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setActionSuccess(json.data?.message || "Refund outcome updated successfully.");
        setShowRefundOutcomeModal(false);
        await loadData();
      } else {
        setActionError(json.error?.message || "Failed to update refund outcome");
      }
    } catch {
      setActionError("Error recording refund outcome");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout
        title="Loading Booking..."
        user={adminUser}
        breadcrumbs={[{ label: "Bookings", href: "/admin/bookings" }, { label: refCode }]}
      >
        <Flex justify="center" align="center" minH="50vh">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </AdminLayout>
    );
  }

  if (!booking) {
    return (
      <AdminLayout
        title="Booking Not Found"
        user={adminUser}
        breadcrumbs={[{ label: "Bookings", href: "/admin/bookings" }, { label: refCode }]}
      >
        <Box p={8} bg="white" borderRadius="lg" textAlign="center">
          <Icon as={FaExclamationCircle} color="red.500" boxSize={10} mb={3} />
          <Heading size="md" mb={2}>
            Reservation Not Found
          </Heading>
          <Text color="gray.600" mb={4}>
            No reservation found for reference <strong>{refCode}</strong>.
          </Text>
          <Button onClick={() => router.push("/admin/bookings")}>Return to Bookings</Button>
        </Box>
      </AdminLayout>
    );
  }

  const pmt = booking.payments?.[0] || null;
  const statusColor = STATUS_COLORS[booking.status] || "gray";
  const canNoShow = booking.status === "confirmed" && canMarkNoShow(new Date(), booking.check_in_date);
  const isRefundPending = pmt?.status === "refund_pending" || pmt?.status === "refund_failed";

  return (
    <AdminLayout
      title={`Booking ${booking.reference}`}
      user={adminUser}
      breadcrumbs={[{ label: "Bookings", href: "/admin/bookings" }, { label: booking.reference }]}
    >
      {/* Notifications / Alerts */}
      {actionError && (
        <Box bg="red.50" color="red.700" p={4} borderRadius="md" mb={4} border="1px solid" borderColor="red.200">
          <HStack gap={2}>
            <Icon as={FaExclamationCircle} />
            <Text fontWeight="semibold">{actionError}</Text>
          </HStack>
        </Box>
      )}

      {actionSuccess && (
        <Box bg="green.50" color="green.700" p={4} borderRadius="md" mb={4} border="1px solid" borderColor="green.200">
          <HStack gap={2}>
            <Icon as={FaCheckCircle} />
            <Text fontWeight="semibold">{actionSuccess}</Text>
          </HStack>
        </Box>
      )}

      {/* Header and Status Actions */}
      <Flex justify="space-between" align={{ base: "start", md: "center" }} mb={6} flexWrap="wrap" gap={4}>
        <HStack gap={3} flexWrap="wrap">
          <Heading size="lg" color="gray.800">
            {booking.reference}
          </Heading>
          <Badge colorScheme={statusColor} fontSize="sm" px={3} py={1} borderRadius="md">
            {booking.status.replace("_", " ").toUpperCase()}
          </Badge>
          <Badge variant="subtle" fontSize="sm" px={2} py={1}>
            {booking.channel.replace("_", " ")}
          </Badge>
        </HStack>

        {/* Action Buttons (Restricted for Content Manager) */}
        {!isContentManager && isResortAdmin && (
          <HStack gap={2} flexWrap="wrap">
            {/* Check In */}
            {booking.status === "confirmed" && (
              <Button size="sm" colorScheme="blue" onClick={handleOpenCheckIn} loading={actionLoading}>
                <HStack gap={1.5}>
                  <Icon as={FaCheckCircle} />
                  <Text>Check In</Text>
                </HStack>
              </Button>
            )}

            {/* Check Out */}
            {booking.status === "checked_in" && (
              <Button size="sm" colorScheme="gray" onClick={() => setShowCheckOutModal(true)} loading={actionLoading}>
                <HStack gap={1.5}>
                  <Icon as={FaSignOutAlt} />
                  <Text>Check Out</Text>
                </HStack>
              </Button>
            )}

            {/* Offline Payment (for pending holds) */}
            {booking.status === "pending" && (
              <Button size="sm" colorScheme="green" onClick={() => setShowOfflinePaymentModal(true)} loading={actionLoading}>
                <HStack gap={1.5}>
                  <Icon as={FaMoneyBillWave} />
                  <Text>Record Offline Payment</Text>
                </HStack>
              </Button>
            )}

            {/* Manual Refund Outcome */}
            {isRefundPending && (
              <Button size="sm" colorScheme="purple" onClick={() => setShowRefundOutcomeModal(true)}>
                <HStack gap={1.5}>
                  <Icon as={FaCreditCard} />
                  <Text>Process Refund</Text>
                </HStack>
              </Button>
            )}

            {/* Mark No-Show */}
            {booking.status === "confirmed" && (
              <Button
                size="sm"
                colorScheme="orange"
                variant="outline"
                disabled={!canNoShow}
                title={canNoShow ? "Mark booking as no-show" : "No-Show available 24h after check-in time"}
                onClick={handleMarkNoShow}
                loading={actionLoading}
              >
                Mark No-Show
              </Button>
            )}

            {/* Cancel Booking */}
            {["pending", "confirmed"].includes(booking.status) && (
              <Button size="sm" colorScheme="red" variant="outline" onClick={handleOpenCancelModal} loading={actionLoading}>
                <HStack gap={1.5}>
                  <Icon as={FaBan} />
                  <Text>Cancel Booking</Text>
                </HStack>
              </Button>
            )}
          </HStack>
        )}
      </Flex>

      <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
        {/* Left 2 Columns: Stay Details, Rooms, Timeline */}
        <VStack gap={6} align="stretch" gridColumn={{ lg: "span 2" }}>
          {/* Guest Information */}
          <Box bg="white" p={5} borderRadius="lg" border="1px solid" borderColor="gray.200">
            <HStack mb={4} gap={2}>
              <Icon as={FaUser} color="blue.500" />
              <Heading size="sm" color="gray.700">
                Guest Information
              </Heading>
            </HStack>
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4} fontSize="sm">
              <Box>
                <Text color="gray.500">Full Name</Text>
                <Text fontWeight="semibold">{booking.guest_name}</Text>
              </Box>
              <Box>
                <Text color="gray.500">Email Address</Text>
                <Text fontWeight="semibold">{booking.guest_email}</Text>
              </Box>
              <Box>
                <Text color="gray.500">Phone Number</Text>
                <Text fontWeight="semibold">{booking.guest_phone}</Text>
              </Box>
              <Box>
                <Text color="gray.500">Account Status</Text>
                <Text fontWeight="semibold">
                  {booking.user_id ? "Registered Account" : "Guest Checkout"}
                </Text>
              </Box>
              {booking.privacy_consent_at && (
                <Box>
                  <Text color="gray.500">Privacy Consent</Text>
                  <Text fontSize="xs" color="gray.700">
                    {new Date(booking.privacy_consent_at).toLocaleString()}
                  </Text>
                </Box>
              )}
            </SimpleGrid>
          </Box>

          {/* Stay & Room Details */}
          <Box bg="white" p={5} borderRadius="lg" border="1px solid" borderColor="gray.200">
            <HStack mb={4} gap={2}>
              <Icon as={FaBed} color="blue.500" />
              <Heading size="sm" color="gray.700">
                Stay Details & Line Items
              </Heading>
            </HStack>

            <HStack justify="space-between" mb={4} p={3} bg="gray.50" borderRadius="md" fontSize="sm">
              <Box>
                <Text color="gray.500" fontSize="xs">Check-In</Text>
                <Text fontWeight="bold">{booking.check_in_date} (14:00)</Text>
              </Box>
              <Box>
                <Text color="gray.500" fontSize="xs">Check-Out</Text>
                <Text fontWeight="bold">{booking.check_out_date} (11:00)</Text>
              </Box>
              <Box>
                <Text color="gray.500" fontSize="xs">Duration</Text>
                <Text fontWeight="bold">{booking.nights} Night(s)</Text>
              </Box>
              <Box>
                <Text color="gray.500" fontSize="xs">Guests</Text>
                <Text fontWeight="bold">
                  {booking.adults} Adults, {booking.children} Kids
                </Text>
              </Box>
            </HStack>

            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Room Type</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Quantity</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Rate / Night</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Line Total</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(booking.booking_line_items || []).map((li: any) => (
                  <Table.Row key={li.id}>
                    <Table.Cell fontWeight="medium">
                      {li.room_type?.name || "Room Suite"}
                      <Text fontSize="xs" color="gray.500">ID: {li.room_type_id}</Text>
                    </Table.Cell>
                    <Table.Cell textAlign="right">{li.quantity}</Table.Cell>
                    <Table.Cell textAlign="right">{formatNgn(li.unit_price)}</Table.Cell>
                    <Table.Cell textAlign="right" fontWeight="semibold">{formatNgn(li.line_total)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>

            <Box borderBottomWidth="1px" borderColor="gray.200" my={4} />

            {/* Pricing Summary */}
            <VStack align="stretch" gap={1.5} fontSize="sm">
              <Flex justify="space-between">
                <Text color="gray.600">Subtotal</Text>
                <Text fontWeight="medium">{formatNgn(booking.subtotal)}</Text>
              </Flex>
              {booking.deal_discount > 0 && (
                <Flex justify="space-between" color="green.600">
                  <Text>Promotional Discount</Text>
                  <Text fontWeight="medium">-{formatNgn(booking.deal_discount)}</Text>
                </Flex>
              )}
              <Flex justify="space-between">
                <Text color="gray.600">VAT & Taxes (7.5%)</Text>
                <Text fontWeight="medium">{formatNgn(booking.tax)}</Text>
              </Flex>
              <Flex justify="space-between" pt={2} borderTop="1px solid" borderColor="gray.200" fontSize="md">
                <Text fontWeight="bold">Total Amount</Text>
                <Text fontWeight="bold" color="blue.600">{formatNgn(booking.total)}</Text>
              </Flex>
            </VStack>

            {booking.special_requests && (
              <Box mt={4} p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                  Special Requests & Notes:
                </Text>
                <Text fontSize="sm" whiteSpace="pre-wrap" color="gray.700">
                  {booking.special_requests}
                </Text>
              </Box>
            )}
          </Box>

          {/* Status Timeline */}
          <Box bg="white" p={5} borderRadius="lg" border="1px solid" borderColor="gray.200">
            <HStack mb={4} gap={2}>
              <Icon as={FaHistory} color="blue.500" />
              <Heading size="sm" color="gray.700">
                Audit Timeline & Status History
              </Heading>
            </HStack>

            {history.length === 0 ? (
              <Text fontSize="sm" color="gray.500">
                Created on {new Date(booking.created_at).toLocaleString()}
              </Text>
            ) : (
              <VStack align="stretch" gap={3}>
                {history.map((h, i) => (
                  <HStack key={h.id || i} align="start" gap={3} fontSize="sm">
                    <Box mt={1}>
                      <Icon as={FaCheck} color="blue.500" boxSize={3} />
                    </Box>
                    <Box flex="1">
                      <HStack gap={2}>
                        <Text fontWeight="semibold">
                          {h.from_status ? `${h.from_status} → ` : ""}{h.to_status}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {new Date(h.created_at).toLocaleString()}
                        </Text>
                      </HStack>
                      <Text fontSize="xs" color="gray.600">
                        By: {h.changed_by ? "Staff" : "System / Gateway"}
                        {h.note ? ` — Note: ${h.note}` : ""}
                      </Text>
                    </Box>
                  </HStack>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>

        {/* Right Column: Payment & Units */}
        <VStack gap={6} align="stretch">
          {/* Payment Details Panel */}
          <Box bg="white" p={5} borderRadius="lg" border="1px solid" borderColor="gray.200">
            <HStack mb={4} gap={2}>
              <Icon as={FaCreditCard} color="blue.500" />
              <Heading size="sm" color="gray.700">
                Payment Panel
              </Heading>
            </HStack>

            {pmt ? (
              <VStack align="stretch" gap={3} fontSize="sm">
                <Box>
                  <Text color="gray.500" fontSize="xs">Gateway / Method</Text>
                  <Text fontWeight="semibold" textTransform="uppercase">
                    {pmt.gateway.replace("_", " ")}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.500" fontSize="xs">Gateway Reference</Text>
                  <Text fontWeight="mono" fontSize="xs">
                    {pmt.gateway_reference || "N/A"}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.500" fontSize="xs">Amount Paid</Text>
                  <Text fontWeight="bold" color="green.600">
                    {formatNgn(pmt.amount)}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.500" fontSize="xs">Payment Status</Text>
                  <Badge colorScheme={pmt.status === "success" ? "green" : "purple"}>
                    {pmt.status.toUpperCase()}
                  </Badge>
                </Box>
                {pmt.paid_at && (
                  <Box>
                    <Text color="gray.500" fontSize="xs">Settled At</Text>
                    <Text fontSize="xs">{new Date(pmt.paid_at).toLocaleString()}</Text>
                  </Box>
                )}

                {/* Refund Information */}
                {pmt.refund_amount !== null && (
                  <Box mt={2} p={3} bg="purple.50" borderRadius="md" border="1px solid" borderColor="purple.200">
                    <Text fontWeight="bold" fontSize="xs" color="purple.800" mb={1}>
                      Refund Details
                    </Text>
                    <Text fontSize="xs">Amount: <strong>{formatNgn(pmt.refund_amount)}</strong></Text>
                    {pmt.refund_method && (
                      <Text fontSize="xs">Method: <strong>{pmt.refund_method.replace("_", " ")}</strong></Text>
                    )}
                    {pmt.refund_reference && (
                      <Text fontSize="xs">Ref: <strong>{pmt.refund_reference}</strong></Text>
                    )}
                    {pmt.refunded_at && (
                      <Text fontSize="xs">Processed: {new Date(pmt.refunded_at).toLocaleString()}</Text>
                    )}
                    {pmt.metadata?.refundDestination && (
                      <Text fontSize="xs">
                        Dest: {pmt.metadata.refundDestination.bankName} (****{pmt.metadata.refundDestination.accountLast4})
                      </Text>
                    )}
                  </Box>
                )}
              </VStack>
            ) : (
              <Box p={4} bg="yellow.50" borderRadius="md" textAlign="center">
                <Text fontSize="xs" color="yellow.800" fontWeight="medium">
                  No payment record has been captured yet.
                </Text>
              </Box>
            )}
          </Box>

          {/* Assigned Units */}
          <Box bg="white" p={5} borderRadius="lg" border="1px solid" borderColor="gray.200">
            <HStack mb={4} gap={2}>
              <Icon as={FaBed} color="blue.500" />
              <Heading size="sm" color="gray.700">
                Assigned Units
              </Heading>
            </HStack>

            {booking.status === "checked_in" ? (
              <VStack align="stretch" gap={2}>
                <Text fontSize="xs" color="green.600" fontWeight="semibold">
                  Unit(s) currently occupied:
                </Text>
                {assignments.length > 0 ? (
                  assignments.map((u) => (
                    <Box key={u.id} p={2} bg="gray.50" borderRadius="md" fontSize="sm">
                      <Text fontWeight="bold">Unit {u.unit_number} {u.floor ? `(Floor ${u.floor})` : ""}</Text>
                    </Box>
                  ))
                ) : (
                  <Text fontSize="xs" color="gray.500">Assignments active in database.</Text>
                )}
              </VStack>
            ) : booking.status === "checked_out" ? (
              <Text fontSize="xs" color="gray.500">
                All units released upon check-out.
              </Text>
            ) : (
              <Text fontSize="xs" color="gray.500">
                Units will be assigned upon guest arrival during Check-In.
              </Text>
            )}
          </Box>
        </VStack>
      </SimpleGrid>

      {/* CHECK-IN MODAL */}
      {showCheckInModal && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={200} display="flex" alignItems="center" justifyContent="center" p={4}>
          <Box bg="white" maxW="500px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Heading size="md" mb={2}>Check-In Guest & Assign Units</Heading>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Assign one available physical unit for each booked room line item.
            </Text>

            <VStack align="stretch" gap={4} mb={6}>
              {(booking.booking_line_items || []).map((li: any) => {
                const availUnits = availableUnitsMap[li.id] || [];
                return (
                  <Box key={li.id}>
                    <Text fontSize="sm" fontWeight="semibold" mb={1}>
                      {li.room_type?.name || "Room Suite"} (Quantity: {li.quantity})
                    </Text>
                    {availUnits.length === 0 ? (
                      <Text fontSize="xs" color="red.500">
                        No available units found for this room type. All units may be occupied or in maintenance.
                      </Text>
                    ) : (
                      <select
                        style={{
                          height: "32px",
                          padding: "0 8px",
                          fontSize: "12px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E0",
                          background: "white",
                          color: "#2D3748",
                          width: "100%",
                        }}
                        value={selectedUnits[li.id] || ""}
                        onChange={(e) => setSelectedUnits({ ...selectedUnits, [li.id]: e.target.value })}
                      >
                        {availUnits.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            Unit {u.unit_number} {u.floor ? `(Floor ${u.floor})` : ""} - Available
                          </option>
                        ))}
                      </select>
                    )}
                  </Box>
                );
              })}
            </VStack>

            <HStack justify="flex-end" gap={3}>
              <Button size="sm" variant="ghost" onClick={() => setShowCheckInModal(false)}>
                Cancel
              </Button>
              <Button size="sm" colorScheme="blue" onClick={handleSubmitCheckIn} loading={actionLoading}>
                Complete Check-In
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      {/* CHECK-OUT MODAL */}
      {showCheckOutModal && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={200} display="flex" alignItems="center" justifyContent="center" p={4}>
          <Box bg="white" maxW="450px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Heading size="md" mb={2}>Check Out Reservation</Heading>
            <Text fontSize="sm" color="gray.600" mb={4}>
              This will mark reservation <strong>{booking.reference}</strong> as Checked-Out and release all assigned units back to available inventory.
            </Text>
            <HStack justify="flex-end" gap={3}>
              <Button size="sm" variant="ghost" onClick={() => setShowCheckOutModal(false)}>
                Cancel
              </Button>
              <Button size="sm" colorScheme="blue" onClick={handleSubmitCheckOut} loading={actionLoading}>
                Confirm Check-Out
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      {/* RECORD OFFLINE PAYMENT MODAL */}
      {showOfflinePaymentModal && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={200} display="flex" alignItems="center" justifyContent="center" p={4}>
          <Box bg="white" maxW="480px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Heading size="md" mb={2}>Record Offline Payment</Heading>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Record bank transfer, cash, or POS payment to confirm this reservation.
            </Text>

            <VStack align="stretch" gap={3} mb={6} fontSize="sm">
              <Box>
                <Text color="gray.500" mb={1}>Payment Method</Text>
                <select
                  style={{
                    height: "32px",
                    padding: "0 8px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E0",
                    background: "white",
                    color: "#2D3748",
                    width: "100%",
                  }}
                  value={offlineMethod}
                  onChange={(e) => setOfflineMethod(e.target.value as any)}
                >
                  <option value="bank_transfer">Bank Transfer (Concierge)</option>
                  <option value="cash">Cash (Front Desk)</option>
                  <option value="pos">POS Terminal (Front Desk)</option>
                </select>
              </Box>

              <Box>
                <Text color="gray.500" mb={1}>Payment Reference *</Text>
                <Input
                  size="sm"
                  value={offlineReference}
                  onChange={(e) => setOfflineReference(e.target.value)}
                  placeholder="e.g. Bank transfer session ID / receipt ref"
                />
              </Box>

              <Box>
                <Text color="gray.500" mb={1}>Amount</Text>
                <Input size="sm" value={formatNgn(booking.total)} disabled />
              </Box>

              <Box>
                <Text color="gray.500" mb={1}>Internal Note (Optional)</Text>
                <Textarea
                  size="sm"
                  value={offlineNote}
                  onChange={(e) => setOfflineNote(e.target.value)}
                  placeholder="e.g. Received via Zenith Bank transfer"
                />
              </Box>
            </VStack>

            <HStack justify="flex-end" gap={3}>
              <Button size="sm" variant="ghost" onClick={() => setShowOfflinePaymentModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="green"
                onClick={handleSubmitOfflinePayment}
                loading={actionLoading}
                disabled={!offlineReference.trim()}
              >
                Record Payment & Confirm
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      {/* CANCEL BOOKING MODAL */}
      {showCancelModal && refundPreview && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={200} display="flex" alignItems="center" justifyContent="center" p={4}>
          <Box bg="white" maxW="500px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Heading size="md" mb={2}>Cancel Reservation</Heading>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Policy Refund Preview: <strong>{formatNgn(refundPreview.estimatedRefundAmount)}</strong> ({refundPreview.refundPercentage}%).
            </Text>
            <Text fontSize="xs" color="gray.500" mb={4}>{refundPreview.reason}</Text>

            {isResortAdmin && (
              <Box p={3} bg="gray.50" borderRadius="md" mb={4} fontSize="sm">
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="semibold">Override Refund Amount (Admin)</Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setRefundOverrideEnabled(!refundOverrideEnabled)}
                  >
                    {refundOverrideEnabled ? "Use Policy" : "Override"}
                  </Button>
                </HStack>

                {refundOverrideEnabled && (
                  <VStack align="stretch" gap={2}>
                    <Box>
                      <Text fontSize="xs" color="gray.500">Override Amount (₦)</Text>
                      <Input
                        size="sm"
                        type="number"
                        value={refundOverrideAmount}
                        onChange={(e) => setRefundOverrideAmount(Number(e.target.value))}
                        max={refundPreview.amountPaid}
                        min={0}
                      />
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.500">Override Reason (Mandatory) *</Text>
                      <Input
                        size="sm"
                        placeholder="e.g. Approved by General Manager"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                      />
                    </Box>
                  </VStack>
                )}
              </Box>
            )}

            {pmt?.gateway === "paystack" && (
              <Box mb={4}>
                <HStack>
                  <input
                    type="checkbox"
                    id="forceManual"
                    checked={forceManualRefund}
                    onChange={(e) => setForceManualRefund(e.target.checked)}
                  />
                  <label htmlFor="forceManual" style={{ fontSize: "12px", color: "#4A5568", cursor: "pointer" }}>
                    Refund manually via bank transfer instead of Paystack
                  </label>
                </HStack>
              </Box>
            )}

            <HStack justify="flex-end" gap={3}>
              <Button size="sm" variant="ghost" onClick={() => setShowCancelModal(false)}>
                Keep Reservation
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                onClick={handleSubmitCancel}
                loading={actionLoading}
                disabled={refundOverrideEnabled && !overrideReason.trim()}
              >
                Confirm Cancellation
              </Button>
            </HStack>
          </Box>
        </Box>
      )}

      {/* PROCESS MANUAL REFUND OUTCOME MODAL */}
      {showRefundOutcomeModal && (
        <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={200} display="flex" alignItems="center" justifyContent="center" p={4}>
          <Box bg="white" maxW="480px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Heading size="md" mb={2}>Record Refund Outcome</Heading>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Process manual refund of <strong>{formatNgn(pmt?.refund_amount || pmt?.amount || 0)}</strong>.
            </Text>

            <VStack align="stretch" gap={3} mb={6} fontSize="sm">
              <Box>
                <Text color="gray.500" mb={1}>Action</Text>
                <select
                  style={{
                    height: "32px",
                    padding: "0 8px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E0",
                    background: "white",
                    color: "#2D3748",
                    width: "100%",
                  }}
                  value={refundOutcomeAction}
                  onChange={(e) => setRefundOutcomeAction(e.target.value as any)}
                >
                  <option value="mark_processed">Mark as Processed (Paid to Guest)</option>
                  <option value="mark_failed">Mark as Failed</option>
                  {pmt?.gateway === "paystack" && <option value="retry_paystack">Retry Paystack Refund</option>}
                </select>
              </Box>

              {refundOutcomeAction === "mark_processed" && (
                <>
                  <Box>
                    <Text color="gray.500" mb={1}>Transfer Reference / Session ID</Text>
                    <Input
                      size="sm"
                      value={refundOutcomeRef}
                      onChange={(e) => setRefundOutcomeRef(e.target.value)}
                      placeholder="e.g. NIP/ZENITH/109283921"
                    />
                  </Box>
                  <SimpleGrid columns={2} gap={2}>
                    <Box>
                      <Text color="gray.500" mb={1}>Bank Name</Text>
                      <Input
                        size="sm"
                        value={refundBankName}
                        onChange={(e) => setRefundBankName(e.target.value)}
                        placeholder="e.g. Access Bank"
                      />
                    </Box>
                    <Box>
                      <Text color="gray.500" mb={1}>Account Last 4</Text>
                      <Input
                        size="sm"
                        maxLength={4}
                        value={refundAccountLast4}
                        onChange={(e) => setRefundAccountLast4(e.target.value)}
                        placeholder="e.g. 4821"
                      />
                    </Box>
                  </SimpleGrid>
                </>
              )}

              <Box>
                <Text color="gray.500" mb={1}>Note</Text>
                <Textarea
                  size="sm"
                  value={refundOutcomeNote}
                  onChange={(e) => setRefundOutcomeNote(e.target.value)}
                  placeholder="Optional internal note"
                />
              </Box>
            </VStack>

            <HStack justify="flex-end" gap={3}>
              <Button size="sm" variant="ghost" onClick={() => setShowRefundOutcomeModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="purple"
                onClick={handleSubmitRefundOutcome}
                loading={actionLoading}
              >
                Submit Refund Outcome
              </Button>
            </HStack>
          </Box>
        </Box>
      )}
    </AdminLayout>
  );
}
