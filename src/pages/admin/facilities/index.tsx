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
  FaSwimmingPool,
  FaPlus,
  FaCheckCircle,
  FaExclamationCircle,
  FaTrash,
  FaStar,
  FaEdit,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";

interface FacilityItem {
  id: string;
  name: string;
  slug?: string;
  campus?: string;
  description?: string;
  isFeatured?: boolean;
  is_featured?: boolean;
}

interface FacilitiesPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<FacilitiesPageProps> = async (ctx) => {
  return requireAdminPage<FacilitiesPageProps>(ctx, [
    "content_manager",
    "resort_admin",
    "super_admin",
  ]);
};

export default function AdminFacilitiesPage({ adminUser }: FacilitiesPageProps) {
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Facility form fields (create, or edit when editingId is set)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const fetchFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/facilities");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setFacilities(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setIsFeatured(false);
    setShowAddModal(true);
  };

  const openEdit = (facility: FacilityItem) => {
    setEditingId(facility.id);
    setName(facility.name);
    setDescription(facility.description || "");
    setIsFeatured(Boolean(facility.isFeatured ?? facility.is_featured));
    setShowAddModal(true);
  };

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setFeedback({ type: "error", message: "Name and description are required." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(
        editingId ? `/api/v1/facilities/${editingId}` : "/api/v1/facilities",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            is_featured: isFeatured,
          }),
        }
      );

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `Facility '${name}' ${editingId ? "updated" : "created"}.`,
        });
        setShowAddModal(false);
        setEditingId(null);
        setName("");
        setDescription("");
        setIsFeatured(false);
        await fetchFacilities();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to save facility.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, facilityName: string) => {
    if (!confirm(`Are you sure you want to delete '${facilityName}'?`)) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/facilities/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Facility '${facilityName}' deleted.` });
        await fetchFacilities();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to delete facility.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error deleting facility." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Resort Facilities" user={adminUser} breadcrumbs={[{ label: "Facilities" }]}>
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Resort Facilities
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Showcase amenities such as the Prayer Hut, Olympic pool, gym, and recreational areas.
          </Text>
        </Box>

        <Button size="sm" colorPalette="blue" onClick={openCreate}>
          <HStack gap={1}>
            <Icon as={FaPlus} boxSize={3} />
            <Text>Add Facility</Text>
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
        ) : facilities.length === 0 ? (
          <VStack py={12} px={4}>
            <Icon as={FaSwimmingPool} boxSize={8} color="gray.400" mb={2} />
            <Text fontWeight="semibold" color="gray.700">
              No facilities registered
            </Text>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Facility Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Campus</Table.ColumnHeader>
                  <Table.ColumnHeader>Featured</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {facilities.map((f) => {
                  const featured = f.isFeatured ?? f.is_featured;
                  return (
                    <Table.Row key={f.id}>
                      <Table.Cell>
                        <Box>
                          <Text fontWeight="semibold">{f.name}</Text>
                          {f.description && (
                            <Text fontSize="xs" color="gray.500" lineClamp={1}>
                              {f.description}
                            </Text>
                          )}
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge colorPalette="purple" textTransform="uppercase" fontSize="10px">
                          {f.campus || "Resort Wide"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        {featured ? (
                          <Badge colorPalette="yellow" fontSize="10px">
                            <HStack gap={1}>
                              <Icon as={FaStar} boxSize={2.5} />
                              <Text>Featured</Text>
                            </HStack>
                          </Badge>
                        ) : (
                          <Text fontSize="xs" color="gray.400">
                            Standard
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label={`Edit facility ${f.name}`}
                          onClick={() => openEdit(f)}
                          disabled={saving}
                        >
                          <Icon as={FaEdit} boxSize={3} />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          aria-label={`Delete facility ${f.name}`}
                          onClick={() => handleDelete(f.id, f.name)}
                          disabled={saving}
                        >
                          <Icon as={FaTrash} boxSize={3} />
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      {/* ADD / EDIT FACILITY MODAL */}
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
              <Heading size="sm">{editingId ? "Edit Facility" : "Add New Facility"}</Heading>
              <Button size="xs" variant="ghost" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
            </Flex>

            <form onSubmit={handleSaveFacility}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Facility Name *
                  </Text>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prayer Hut Sanctuary, Olympic Pool"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Description *
                  </Text>
                  <textarea
                    required
                    rows={3}
                    placeholder="Features, location on campus, and spiritual/relaxation benefits..."
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

                <HStack>
                  <input
                    type="checkbox"
                    id="featured"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                  />
                  <label htmlFor="featured" style={{ cursor: "pointer" }}>
                    <Text fontSize="xs" color="gray.700">
                      Feature on Home page facilities spotlight
                    </Text>
                  </label>
                </HStack>

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
                    {editingId ? "Save Changes" : "Add Facility"}
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
