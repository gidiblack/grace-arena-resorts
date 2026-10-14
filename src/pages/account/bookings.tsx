import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Box,
  Flex,
  HStack,
  Stack,
  Text,
  Spinner,
} from "@chakra-ui/react";
import AccountLayout from "@/features/account/components/AccountLayout";
import BookingCard, { BookingRecord } from "@/features/account/components/BookingCard";
import Button from "@/components/ui/button";

type FilterTab = "all" | "active" | "pending" | "past" | "cancelled";

export default function AccountBookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/bookings?limit=50");
      const json = await res.json();
      if (res.ok && json.success) {
        setBookings(json.data || []);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filteredBookings = useMemo(() => {
    switch (activeFilter) {
      case "active":
        return bookings.filter((b) => b.status === "confirmed" || b.status === "checked_in");
      case "pending":
        return bookings.filter((b) => b.status === "pending");
      case "past":
        return bookings.filter((b) => b.status === "checked_out");
      case "cancelled":
        return bookings.filter((b) => b.status === "cancelled" || b.status === "no_show");
      case "all":
      default:
        return bookings;
    }
  }, [bookings, activeFilter]);

  return (
    <AccountLayout title="My Reservations" activeTab="bookings">
      {/* Filter Tabs */}
      <HStack gap={2} mb={6} overflowX="auto" pb={2}>
        <Button
          variant={activeFilter === "all" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          All ({bookings.length})
        </Button>
        <Button
          variant={activeFilter === "active" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setActiveFilter("active")}
        >
          Confirmed &amp; Active (
          {bookings.filter((b) => b.status === "confirmed" || b.status === "checked_in").length}
          )
        </Button>
        <Button
          variant={activeFilter === "pending" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setActiveFilter("pending")}
        >
          Pending Payment ({bookings.filter((b) => b.status === "pending").length})
        </Button>
        <Button
          variant={activeFilter === "past" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setActiveFilter("past")}
        >
          Past Visits ({bookings.filter((b) => b.status === "checked_out").length})
        </Button>
        <Button
          variant={activeFilter === "cancelled" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setActiveFilter("cancelled")}
        >
          Cancelled ({bookings.filter((b) => b.status === "cancelled" || b.status === "no_show").length})
        </Button>
      </HStack>

      {/* Bookings List */}
      {loading ? (
        <Flex justify="center" py={16}>
          <Spinner color="accent.500" size="xl" />
        </Flex>
      ) : filteredBookings.length === 0 ? (
        <Box
          bg="#0F172A"
          p={10}
          borderRadius="20px"
          border="1px solid #1E293B"
          textAlign="center"
        >
          <Text fontSize="18px" fontWeight="bold" mb={2}>
            No Reservations Found
          </Text>
          <Text fontSize="13px" color="gray.400" mb={6}>
            {activeFilter === "all"
              ? "You do not have any reservations registered under your account."
              : `You have no ${activeFilter} reservations.`}
          </Text>
          <Link href="/booking" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="md">
              Book a New Stay
            </Button>
          </Link>
        </Box>
      ) : (
        <Stack gap={3}>
          {filteredBookings.map((b) => (
            <BookingCard key={b.id} booking={b} onRefresh={fetchBookings} />
          ))}
        </Stack>
      )}
    </AccountLayout>
  );
}
