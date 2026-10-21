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
  FaTags,
  FaPlus,
  FaCheckCircle,
  FaExclamationCircle,
  FaTrash,
  FaEdit,
  FaMagic,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminDialog } from "@/components/admin/AdminDialog";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import { formatNgn } from "@/lib/formatters/currency";
import { formatShortDate } from "@/lib/formatters/date";

interface DealItem {
  id: string;
  title: string;
  promoCode?: string | null;
  promo_code?: string | null;
  discountType?: string;
  discount_type?: string;
  discountValue?: number;
  discount_value?: number;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  isActive?: boolean;
  is_active?: boolean;
  description?: string | null;
}

interface DealsPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<DealsPageProps> = async (ctx) => {
  return requireAdminPage<DealsPageProps>(ctx, ["content_manager", "resort_admin", "super_admin"]);
};

export default function AdminDealsPage({ adminUser }: DealsPageProps) {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // New deal form fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/deals");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setDeals(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const generatePromoCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "GAR-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoCode(code);
  };

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setPromoCode("");
    setDiscountType("percentage");
    setDiscountValue(10);
    setStartDate("");
    setEndDate("");
    setDescription("");
    setShowAddModal(true);
  };

  const openEdit = (deal: DealItem) => {
    setEditingId(deal.id);
    setTitle(deal.title);
    setPromoCode(deal.promoCode ?? deal.promo_code ?? "");
    setDiscountType(
      ((deal.discountType ?? deal.discount_type) as "percentage" | "fixed") || "percentage"
    );
    setDiscountValue(Number(deal.discountValue ?? deal.discount_value ?? 0));
    setStartDate((deal.startDate ?? deal.start_date ?? "").slice(0, 10));
    setEndDate((deal.endDate ?? deal.end_date ?? "").slice(0, 10));
    setDescription(deal.description || "");
    setShowAddModal(true);
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate || discountValue <= 0 || !description.trim()) {
      setFeedback({ type: "error", message: "All fields are required." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(editingId ? `/api/v1/deals/${editingId}` : "/api/v1/deals", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          promo_code: promoCode.trim() ? promoCode.trim().toUpperCase() : null,
          discount_type: discountType,
          discount_value: Number(discountValue),
          start_date: startDate,
          end_date: endDate,
          description: description.trim(),
          // Editing keeps the current active state; use Activate/Deactivate to change it
          ...(editingId ? {} : { is_active: true }),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `Deal '${title}' ${editingId ? "updated" : "created"}.`,
        });
        setShowAddModal(false);
        setEditingId(null);
        setTitle("");
        setPromoCode("");
        setDescription("");
        setStartDate("");
        setEndDate("");
        await fetchDeals();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to save deal.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (deal: DealItem) => {
    const currentActive = deal.isActive ?? deal.is_active ?? true;
    const newActive = !currentActive;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/deals/${deal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `Deal '${deal.title}' is now ${newActive ? "active" : "inactive"}.`,
        });
        await fetchDeals();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to update deal status.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error updating deal." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, dealTitle: string) => {
    const confirmed = await adminDialog.confirm({
      title: "Delete deal?",
      message: `'${dealTitle}' will be removed and its promo code will stop working. This cannot be undone.`,
      confirmLabel: "Delete Deal",
    });
    if (!confirmed) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/deals/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Deal '${dealTitle}' deleted.` });
        await fetchDeals();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to delete deal.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error deleting deal." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Deals & Offers"
      user={adminUser}
      breadcrumbs={[{ label: "Deals & Promos" }]}
    >
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Deals & Promotional Offers
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Create discount packages, promo codes, and limited-time getaway deals.
          </Text>
        </Box>

        <Button size="sm" colorPalette="blue" onClick={openCreate}>
          <HStack gap={1}>
            <Icon as={FaPlus} boxSize={3} />
            <Text>Add Deal</Text>
          </HStack>
        </Button>
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
        ) : deals.length === 0 ? (
          <VStack py={12} px={4}>
            <Icon as={FaTags} boxSize={8} color="gray.400" mb={2} />
            <Text fontWeight="semibold" color="gray.700">
              No active promotional deals
            </Text>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Deal Title</Table.ColumnHeader>
                  <Table.ColumnHeader>Promo Code</Table.ColumnHeader>
                  <Table.ColumnHeader>Discount</Table.ColumnHeader>
                  <Table.ColumnHeader>Valid Dates</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {deals.map((d) => {
                  const code = d.promoCode || d.promo_code;
                  const dtype = d.discountType || d.discount_type;
                  const dval = d.discountValue ?? d.discount_value ?? 0;
                  const sdate = d.startDate || d.start_date;
                  const edate = d.endDate || d.end_date;
                  const active = d.isActive ?? d.is_active ?? true;

                  return (
                    <Table.Row key={d.id}>
                      <Table.Cell fontWeight="semibold">{d.title}</Table.Cell>
                      <Table.Cell>
                        {code ? (
                          <Badge colorPalette="blue" fontSize="10px">
                            {code}
                          </Badge>
                        ) : (
                          <Text fontSize="xs" color="gray.400">
                            Automatic
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell fontWeight="bold" color="green.600">
                        {dtype === "percentage" ? `${dval}% OFF` : `${formatNgn(dval)} OFF`}
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        {sdate && edate
                          ? `${formatShortDate(sdate)} to ${formatShortDate(edate)}`
                          : "Ongoing"}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          colorPalette={active ? "green" : "gray"}
                          textTransform="uppercase"
                          fontSize="10px"
                        >
                          {active ? "Active" : "Inactive"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <HStack gap={2} justify="flex-end">
                          <Button
                            size="xs"
                            variant="outline"
                            colorPalette={active ? "orange" : "green"}
                            onClick={() => handleToggleActive(d)}
                            loading={saving}
                          >
                            {active ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            aria-label={`Edit deal ${d.title}`}
                            onClick={() => openEdit(d)}
                            disabled={saving}
                          >
                            <Icon as={FaEdit} boxSize={3} />
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            colorPalette="red"
                            aria-label={`Delete deal ${d.title}`}
                            onClick={() => handleDelete(d.id, d.title)}
                            disabled={saving}
                          >
                            <Icon as={FaTrash} boxSize={3} />
                          </Button>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      {/* ADD DEAL MODAL */}
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
          <Box bg="white" maxW="500px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm">
                {editingId ? "Edit Promotional Deal" : "Create Promotional Deal"}
              </Heading>
              <Button size="xs" variant="ghost" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
            </Flex>

            <form onSubmit={handleSaveDeal}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Deal Title *
                  </Text>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Easter Family Sanctuary Getaway"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                    }}
                  />
                </Box>

                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" fontWeight="bold" color="gray.700">
                      Promo Code (Optional)
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="blue"
                      onClick={generatePromoCode}
                    >
                      <HStack gap={1}>
                        <Icon as={FaMagic} boxSize={2.5} />
                        <Text>Generate</Text>
                      </HStack>
                    </Button>
                  </HStack>
                  <input
                    type="text"
                    placeholder="e.g. EASTER2026 (or auto-discount)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
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
                      Discount Type *
                    </Text>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E0",
                        fontSize: "14px",
                        background: "white",
                      }}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₦)</option>
                    </select>
                  </Box>

                  <Box flex="1">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Value *
                    </Text>
                    <input
                      type="number"
                      min="1"
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
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
                    Description *
                  </Text>
                  <textarea
                    required
                    rows={3}
                    placeholder="Offer inclusions, conditions, and special perks..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                    {editingId ? "Save Changes" : "Create Deal"}
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
