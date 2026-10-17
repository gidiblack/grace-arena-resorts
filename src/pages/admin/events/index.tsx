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
import {
  FaGlassCheers,
  FaCheckCircle,
  FaExclamationCircle,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import type { InquiryStatus } from "@/types/db";

interface InquiryItem {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  preferred_date?: string | null;
  estimated_guests?: number | null;
  special_requirements?: string | null;
  status: InquiryStatus;
  created_at: string;
  event_categories?: { name?: string };
}

interface EventsPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<EventsPageProps> = async (ctx) => {
  return requireAdminPage<EventsPageProps>(ctx, ["content_manager", "resort_admin", "super_admin"]);
};

export default function AdminEventsPage({ adminUser }: EventsPageProps) {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryItem | null>(null);
  const [editStatus, setEditStatus] = useState<InquiryStatus>("new");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/v1/events/inquiries"
          : `/api/v1/events/inquiries?status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setInquiries(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/events/inquiries/${selectedInquiry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `Inquiry status updated to '${editStatus}'.`,
        });
        setSelectedInquiry(null);
        await fetchInquiries();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to update inquiry status.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error updating inquiry." });
    } finally {
      setSaving(false);
    }
  };

  const statusBadgeColor = (status: InquiryStatus) => {
    switch (status) {
      case "new":
        return "blue";
      case "in_review":
        return "yellow";
      case "responded":
        return "purple";
      case "closed":
        return "green";
      default:
        return "gray";
    }
  };

  return (
    <AdminLayout
      title="Events & Inquiries"
      user={adminUser}
      breadcrumbs={[{ label: "Events & Inquiries" }]}
    >
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Event Inquiries & Coordination
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Track retreat requests, weddings, media shoot proposals, and team-building inquiries.
          </Text>
        </Box>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: "36px",
            padding: "0 12px",
            fontSize: "13px",
            borderRadius: "6px",
            border: "1px solid #CBD5E0",
            background: "white",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="new">New (Unreviewed)</option>
          <option value="in_review">In Review</option>
          <option value="responded">Responded</option>
          <option value="closed">Closed / Finalized</option>
        </select>
      </Flex>

      {feedback && (
        <Box
          bg={feedback.type === "success" ? "green.50" : "red.50"}
          color={feedback.type === "success" ? "green.700" : "red.700"}
          p={3}
          borderRadius="md"
          mb={4}
          fontSize="sm"
          border="1px solid"
          borderColor={feedback.type === "success" ? "green.200" : "red.200"}
        >
          <HStack gap={2}>
            <Icon as={feedback.type === "success" ? FaCheckCircle : FaExclamationCircle} />
            <Text fontWeight="semibold">{feedback.message}</Text>
          </HStack>
        </Box>
      )}

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
        ) : inquiries.length === 0 ? (
          <VStack py={12} px={4}>
            <Icon as={FaGlassCheers} boxSize={8} color="gray.400" mb={2} />
            <Text fontWeight="semibold" color="gray.700">
              No event inquiries found
            </Text>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Contact Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Event Category</Table.ColumnHeader>
                  <Table.ColumnHeader>Preferred Date</Table.ColumnHeader>
                  <Table.ColumnHeader>Guests</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Action</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {inquiries.map((inq) => (
                  <Table.Row key={inq.id}>
                    <Table.Cell>
                      <Box>
                        <Text fontWeight="semibold">{inq.contact_name}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {inq.contact_email}
                        </Text>
                      </Box>
                    </Table.Cell>
                    <Table.Cell fontSize="xs">
                      <Badge variant="subtle" colorPalette="blue">
                        {inq.event_categories?.name || "Event Package"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell fontSize="xs">{inq.preferred_date || "Flexible"}</Table.Cell>
                    <Table.Cell fontSize="xs">
                      {inq.estimated_guests ? `${inq.estimated_guests} guests` : "—"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={statusBadgeColor(inq.status)}
                        textTransform="uppercase"
                        fontSize="10px"
                      >
                        {inq.status.replace("_", " ")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="blue"
                        onClick={() => {
                          setSelectedInquiry(inq);
                          setEditStatus(inq.status);
                        }}
                      >
                        Review
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      {/* INQUIRY DETAIL & STATUS MODAL */}
      {selectedInquiry && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={200}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
        >
          <Box bg="white" maxW="540px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Flex
              justify="space-between"
              align="center"
              mb={4}
              pb={2}
              borderBottom="1px solid"
              borderColor="gray.100"
            >
              <Heading size="sm">Inquiry from {selectedInquiry.contact_name}</Heading>
              <Button size="xs" variant="ghost" onClick={() => setSelectedInquiry(null)}>
                Close
              </Button>
            </Flex>

            <VStack gap={3} align="stretch" mb={4} fontSize="sm">
              <HStack>
                <Icon as={FaEnvelope} color="gray.400" boxSize={3.5} />
                <Text color="gray.700">Email: {selectedInquiry.contact_email}</Text>
              </HStack>
              <HStack>
                <Icon as={FaPhone} color="gray.400" boxSize={3.5} />
                <Text color="gray.700">Phone: {selectedInquiry.contact_phone}</Text>
              </HStack>
              <HStack>
                <Icon as={FaCalendarAlt} color="gray.400" boxSize={3.5} />
                <Text color="gray.700">
                  Date: {selectedInquiry.preferred_date || "Not specified"} (
                  {selectedInquiry.estimated_guests || 0} guests)
                </Text>
              </HStack>

              <Box bg="gray.50" p={3} borderRadius="md" mt={2}>
                <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                  Special Requirements & Notes:
                </Text>
                <Text fontSize="xs" color="gray.700" whiteSpace="pre-wrap">
                  {selectedInquiry.special_requirements || "No additional requirements noted."}
                </Text>
              </Box>
            </VStack>

            <form onSubmit={handleUpdateStatus}>
              <Box mb={4}>
                <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                  Update Status
                </Text>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as InquiryStatus)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E0",
                    fontSize: "14px",
                    background: "white",
                  }}
                >
                  <option value="new">New</option>
                  <option value="in_review">In Review</option>
                  <option value="responded">Responded</option>
                  <option value="closed">Closed</option>
                </select>
              </Box>

              <Flex justify="flex-end" gap={2} pt={3} borderTop="1px solid" borderColor="gray.100">
                <Button size="sm" variant="outline" onClick={() => setSelectedInquiry(null)}>
                  Cancel
                </Button>
                <Button size="sm" colorPalette="blue" type="submit" loading={saving}>
                  Save Status
                </Button>
              </Flex>
            </form>
          </Box>
        </Box>
      )}
    </AdminLayout>
  );
}
