import React, { useState, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  Spinner,
  Table,
} from "@chakra-ui/react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaTrash,
  FaPlus,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminDialog } from "@/components/admin/AdminDialog";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import { formatNgn } from "@/lib/formatters/currency";

interface SeasonalPriceItem {
  id: string;
  room_type_id: string;
  start_date: string;
  end_date: string;
  price: number;
  label: string;
  created_at?: string;
}

interface PricingPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<PricingPageProps> = async (ctx) => {
  return requireAdminPage<PricingPageProps>(ctx, ["resort_admin", "super_admin"]);
};

export default function AdminSeasonalPricingPage({ adminUser }: PricingPageProps) {
  const router = useRouter();
  const { id } = router.query;

  const [roomName, setRoomName] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [prices, setPrices] = useState<SeasonalPriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // New seasonal price form fields
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState<number>(0);

  const fetchPricing = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    setLoading(true);
    try {
      const [roomRes, pricingRes] = await Promise.all([
        fetch(`/api/v1/rooms/${id}`),
        fetch(`/api/v1/rooms/${id}/pricing`),
      ]);

      const roomJson = await roomRes.json();
      if (roomRes.ok && roomJson.success && roomJson.data) {
        setRoomName(roomJson.data.name || "");
        setBasePrice(roomJson.data.base_price ?? roomJson.data.basePrice ?? 0);
      }

      const pricingJson = await pricingRes.json();
      if (pricingRes.ok && pricingJson.success && Array.isArray(pricingJson.data)) {
        setPrices(pricingJson.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !startDate || !endDate || price <= 0) {
      setFeedback({ type: "error", message: "Please fill out all fields with a valid price." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/rooms/${id}/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          start_date: startDate,
          end_date: endDate,
          price: Number(price),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: "Seasonal price period created!" });
        setShowAddModal(false);
        setLabel("");
        setStartDate("");
        setEndDate("");
        setPrice(0);
        await fetchPricing();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to create seasonal price.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error saving seasonal price." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrice = async (pricingId: string) => {
    const confirmed = await adminDialog.confirm({
      title: "Remove seasonal rate?",
      message:
        "Bookings for these dates will use the suite's base price again. Existing bookings keep the price they were booked at.",
      confirmLabel: "Remove Rate",
    });
    if (!confirmed) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/rooms/${id}/pricing/${pricingId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({ type: "success", message: "Seasonal price removed." });
        await fetchPricing();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to delete seasonal price.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error deleting seasonal price." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={`Seasonal Rates: ${roomName || "Loading..."}`}
      user={adminUser}
      breadcrumbs={[
        { label: "Rooms & Suites", href: "/admin/rooms" },
        { label: roomName || "Suite", href: `/admin/rooms/${id}/edit` },
        { label: "Seasonal Pricing" },
      ]}
    >
      <Box maxW="900px" mx="auto">
        <HStack mb={4} justify="space-between">
          <Button size="xs" variant="ghost" onClick={() => router.push("/admin/rooms")}>
            <HStack gap={1}>
              <Icon as={FaArrowLeft} boxSize={3} />
              <Text>Back to Rooms</Text>
            </HStack>
          </Button>

          <Button
            size="xs"
            colorPalette="blue"
            onClick={() => {
              setPrice(basePrice);
              setShowAddModal(true);
            }}
          >
            <HStack gap={1}>
              <Icon as={FaPlus} boxSize={3} />
              <Text>Add Seasonal Rate</Text>
            </HStack>
          </Button>
        </HStack>

        <Box
          bg="white"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          boxShadow="sm"
        >
          <HStack
            justify="space-between"
            mb={4}
            pb={3}
            borderBottom="1px solid"
            borderColor="gray.100"
          >
            <Box>
              <Heading size="md" color="gray.800">
                Seasonal Rates — {roomName}
              </Heading>
              <Text fontSize="xs" color="gray.500">
                Standard base rate: {formatNgn(basePrice)} / night. Date-range overrides take
                precedence.
              </Text>
            </Box>
          </HStack>

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

          {loading ? (
            <Flex justify="center" p={12}>
              <Spinner size="lg" color="blue.500" />
            </Flex>
          ) : prices.length === 0 ? (
            <VStack py={12} px={4} bg="gray.50" borderRadius="md">
              <Icon as={FaCalendarAlt} boxSize={8} color="gray.400" mb={2} />
              <Text fontWeight="semibold" color="gray.700">
                No seasonal price overrides set
              </Text>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                This room will always be booked at its standard base rate of {formatNgn(basePrice)}.
              </Text>
            </VStack>
          ) : (
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header bg="gray.50">
                  <Table.Row>
                    <Table.ColumnHeader>Season / Label</Table.ColumnHeader>
                    <Table.ColumnHeader>Start Date</Table.ColumnHeader>
                    <Table.ColumnHeader>End Date</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Nightly Rate</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {prices.map((p) => (
                    <Table.Row key={p.id}>
                      <Table.Cell fontWeight="semibold">{p.label}</Table.Cell>
                      <Table.Cell fontSize="xs">{p.start_date}</Table.Cell>
                      <Table.Cell fontSize="xs">{p.end_date}</Table.Cell>
                      <Table.Cell textAlign="right" fontWeight="bold" color="blue.600">
                        {formatNgn(p.price)}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          aria-label={`Delete seasonal rate ${p.label || p.start_date}`}
                          onClick={() => handleDeletePrice(p.id)}
                          loading={saving}
                        >
                          <Icon as={FaTrash} boxSize={3} />
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Box>
      </Box>

      {/* ADD SEASONAL RATE MODAL */}
      {showAddModal && (
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
          <Box bg="white" maxW="480px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm">Add Seasonal Price Override</Heading>
              <Button size="xs" variant="ghost" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
            </Flex>

            <form onSubmit={handleAddPrice}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Period Label *
                  </Text>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Christmas Peak 2026, Easter Retreat"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                    }}
                  />
                </Box>

                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Start Date *
                    </Text>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E0",
                        fontSize: "14px",
                      }}
                    />
                  </Box>

                  <Box flex="1">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      End Date *
                    </Text>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E0",
                        fontSize: "14px",
                      }}
                    />
                  </Box>
                </Flex>

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Override Rate (₦/night) *
                  </Text>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                    }}
                  />
                </Box>

                <Flex
                  justify="flex-end"
                  gap={2}
                  pt={3}
                  borderTop="1px solid"
                  borderColor="gray.100"
                >
                  <Button size="sm" variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" colorPalette="blue" type="submit" loading={saving}>
                    Save Rate
                  </Button>
                </Flex>
              </VStack>
            </form>
          </Box>
        </Box>
      )}
    </AdminLayout>
  );
}
