import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Box,
  Flex,
  HStack,
  Icon,
  SimpleGrid,
  Stack,
  Text,
  Spinner,
} from "@chakra-ui/react";
import AccountLayout from "@/features/account/components/AccountLayout";
import BookingCard, { BookingRecord } from "@/features/account/components/BookingCard";
import Button from "@/components/ui/button";
import {
  FaCalendarCheck,
  FaClock,
  FaBed,
  FaPlus,
  FaShieldAlt,
} from "react-icons/fa";

export default function AccountOverviewPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/bookings?limit=5");
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

  const activeStays = bookings.filter((b) => b.status === "confirmed" || b.status === "checked_in");
  const pastStays = bookings.filter((b) => b.status === "checked_out");

  return (
    <AccountLayout title="Account Overview" activeTab="overview">
      {/* Metric Cards */}
      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} mb={8}>
        <Box bg="#0F172A" p={5} borderRadius="16px" border="1px solid #1E293B">
          <HStack gap={3} mb={2}>
            <Flex w="40px" h="40px" borderRadius="10px" bg="rgba(72, 187, 120, 0.15)" align="center" justify="center">
              <Icon as={FaCalendarCheck} color="#48BB78" boxSize={5} />
            </Flex>
            <Box>
              <Text fontSize="11px" color="gray.400" textTransform="uppercase">
                Active &amp; Confirmed
              </Text>
              <Text fontSize="22px" fontWeight="extrabold" color="white">
                {activeStays.length}
              </Text>
            </Box>
          </HStack>
          <Text fontSize="12px" color="gray.400">
            Upcoming retreats and current stays
          </Text>
        </Box>

        <Box bg="#0F172A" p={5} borderRadius="16px" border="1px solid #1E293B">
          <HStack gap={3} mb={2}>
            <Flex w="40px" h="40px" borderRadius="10px" bg="rgba(252, 202, 70, 0.15)" align="center" justify="center">
              <Icon as={FaBed} color="accent.500" boxSize={5} />
            </Flex>
            <Box>
              <Text fontSize="11px" color="gray.400" textTransform="uppercase">
                Total Reservations
              </Text>
              <Text fontSize="22px" fontWeight="extrabold" color="white">
                {bookings.length}
              </Text>
            </Box>
          </HStack>
          <Text fontSize="12px" color="gray.400">
            All-time booking history
          </Text>
        </Box>

        <Box bg="#0F172A" p={5} borderRadius="16px" border="1px solid #1E293B">
          <HStack gap={3} mb={2}>
            <Flex w="40px" h="40px" borderRadius="10px" bg="rgba(99, 179, 237, 0.15)" align="center" justify="center">
              <Icon as={FaClock} color="#63B3ED" boxSize={5} />
            </Flex>
            <Box>
              <Text fontSize="11px" color="gray.400" textTransform="uppercase">
                Past Visits
              </Text>
              <Text fontSize="22px" fontWeight="extrabold" color="white">
                {pastStays.length}
              </Text>
            </Box>
          </HStack>
          <Text fontSize="12px" color="gray.400">
            Completed serene getaways
          </Text>
        </Box>
      </SimpleGrid>

      {/* Quick Action Hub */}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mb={10}>
        <Box bg="#0F172A" p={6} borderRadius="18px" border="1px solid #1E293B">
          <HStack gap={3} mb={3}>
            <Icon as={FaBed} color="accent.500" boxSize={5} />
            <Text fontSize="16px" fontWeight="bold">
              Reserve Your Next Holy Retreat
            </Text>
          </HStack>
          <Text fontSize="13px" color="gray.400" mb={4}>
            Choose between our Elysian Sanctuary suites or the Village Thatched retreat with complimentary prayer huts.
          </Text>
          <Link href="/booking" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="sm">
              <HStack gap={2}>
                <Icon as={FaPlus} />
                <Text>Start Booking Wizard</Text>
              </HStack>
            </Button>
          </Link>
        </Box>

        <Box bg="#0F172A" p={6} borderRadius="18px" border="1px solid #1E293B">
          <HStack gap={3} mb={3}>
            <Icon as={FaShieldAlt} color="accent.500" boxSize={5} />
            <Text fontSize="16px" fontWeight="bold">
              Account Security &amp; Contact
            </Text>
          </HStack>
          <Text fontSize="13px" color="gray.400" mb={4}>
            Keep your phone number up to date for SMS arrival alerts and manage your password.
          </Text>
          <Link href="/account/profile" style={{ textDecoration: "none" }}>
            <Button variant="secondary" size="sm">
              Manage Profile &rarr;
            </Button>
          </Link>
        </Box>
      </SimpleGrid>

      {/* Recent Bookings Section */}
      <Box>
        <Flex justify="space-between" align="center" mb={4}>
          <Text fontSize="18px" fontWeight="bold">
            Recent Reservations
          </Text>
          {bookings.length > 0 && (
            <Link href="/account/bookings" style={{ textDecoration: "none" }}>
              <Text fontSize="13px" color="accent.500" fontWeight="bold">
                View All &rarr;
              </Text>
            </Link>
          )}
        </Flex>

        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner color="accent.500" size="lg" />
          </Flex>
        ) : bookings.length === 0 ? (
          <Box
            bg="#0F172A"
            p={8}
            borderRadius="18px"
            border="1px solid #1E293B"
            textAlign="center"
          >
            <Text fontSize="16px" fontWeight="bold" mb={2}>
              No Bookings Found Yet
            </Text>
            <Text fontSize="13px" color="gray.400" mb={4}>
              You do not have any active or past reservations under your guest account.
            </Text>
            <Link href="/booking" style={{ textDecoration: "none" }}>
              <Button variant="primary" size="sm">
                Make Your First Reservation
              </Button>
            </Link>
          </Box>
        ) : (
          <Stack gap={3}>
            {bookings.slice(0, 3).map((b) => (
              <BookingCard key={b.id} booking={b} onRefresh={fetchBookings} />
            ))}
          </Stack>
        )}
      </Box>
    </AccountLayout>
  );
}
