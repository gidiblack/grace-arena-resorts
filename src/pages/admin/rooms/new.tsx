import React, { useState, useEffect } from "react";
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
} from "@chakra-ui/react";
import { FaBed, FaArrowLeft, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";

interface BuildingOption {
  id: string;
  name: string;
  campus?: string;
}

interface NewRoomPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<NewRoomPageProps> = async (ctx) => {
  return requireAdminPage<NewRoomPageProps>(ctx, ["resort_admin", "super_admin"]);
};

export default function AdminNewRoomPage({ adminUser }: NewRoomPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Form fields
  const [name, setName] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [tier, setTier] = useState<string>("deluxe");
  const [basePrice, setBasePrice] = useState<number>(65000);
  const [maxGuests, setMaxGuests] = useState<number>(2);
  const [totalUnits, setTotalUnits] = useState<number>(2);
  const [status, setStatus] = useState<string>("available");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function loadBuildings() {
      try {
        const res = await fetch("/api/v1/buildings");
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data)) {
          setBuildings(json.data);
          if (json.data.length > 0) {
            setBuildingId(json.data[0].id);
          }
        }
      } catch {
        // Fallback
      }
    }
    loadBuildings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: "error", message: "Room suite name is required." });
      return;
    }
    if (!description.trim()) {
      setFeedback({ type: "error", message: "Description is required." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/v1/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          building_id: buildingId || undefined,
          tier,
          base_price: Number(basePrice),
          max_guests: Number(maxGuests),
          total_units: Number(totalUnits),
          status,
          description: description.trim(),
          amenities: [],
          images: [],
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: "Room suite successfully created!" });
        setTimeout(() => {
          router.push("/admin/rooms");
        }, 1200);
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to create room suite.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Add New Room Suite"
      user={adminUser}
      breadcrumbs={[
        { label: "Rooms & Suites", href: "/admin/rooms" },
        { label: "New Suite" },
      ]}
    >
      <Box maxW="720px" mx="auto">
        <HStack mb={4} justify="space-between">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => router.push("/admin/rooms")}
          >
            <HStack gap={1}>
              <Icon as={FaArrowLeft} boxSize={3} />
              <Text>Back to Rooms</Text>
            </HStack>
          </Button>
        </HStack>

        <Box bg="white" p={6} borderRadius="lg" border="1px solid" borderColor="gray.200" boxShadow="sm">
          <HStack gap={3} mb={6} pb={4} borderBottom="1px solid" borderColor="gray.100">
            <Icon as={FaBed} boxSize={5} color="blue.500" />
            <Box>
              <Heading size="md" color="gray.800">
                Create Room Suite
              </Heading>
              <Text fontSize="xs" color="gray.500">
                Add a new room or suite tier to resort inventory.
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

          <form onSubmit={handleSubmit}>
            <VStack gap={4} align="stretch">
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                  Suite Name *
                </Text>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Executive Suite"
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
                    Building
                  </Text>
                  <select
                    value={buildingId}
                    onChange={(e) => setBuildingId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                      background: "white",
                    }}
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.campus || "GAR"})
                      </option>
                    ))}
                  </select>
                </Box>

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
                  <option value="under_construction">Under Construction (Notify-Me Only)</option>
                </select>
              </Box>

              <Box>
                <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                  Description *
                </Text>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the suite layout, bed type, serene views, and unique amenities..."
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

              <Flex justify="flex-end" gap={3} pt={4} borderTop="1px solid" borderColor="gray.100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/rooms")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  size="sm"
                  type="submit"
                  loading={loading}
                >
                  Save Suite
                </Button>
              </Flex>
            </VStack>
          </form>
        </Box>
      </Box>
    </AdminLayout>
  );
}
