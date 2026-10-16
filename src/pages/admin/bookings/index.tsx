import React, { useState, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import NextLink from "next/link";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Heading,
  Table,
  Badge,
  Input,
  Button,
  Spinner,
  Icon,
} from "@chakra-ui/react";
import { FaPlus, FaUndo, FaExclamationTriangle } from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import { formatNgn } from "@/lib/formatters/currency";

interface AdminBookingsPageProps {
  adminUser: AdminUserSession;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "green",
  pending: "yellow",
  checked_in: "blue",
  checked_out: "gray",
  cancelled: "red",
  no_show: "orange",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  success: "green",
  pending: "yellow",
  refund_pending: "purple",
  refunded: "gray",
  partially_refunded: "cyan",
  refund_failed: "red",
};

interface AdminBookingRow {
  id: string;
  reference: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  total: number;
  status: string;
  channel?: string;
  created_at: string;
  payments?: Array<{
    id: string;
    gateway?: string;
    status?: string;
    amount?: number;
  }>;
  booking_line_items?: Array<{
    room_types?: {
      name?: string;
    };
  }>;
  [key: string]: unknown;
}

export const getServerSideProps: GetServerSideProps<AdminBookingsPageProps> = async (ctx) => {
  return requireAdminPage<AdminBookingsPageProps>(ctx, [
    "content_manager",
    "resort_admin",
    "super_admin",
  ]);
};

export default function AdminBookingsPage({ adminUser }: AdminBookingsPageProps) {
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [checkInFrom, setCheckInFrom] = useState("");
  const [checkInTo, setCheckInTo] = useState("");
  const [isRefundsToProcessQuickFilter, setIsRefundsToProcessQuickFilter] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");

      if (isRefundsToProcessQuickFilter) {
        params.set("paymentStatus", "refund_pending");
      } else {
        if (status !== "all") params.set("status", status);
        if (channel !== "all") params.set("channel", channel);
        if (paymentStatus !== "all") params.set("paymentStatus", paymentStatus);
        if (checkInFrom) params.set("checkInFrom", checkInFrom);
        if (checkInTo) params.set("checkInTo", checkInTo);
      }

      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/v1/bookings?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setBookings(json.data || []);
        const total = parseInt(res.headers.get("X-Total-Count") || "0", 10);
        const pages = parseInt(res.headers.get("X-Total-Pages") || "1", 10);
        setTotalCount(total || (json.data || []).length);
        setTotalPages(pages || 1);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  }, [page, status, channel, paymentStatus, checkInFrom, checkInTo, search, isRefundsToProcessQuickFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleResetFilters = () => {
    setSearch("");
    setStatus("all");
    setChannel("all");
    setPaymentStatus("all");
    setCheckInFrom("");
    setCheckInTo("");
    setIsRefundsToProcessQuickFilter(false);
    setPage(1);
  };

  const isResortAdmin = ["resort_admin", "super_admin"].includes(adminUser.role);

  return (
    <AdminLayout
      title="Bookings Management"
      user={adminUser}
      breadcrumbs={[{ label: "Bookings" }]}
    >
      <Flex justify="space-between" align={{ base: "start", md: "center" }} mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Bookings Management
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Monitor reservations, process check-ins, record offline payments and refunds.
          </Text>
        </Box>

        <HStack gap={3}>
          <Button
            size="sm"
            colorScheme={isRefundsToProcessQuickFilter ? "red" : "gray"}
            variant={isRefundsToProcessQuickFilter ? "solid" : "outline"}
            onClick={() => {
              setIsRefundsToProcessQuickFilter((prev) => !prev);
              setPage(1);
            }}
          >
            <HStack gap={1.5}>
              <Icon as={FaExclamationTriangle} color={isRefundsToProcessQuickFilter ? "white" : "red.500"} />
              <Text>Refunds to Process</Text>
            </HStack>
          </Button>

          {isResortAdmin && (
            <NextLink href="/admin/bookings/new" passHref legacyBehavior>
              <Button as="a" size="sm" colorScheme="blue">
                <HStack gap={1.5}>
                  <Icon as={FaPlus} />
                  <Text>New Booking</Text>
                </HStack>
              </Button>
            </NextLink>
          )}
        </HStack>
      </Flex>

      {/* Filter Toolbar */}
      <Box bg="white" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200" mb={6}>
        <Flex gap={3} flexWrap="wrap" align="center">
          <Box flex="1" minW="220px">
            <Input
              placeholder="Search reference, guest name, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              size="sm"
              borderRadius="md"
            />
          </Box>

          <select
            style={{
              height: "32px",
              padding: "0 8px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              background: "white",
              color: "#2D3748",
            }}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setIsRefundsToProcessQuickFilter(false);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>

          <select
            style={{
              height: "32px",
              padding: "0 8px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              background: "white",
              color: "#2D3748",
            }}
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setIsRefundsToProcessQuickFilter(false);
              setPage(1);
            }}
          >
            <option value="all">All Channels</option>
            <option value="online_guest">Online Guest</option>
            <option value="online_account">Online Account</option>
            <option value="walk_in">Walk-In / Concierge</option>
          </select>

          <select
            style={{
              height: "32px",
              padding: "0 8px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              background: "white",
              color: "#2D3748",
            }}
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setIsRefundsToProcessQuickFilter(false);
              setPage(1);
            }}
          >
            <option value="all">All Payments</option>
            <option value="success">Paid (Success)</option>
            <option value="pending">Unpaid (Pending)</option>
            <option value="refund_pending">Refund Pending</option>
            <option value="refunded">Refunded</option>
            <option value="refund_failed">Refund Failed</option>
          </select>

          <Input
            type="date"
            size="sm"
            w={{ base: "100%", sm: "140px" }}
            value={checkInFrom}
            onChange={(e) => {
              setCheckInFrom(e.target.value);
              setPage(1);
            }}
            title="Check-in from"
          />

          <Input
            type="date"
            size="sm"
            w={{ base: "100%", sm: "140px" }}
            value={checkInTo}
            onChange={(e) => {
              setCheckInTo(e.target.value);
              setPage(1);
            }}
            title="Check-in to"
          />

          <Button size="sm" variant="ghost" onClick={handleResetFilters}>
            <HStack gap={1}>
              <Icon as={FaUndo} boxSize={3} />
              <Text>Reset</Text>
            </HStack>
          </Button>
        </Flex>
      </Box>

      {/* Bookings Table */}
      <Box
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        overflow="hidden"
        boxShadow="sm"
      >
        {loading ? (
          <Flex justify="center" align="center" p={12}>
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : bookings.length === 0 ? (
          <VStack py={12} px={4} gap={2} textAlign="center">
            <Text fontWeight="semibold" fontSize="md" color="gray.700">
              No reservations found
            </Text>
            <Text fontSize="sm" color="gray.500">
              Try adjusting your search criteria or clear active filters.
            </Text>
            <Button size="sm" mt={2} onClick={handleResetFilters}>
              Clear Filters
            </Button>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader py={3}>Reference</Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Guest</Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Channel</Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Dates</Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Rooms</Table.ColumnHeader>
                  <Table.ColumnHeader py={3} textAlign="right">Total</Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Booking Status</Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Payment</Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Action</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {bookings.map((booking) => {
                  const pmt = (booking.payments && booking.payments[0]) || null;
                  const pmtStatus = pmt?.status || (booking.status === "confirmed" ? "success" : "pending");
                  const pmtColor = PAYMENT_STATUS_COLORS[pmtStatus] || "gray";
                  const statusColor = STATUS_COLORS[booking.status] || "gray";

                  return (
                    <Table.Row key={booking.id} _hover={{ bg: "gray.50" }}>
                      <Table.Cell fontWeight="bold" color="blue.600">
                        <NextLink href={`/admin/bookings/${booking.reference}`} passHref legacyBehavior>
                          <Text as="a" cursor="pointer" _hover={{ textDecoration: "underline" }}>
                            {booking.reference}
                          </Text>
                        </NextLink>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontWeight="medium" fontSize="xs">
                          {booking.guest_name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {booking.guest_email}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant="subtle" fontSize="10px">
                          {booking.channel === "walk_in"
                            ? "Walk-In"
                            : booking.channel === "online_guest"
                              ? "Guest"
                              : "Account"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        <Text>{booking.check_in_date}</Text>
                        <Text color="gray.500">to {booking.check_out_date} ({booking.nights}n)</Text>
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        {booking.booking_line_items?.length || 1} room(s)
                      </Table.Cell>
                      <Table.Cell textAlign="right" fontWeight="semibold" fontSize="xs">
                        {formatNgn(booking.total)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorScheme={statusColor} textTransform="capitalize" fontSize="10px">
                          {booking.status.replace("_", " ")}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorScheme={pmtColor} textTransform="capitalize" fontSize="10px">
                          {pmtStatus.replace("_", " ")}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <NextLink href={`/admin/bookings/${booking.reference}`} passHref legacyBehavior>
                          <Button as="a" size="xs" variant="outline" colorScheme="blue">
                            View
                          </Button>
                        </NextLink>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        )}

        {/* Pagination Bar */}
        <Flex
          px={6}
          py={3}
          align="center"
          justify="space-between"
          borderTop="1px solid"
          borderColor="gray.200"
          bg="white"
          fontSize="xs"
          color="gray.600"
        >
          <Text>
            Showing {bookings.length} of {totalCount} bookings
          </Text>
          <HStack gap={2}>
            <Button
              size="xs"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Text>
              Page {page} of {totalPages}
            </Text>
            <Button
              size="xs"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </HStack>
        </Flex>
      </Box>
    </AdminLayout>
  );
}
