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
  Badge,
  Button,
  Icon,
  Spinner,
  Table,
} from "@chakra-ui/react";
import {
  FaArrowLeft,
  FaPlus,
  FaCheckCircle,
  FaExclamationCircle,
  FaTrash,
  FaUtensils,
  FaEdit,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminDialog } from "@/components/admin/AdminDialog";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import { formatNgn } from "@/lib/formatters/currency";

interface MenuItem {
  id: string;
  name: string;
  category: "starter" | "main" | "dessert" | "beverage";
  price: number;
  description?: string | null;
  isAvailable?: boolean;
  is_available?: boolean;
}

interface MenuPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<MenuPageProps> = async (ctx) => {
  return requireAdminPage<MenuPageProps>(ctx, ["content_manager", "resort_admin", "super_admin"]);
};

export default function AdminRestaurantMenuPage({ adminUser }: MenuPageProps) {
  const router = useRouter();
  const { id } = router.query;

  const [restaurantName, setRestaurantName] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // New item form fields
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"starter" | "main" | "dessert" | "beverage">("main");
  const [price, setPrice] = useState<number>(3500);
  const [description, setDescription] = useState("");

  const fetchMenu = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    setLoading(true);
    try {
      const [restRes, menuRes] = await Promise.all([
        fetch(`/api/v1/restaurants/${id}`),
        fetch(`/api/v1/restaurants/${id}/menu`),
      ]);

      const restJson = await restRes.json();
      if (restRes.ok && restJson.success && restJson.data) {
        setRestaurantName(restJson.data.name || "");
      }

      const menuJson = await menuRes.json();
      if (menuRes.ok && menuJson.success && Array.isArray(menuJson.data)) {
        setItems(menuJson.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const openCreate = () => {
    setEditingItem(null);
    setName("");
    setCategory("main");
    setPrice(3500);
    setDescription("");
    setShowAddModal(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price);
    setDescription(item.description || "");
    setShowAddModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price < 0) {
      setFeedback({ type: "error", message: "Item name and valid price are required." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/restaurants/${id}/menu`, {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingItem ? { id: editingItem.id } : {}),
          name: name.trim(),
          category,
          price: Number(price),
          description: description.trim() || null,
          is_available: editingItem
            ? (editingItem.isAvailable ?? editingItem.is_available ?? true)
            : true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `Menu item '${name}' ${editingItem ? "updated" : "added"}.`,
        });
        setShowAddModal(false);
        setEditingItem(null);
        setName("");
        setPrice(3500);
        setDescription("");
        await fetchMenu();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to save menu item.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (menuItemId: string, itemName: string) => {
    const confirmed = await adminDialog.confirm({
      title: "Delete menu item?",
      message: `'${itemName}' will be removed from the menu. This cannot be undone.`,
      confirmLabel: "Delete Item",
    });
    if (!confirmed) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/restaurants/${id}/menu?menuItemId=${menuItemId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Item '${itemName}' deleted.` });
        await fetchMenu();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to delete item.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error deleting menu item." });
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    return true;
  });

  return (
    <AdminLayout
      title={`Menu: ${restaurantName || "Loading..."}`}
      user={adminUser}
      breadcrumbs={[
        { label: "Restaurants", href: "/admin/restaurants" },
        { label: restaurantName || "Menu" },
      ]}
    >
      <Box maxW="900px" mx="auto">
        <HStack mb={4} justify="space-between">
          <Button size="xs" variant="ghost" onClick={() => router.push("/admin/restaurants")}>
            <HStack gap={1}>
              <Icon as={FaArrowLeft} boxSize={3} />
              <Text>Back to Restaurants</Text>
            </HStack>
          </Button>

          <Button size="xs" colorPalette="blue" onClick={openCreate}>
            <HStack gap={1}>
              <Icon as={FaPlus} boxSize={3} />
              <Text>Add Menu Item</Text>
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
          <Flex
            justify="space-between"
            align="center"
            mb={4}
            pb={3}
            borderBottom="1px solid"
            borderColor="gray.100"
          >
            <Box>
              <Heading size="md" color="gray.800">
                Menu Items — {restaurantName}
              </Heading>
              <Text fontSize="xs" color="gray.500">
                Categorized delicacies, drinks, and prices in Nigerian Naira (₦).
              </Text>
            </Box>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                height: "32px",
                padding: "0 8px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid #CBD5E0",
                background: "white",
              }}
            >
              <option value="all">All Categories</option>
              <option value="starter">Starters</option>
              <option value="main">Mains</option>
              <option value="dessert">Desserts</option>
              <option value="beverage">Beverages</option>
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

          {loading ? (
            <Flex justify="center" p={12}>
              <Spinner size="lg" color="blue.500" />
            </Flex>
          ) : filteredItems.length === 0 ? (
            <VStack py={12} px={4} bg="gray.50" borderRadius="md">
              <Icon as={FaUtensils} boxSize={8} color="gray.400" mb={2} />
              <Text fontWeight="semibold" color="gray.700">
                No menu items found
              </Text>
            </VStack>
          ) : (
            <Box overflowX="auto">
              <Table.Root size="sm">
                <Table.Header bg="gray.50">
                  <Table.Row>
                    <Table.ColumnHeader>Dish / Drink</Table.ColumnHeader>
                    <Table.ColumnHeader>Category</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Price</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Action</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredItems.map((item) => (
                    <Table.Row key={item.id}>
                      <Table.Cell>
                        <Box>
                          <Text fontWeight="semibold">{item.name}</Text>
                          {item.description && (
                            <Text fontSize="xs" color="gray.500">
                              {item.description}
                            </Text>
                          )}
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          variant="subtle"
                          colorPalette="blue"
                          textTransform="uppercase"
                          fontSize="9px"
                        >
                          {item.category}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="right" fontWeight="bold" color="blue.600">
                        {formatNgn(item.price)}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-label={`Edit menu item ${item.name}`}
                          onClick={() => openEdit(item)}
                          disabled={saving}
                        >
                          <Icon as={FaEdit} boxSize={3} />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          aria-label={`Delete menu item ${item.name}`}
                          onClick={() => handleDeleteItem(item.id, item.name)}
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
      </Box>

      {/* ADD ITEM MODAL */}
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
              <Heading size="sm">{editingItem ? "Edit Menu Item" : "Add Menu Item"}</Heading>
              <Button size="xs" variant="ghost" onClick={() => setShowAddModal(false)}>
                Close
              </Button>
            </Flex>

            <form onSubmit={handleSaveItem}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Item Name *
                  </Text>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asun Spicy Goat Meat"
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

                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Category *
                    </Text>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as "starter" | "main" | "dessert" | "beverage")
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
                      <option value="starter">Starter</option>
                      <option value="main">Main Course</option>
                      <option value="dessert">Dessert</option>
                      <option value="beverage">Beverage</option>
                    </select>
                  </Box>

                  <Box flex="1">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Price (₦) *
                    </Text>
                    <input
                      type="number"
                      min="0"
                      step="500"
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
                </Flex>

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Description
                  </Text>
                  <textarea
                    rows={2}
                    placeholder="Ingredients, spice level, or side pairings..."
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
                    {editingItem ? "Save Changes" : "Add Item"}
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
