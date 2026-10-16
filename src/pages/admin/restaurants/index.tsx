import React, { useState, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import NextLink from "next/link";
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
  FaUtensils,
  FaPlus,
  FaCheckCircle,
  FaExclamationCircle,
  FaTrash,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";

interface RestaurantItem {
  id: string;
  name: string;
  slug?: string;
  campus?: string;
  cuisineType?: string;
  cuisine_type?: string;
  description?: string;
}

interface RestaurantsPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<RestaurantsPageProps> = async (ctx) => {
  return requireAdminPage<RestaurantsPageProps>(ctx, [
    "content_manager",
    "resort_admin",
    "super_admin",
  ]);
};

export default function AdminRestaurantsPage({ adminUser }: RestaurantsPageProps) {
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // New restaurant form fields
  const [name, setName] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [description, setDescription] = useState("");

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/restaurants");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setRestaurants(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cuisineType.trim() || !description.trim()) {
      setFeedback({ type: "error", message: "All fields are required." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/v1/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          cuisine_type: cuisineType.trim(),
          description: description.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Restaurant '${name}' created successfully!` });
        setShowAddModal(false);
        setName("");
        setCuisineType("");
        setDescription("");
        await fetchRestaurants();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to create restaurant.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, restaurantName: string) => {
    if (!confirm(`Are you sure you want to delete '${restaurantName}'? All menu items will also be deleted.`)) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/restaurants/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Restaurant '${restaurantName}' deleted.` });
        await fetchRestaurants();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to delete restaurant.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error deleting restaurant." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Restaurants & Dining"
      user={adminUser}
      breadcrumbs={[{ label: "Restaurants" }]}
    >
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Restaurants & Menus
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Manage resort dining venues, cuisines, operating hours, and categorized menus.
          </Text>
        </Box>

        <Button size="sm" colorScheme="blue" onClick={() => setShowAddModal(true)}>
          <HStack gap={1}>
            <Icon as={FaPlus} boxSize={3} />
            <Text>Add Restaurant</Text>
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

      <Box bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" boxShadow="sm" overflow="hidden">
        {loading ? (
          <Flex justify="center" p={12}>
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : restaurants.length === 0 ? (
          <VStack py={12} px={4}>
            <Icon as={FaUtensils} boxSize={8} color="gray.400" mb={2} />
            <Text fontWeight="semibold" color="gray.700">No restaurants found</Text>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader>Restaurant Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Cuisine Type</Table.ColumnHeader>
                  <Table.ColumnHeader>Campus</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {restaurants.map((r) => (
                  <Table.Row key={r.id}>
                    <Table.Cell fontWeight="semibold">
                      <HStack gap={2}>
                        <Icon as={FaUtensils} color="gray.400" />
                        <Text>{r.name}</Text>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell fontSize="xs">
                      {r.cuisineType || r.cuisine_type || "Continental / Nigerian"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorScheme="purple" textTransform="uppercase" fontSize="10px">
                        {r.campus || "Resort Wide"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <HStack gap={2} justify="flex-end">
                        <NextLink href={`/admin/restaurants/${r.id}/menu`} passHref legacyBehavior>
                          <Button as="a" size="xs" colorScheme="blue" variant="outline">
                            Manage Menu
                          </Button>
                        </NextLink>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(r.id, r.name)}
                          disabled={saving}
                        >
                          <Icon as={FaTrash} boxSize={3} />
                        </Button>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      {/* CREATE RESTAURANT MODAL */}
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
              <Heading size="sm">Add New Restaurant</Heading>
              <Button size="xs" variant="ghost" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
            </Flex>

            <form onSubmit={handleCreateRestaurant}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Restaurant Name *
                  </Text>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Village Grill & Suya Spot"
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
                    Cuisine Type *
                  </Text>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Traditional Nigerian & Grilled Meats"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
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
                    placeholder="Atmosphere, special delicacies, and seating arrangements..."
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

                <Flex justify="flex-end" gap={2} pt={3} borderTop="1px solid" borderColor="gray.100">
                  <Button size="sm" variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" colorScheme="blue" type="submit" loading={saving}>
                    Create Restaurant
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
