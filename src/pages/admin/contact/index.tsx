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
import { FaEnvelope, FaCheckCircle, FaExclamationCircle, FaReply, FaUser } from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import type { ContactStatus } from "@/types/db";
import { formatShortDate } from "@/lib/formatters/date";

interface ContactSubmissionItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  created_at: string;
}

interface ContactPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<ContactPageProps> = async (ctx) => {
  return requireAdminPage<ContactPageProps>(ctx, [
    "content_manager",
    "resort_admin",
    "super_admin",
  ]);
};

export default function AdminContactPage({ adminUser }: ContactPageProps) {
  const [submissions, setSubmissions] = useState<ContactSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactSubmissionItem | null>(null);
  const [editStatus, setEditStatus] = useState<ContactStatus>("new");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all" ? "/api/v1/contact" : `/api/v1/contact?status=${statusFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setSubmissions(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleUpdateStatus = async (status: ContactStatus) => {
    if (!selectedMessage) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/contact/${selectedMessage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Message status updated to '${status}'.` });
        setSelectedMessage(null);
        await fetchSubmissions();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to update status.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error updating message status." });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: ContactStatus) => {
    switch (status) {
      case "new":
        return "blue";
      case "read":
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
      title="Contact Messages"
      user={adminUser}
      breadcrumbs={[{ label: "Contact Messages" }]}
    >
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Guest Inquiries & Messages
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Direct messages submitted via the public Contact page and inquiries inbox.
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
          <option value="all">All Message Statuses</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="responded">Responded</option>
          <option value="closed">Closed</option>
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
        ) : submissions.length === 0 ? (
          <VStack py={12} px={4}>
            <Icon as={FaEnvelope} boxSize={8} color="gray.400" mb={2} />
            <Text fontWeight="semibold" color="gray.700">
              No contact messages received
            </Text>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Sender</Table.ColumnHeader>
                  <Table.ColumnHeader>Subject</Table.ColumnHeader>
                  <Table.ColumnHeader>Date Received</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Action</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {submissions.map((sub) => (
                  <Table.Row key={sub.id}>
                    <Table.Cell>
                      <Box>
                        <Text fontWeight="semibold">{sub.name}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {sub.email}
                        </Text>
                      </Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontWeight="medium" fontSize="xs" lineClamp={1}>
                        {sub.subject}
                      </Text>
                    </Table.Cell>
                    <Table.Cell fontSize="xs">{formatShortDate(sub.created_at)}</Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={getStatusColor(sub.status)}
                        textTransform="uppercase"
                        fontSize="10px"
                      >
                        {sub.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Button
                        size="xs"
                        variant="outline"
                        colorPalette="blue"
                        onClick={() => {
                          setSelectedMessage(sub);
                          setEditStatus(sub.status);
                        }}
                      >
                        View Message
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      {/* MESSAGE VIEWER MODAL */}
      {selectedMessage && (
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
          <Box bg="white" maxW="560px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Flex
              justify="space-between"
              align="center"
              mb={4}
              pb={2}
              borderBottom="1px solid"
              borderColor="gray.100"
            >
              <Heading size="sm">{selectedMessage.subject}</Heading>
              <Button size="xs" variant="ghost" onClick={() => setSelectedMessage(null)}>
                Close
              </Button>
            </Flex>

            <VStack gap={3} align="stretch" mb={4} fontSize="sm">
              <HStack>
                <Icon as={FaUser} color="gray.400" boxSize={3.5} />
                <Text fontWeight="semibold" color="gray.800">
                  {selectedMessage.name}
                </Text>
                <Text color="gray.500">({selectedMessage.email})</Text>
              </HStack>

              {selectedMessage.phone && (
                <Text fontSize="xs" color="gray.600">
                  Phone: {selectedMessage.phone}
                </Text>
              )}

              <Box bg="gray.50" p={4} borderRadius="md" mt={2}>
                <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap" lineHeight="1.6">
                  {selectedMessage.message}
                </Text>
              </Box>
            </VStack>

            <Flex
              justify="space-between"
              align="center"
              pt={4}
              borderTop="1px solid"
              borderColor="gray.100"
            >
              <HStack gap={2}>
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <Button size="xs" colorPalette="blue">
                    <HStack gap={1}>
                      <Icon as={FaReply} boxSize={2.5} />
                      <Text>Reply via Email</Text>
                    </HStack>
                  </Button>
                </a>
              </HStack>

              <HStack gap={2}>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ContactStatus)}
                  style={{
                    height: "28px",
                    padding: "0 8px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E0",
                    background: "white",
                  }}
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="responded">Responded</option>
                  <option value="closed">Closed</option>
                </select>
                <Button
                  size="xs"
                  colorPalette="green"
                  onClick={() => handleUpdateStatus(editStatus)}
                  loading={saving}
                >
                  Save Status
                </Button>
              </HStack>
            </Flex>
          </Box>
        </Box>
      )}
    </AdminLayout>
  );
}
