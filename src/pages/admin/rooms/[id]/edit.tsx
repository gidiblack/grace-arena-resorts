import React, { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { Box, Flex, VStack, HStack, Text, Heading, Button, Icon, Spinner } from "@chakra-ui/react";
import { FaBed, FaArrowLeft, FaCheckCircle, FaExclamationCircle, FaTrash } from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";

interface EditRoomPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<EditRoomPageProps> = async (ctx) => {
  return requireAdminPage<EditRoomPageProps>(ctx, ["resort_admin", "super_admin"]);
};

export default function AdminEditRoomPage({ adminUser }: EditRoomPageProps) {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Form fields
  const [name, setName] = useState("");
  const [tier, setTier] = useState<string>("deluxe");
  const [basePrice, setBasePrice] = useState<number>(65000);
  const [maxGuests, setMaxGuests] = useState<number>(2);
  const [totalUnits, setTotalUnits] = useState<number>(2);
  const [status, setStatus] = useState<string>("available");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    async function loadRoom() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/rooms/${id}`);
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const room = json.data;
          setName(room.name || "");
          setTier(room.tier || "deluxe");
          setBasePrice(room.base_price ?? room.basePrice ?? room.price ?? 65000);
          setMaxGuests(room.max_guests ?? room.maxGuests ?? 2);
          setTotalUnits(room.total_units ?? room.totalUnits ?? 1);
          setStatus(room.status || (room.isUnderConstruction ? "under_construction" : "available"));
          setDescription(room.description || "");
        } else {
          setFeedback({ type: "error", message: "Failed to load suite details." });
        }
      } catch {
        setFeedback({ type: "error", message: "Failed to connect to API." });
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: "error", message: "Suite name is required." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/rooms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tier,
          base_price: Number(basePrice),
          max_guests: Number(maxGuests),
          total_units: Number(totalUnits),
          status,
          description: description.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: "Room suite updated successfully!" });
        setTimeout(() => {
          router.push("/admin/rooms");
        }, 1200);
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to update suite.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete '${name}'? This cannot be undone.`)) {
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/rooms/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        alert("Room suite deleted.");
        router.push("/admin/rooms");
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to delete room suite.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error deleting room suite." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title={`Edit Suite: ${name || "Loading..."}`}
      user={adminUser}
      breadcrumbs={[{ label: "Rooms & Suites", href: "/admin/rooms" }, { label: "Edit Suite" }]}
    >
      <Box maxW="720px" mx="auto">
        <HStack mb={4} justify="space-between">
          <Button size="xs" variant="ghost" onClick={() => router.push("/admin/rooms")}>
            <HStack gap={1}>
              <Icon as={FaArrowLeft} boxSize={3} />
              <Text>Back to Rooms</Text>
            </HStack>
          </Button>

          {id && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => router.push(`/admin/rooms/${id}/pricing`)}
            >
              Manage Seasonal Pricing
            </Button>
          )}
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
            mb={6}
            pb={4}
            borderBottom="1px solid"
            borderColor="gray.100"
          >
            <HStack gap={3}>
              <Icon as={FaBed} boxSize={5} color="blue.500" />
              <Box>
                <Heading size="md" color="gray.800">
                  Edit Room Suite
                </Heading>
                <Text fontSize="xs" color="gray.500">
                  Modify rates, guest capacity, and online availability.
                </Text>
              </Box>
            </HStack>

            <Button
              size="xs"
              colorPalette="red"
              variant="ghost"
              onClick={handleDelete}
              disabled={loading || saving}
            >
              <HStack gap={1}>
                <Icon as={FaTrash} boxSize={3} />
                <Text>Delete Suite</Text>
              </HStack>
            </Button>
          </Flex>

          {loading ? (
            <Flex justify="center" p={12}>
              <Spinner size="lg" color="blue.500" />
            </Flex>
          ) : (
            <>
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

              <form onSubmit={handleSubmit}>
                <VStack gap={4} align="stretch">
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Suite Name *
                    </Text>
                    <input
                      type="text"
                      required
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

                  <Flex gap={4} flexWrap="wrap">
                    <Box flex="1" minW="200px">
                      <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                        Tier *
                      </Text>
                      <select
                        value={tier}
                        onChange={(e) => setTier(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E0",
                          fontSize: "14px",
                          background: "white",
                        }}
                      >
                        <option value="budget">Budget</option>
                        <option value="standard">Standard</option>
                        <option value="deluxe">Deluxe</option>
                        <option value="premium">Premium</option>
                        <option value="executive">Executive</option>
                        <option value="presidential">Presidential</option>
                        <option value="royal">Royal</option>
                      </select>
                    </Box>

                    <Box flex="1" minW="200px">
                      <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                        Status *
                      </Text>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E0",
                          fontSize: "14px",
                          background: "white",
                        }}
                      >
                        <option value="available">Available (Bookable Online)</option>
                        <option value="under_construction">
                          Under Construction (Notify-Me Only)
                        </option>
                      </select>
                    </Box>
                  </Flex>

                  <Flex gap={4} flexWrap="wrap">
                    <Box flex="1" minW="150px">
                      <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                        Base Rate (₦/night) *
                      </Text>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        value={basePrice}
                        onChange={(e) => setBasePrice(Number(e.target.value))}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E0",
                          fontSize: "14px",
                        }}
                      />
                    </Box>

                    <Box flex="1" minW="150px">
                      <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                        Max Guests *
                      </Text>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={maxGuests}
                        onChange={(e) => setMaxGuests(Number(e.target.value))}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E0",
                          fontSize: "14px",
                        }}
                      />
                    </Box>

                    <Box flex="1" minW="150px">
                      <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                        Total Units *
                      </Text>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={totalUnits}
                        onChange={(e) => setTotalUnits(Number(e.target.value))}
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
                      rows={4}
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
                    gap={3}
                    pt={4}
                    borderTop="1px solid"
                    borderColor="gray.100"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/admin/rooms")}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button colorPalette="blue" size="sm" type="submit" loading={saving}>
                      Update Suite
                    </Button>
                  </Flex>
                </VStack>
              </form>
            </>
          )}
        </Box>
      </Box>
    </AdminLayout>
  );
}
