import React, { useState, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Button,
  Icon,
  Spinner,
  Table,
} from "@chakra-ui/react";
import { FaNewspaper, FaFileCsv } from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import { formatShortDate } from "@/lib/formatters/date";

interface SubscriberItem {
  id: string;
  email: string;
  is_confirmed: boolean;
  confirmed_at?: string | null;
  unsubscribed_at?: string | null;
  created_at: string;
}

interface NewsletterPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<NewsletterPageProps> = async (ctx) => {
  return requireAdminPage<NewsletterPageProps>(ctx, [
    "content_manager",
    "resort_admin",
    "super_admin",
  ]);
};

export default function AdminNewsletterPage({ adminUser }: NewsletterPageProps) {
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [confirmedFilter, setConfirmedFilter] = useState("all");

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        confirmedFilter === "all"
          ? "/api/v1/newsletter"
          : `/api/v1/newsletter?confirmed=${confirmedFilter === "confirmed" ? "true" : "false"}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setSubscribers(json.data);
        setTotalCount(json.meta?.total ?? json.data.length);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [confirmedFilter]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const handleExportCsv = () => {
    window.open("/api/v1/newsletter?format=csv", "_blank");
  };

  const confirmedCount = subscribers.filter((s) => s.is_confirmed).length;

  return (
    <AdminLayout
      title="Newsletter Subscribers"
      user={adminUser}
      breadcrumbs={[{ label: "Newsletter" }]}
    >
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Newsletter Subscribers
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Audience mailing list with NDPR double opt-in confirmation tracking.
          </Text>
        </Box>

        <HStack gap={2}>
          <Button size="sm" variant="outline" colorPalette="blue" onClick={handleExportCsv}>
            <HStack gap={1}>
              <Icon as={FaFileCsv} boxSize={3.5} />
              <Text>Export to CSV</Text>
            </HStack>
          </Button>

          <select
            value={confirmedFilter}
            onChange={(e) => setConfirmedFilter(e.target.value)}
            style={{
              height: "36px",
              padding: "0 12px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              background: "white",
            }}
          >
            <option value="all">All Subscribers</option>
            <option value="confirmed">Confirmed (Double Opt-In)</option>
            <option value="unconfirmed">Pending Confirmation</option>
          </select>
        </HStack>
      </Flex>

      {/* Metrics Row */}
      <Flex gap={4} mb={6} flexWrap="wrap">
        <Box
          bg="white"
          p={4}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          flex="1"
          minW="180px"
        >
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="bold">
            Total In Database
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="gray.800" mt={1}>
            {totalCount}
          </Text>
        </Box>
        <Box
          bg="white"
          p={4}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          flex="1"
          minW="180px"
        >
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="bold">
            Confirmed Active
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="green.600" mt={1}>
            {confirmedCount}
          </Text>
        </Box>
      </Flex>

      <Box
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="sm"
        overflow="hidden"
      >
        {loading ? (
          <Flex justify="center" p={12}>
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : subscribers.length === 0 ? (
          <VStack py={12} px={4}>
            <Icon as={FaNewspaper} boxSize={8} color="gray.400" mb={2} />
            <Text fontWeight="semibold" color="gray.700">
              No subscribers registered
            </Text>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Subscriber Email</Table.ColumnHeader>
                  <Table.ColumnHeader>Double Opt-In Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Subscribed Date</Table.ColumnHeader>
                  <Table.ColumnHeader>Confirmed Date</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {subscribers.map((s) => (
                  <Table.Row key={s.id}>
                    <Table.Cell fontWeight="semibold">{s.email}</Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={s.is_confirmed ? "green" : "yellow"}
                        textTransform="uppercase"
                        fontSize="10px"
                      >
                        {s.is_confirmed ? "Confirmed" : "Pending Verification"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell fontSize="xs">{formatShortDate(s.created_at)}</Table.Cell>
                    <Table.Cell fontSize="xs">
                      {s.confirmed_at ? formatShortDate(s.confirmed_at) : "—"}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>
    </AdminLayout>
  );
}
