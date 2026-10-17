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
  FaGem,
  FaPlus,
  FaCheckCircle,
  FaExclamationCircle,
  FaTrash,
  FaEdit,
  FaMapMarkerAlt,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";

interface GemItem {
  id: string;
  name: string;
  category: "nature" | "culture" | "adventure" | "spiritual";
  distance: string;
  duration: string;
  description: string;
}

interface GemsPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<GemsPageProps> = async (ctx) => {
  return requireAdminPage<GemsPageProps>(ctx, ["content_manager", "resort_admin", "super_admin"]);
};

export default function AdminGemsPage({ adminUser }: GemsPageProps) {
  const [gems, setGems] = useState<GemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // New gem form fields
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"nature" | "culture" | "adventure" | "spiritual">(
    "culture"
  );
  const [distance, setDistance] = useState("5 km");
  const [duration, setDuration] = useState("15 mins drive");
  const [description, setDescription] = useState("");

  const fetchGems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/gems");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setGems(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGems();
  }, [fetchGems]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setCategory("culture");
    setDistance("5 km");
    setDuration("15 mins drive");
    setDescription("");
    setShowAddModal(true);
  };

  const openEdit = (gem: GemItem) => {
    setEditingId(gem.id);
    setName(gem.name);
    setCategory(gem.category);
    setDistance(gem.distance);
    setDuration(gem.duration);
    setDescription(gem.description || "");
    setShowAddModal(true);
  };

  const handleSaveGem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !distance.trim() || !duration.trim() || !description.trim()) {
      setFeedback({ type: "error", message: "All fields are required." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(editingId ? `/api/v1/gems/${editingId}` : "/api/v1/gems", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          distance: distance.trim(),
          duration: duration.trim(),
          description: description.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `Off-Beat Gem '${name}' ${editingId ? "updated" : "created"}.`,
        });
        setShowAddModal(false);
        setEditingId(null);
        setName("");
        setDescription("");
        setDistance("5 km");
        setDuration("15 mins drive");
        await fetchGems();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to save gem.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, gemName: string) => {
    if (!confirm(`Are you sure you want to delete '${gemName}'?`)) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/gems/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Gem '${gemName}' deleted.` });
        await fetchGems();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to delete gem.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error deleting gem." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Off-Beat Gems" user={adminUser} breadcrumbs={[{ label: "Off-Beat Gems" }]}>
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Off-Beat Gems (Igbo-Ora Attractions)
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Curate local cultural excursions, nature trails, historical monoliths, and twin heritage
            sites.
          </Text>
        </Box>

        <Button size="sm" colorPalette="blue" onClick={openCreate}>
          <HStack gap={1}>
            <Icon as={FaPlus} boxSize={3} />
            <Text>Add Attraction</Text>
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
        ) : gems.length === 0 ? (
          <VStack py={12} px={4}>
            <Icon as={FaGem} boxSize={8} color="gray.400" mb={2} />
            <Text fontWeight="semibold" color="gray.700">
              No off-beat gems registered
            </Text>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Attraction Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Category</Table.ColumnHeader>
                  <Table.ColumnHeader>Distance & Duration</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {gems.map((g) => (
                  <Table.Row key={g.id}>
                    <Table.Cell>
                      <Box>
                        <Text fontWeight="semibold">{g.name}</Text>
                        <Text fontSize="xs" color="gray.500" lineClamp={1}>
                          {g.description}
                        </Text>
                      </Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette="blue" textTransform="uppercase" fontSize="10px">
                        {g.category}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell fontSize="xs">
                      <HStack gap={1} color="gray.600">
                        <Icon as={FaMapMarkerAlt} boxSize={2.5} color="gray.400" />
                        <Text>
                          {g.distance} • {g.duration}
                        </Text>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Button
                        size="xs"
                        variant="ghost"
                        aria-label={`Edit attraction ${g.name}`}
                        onClick={() => openEdit(g)}
                        disabled={saving}
                      >
                        <Icon as={FaEdit} boxSize={3} />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        aria-label={`Delete attraction ${g.name}`}
                        onClick={() => handleDelete(g.id, g.name)}
                        disabled={saving}
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

      {/* ADD GEM MODAL */}
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
              <Heading size="sm">{editingId ? "Edit Off-Beat Gem" : "Add Off-Beat Gem"}</Heading>
              <Button size="xs" variant="ghost" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
            </Flex>

            <form onSubmit={handleSaveGem}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Attraction Name *
                  </Text>
                  <input
                    type="text"
                    required
                    placeholder="e.g. World Twin Festival Monument"
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
                    Category *
                  </Text>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as "nature" | "culture" | "adventure" | "spiritual"
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                      background: "white",
                    }}
                  >
                    <option value="culture">Culture & Heritage</option>
                    <option value="nature">Nature & Scenic Walks</option>
                    <option value="adventure">Adventure & Rock Climbing</option>
                    <option value="spiritual">Spiritual Retreat Grounds</option>
                  </select>
                </Box>

                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Distance *
                    </Text>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 8 km"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
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
                      Duration *
                    </Text>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 20 mins drive"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
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
                    placeholder="Historical context, cultural significance, and guide recommendations..."
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
                    {editingId ? "Save Changes" : "Add Gem"}
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
