import React, { useState, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import NextLink from "next/link";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Heading,
  Badge,
  Button,
  Spinner,
  Icon,
  Table,
} from "@chakra-ui/react";
import { FaBed, FaTools, FaCheckCircle, FaExclamationCircle, FaBell } from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminDialog } from "@/components/admin/AdminDialog";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import { formatNgn } from "@/lib/formatters/currency";

interface AdminRoomItem {
  id: string;
  name: string;
  slug: string;
  campus?: string;
  resortCampus?: string;
  tier: string;
  status: string;
  basePrice?: number;
  price?: number;
  totalUnits: number;
  isUnderConstruction?: boolean;
  [key: string]: unknown;
}

interface AdminRoomUnit {
  id: string;
  unit_number?: string;
  room_number?: string;
  floor?: string | null;
  status: string;
  activeAssignment?: {
    bookings?: {
      reference?: string;
      guest_name?: string;
    };
  } | null;
  [key: string]: unknown;
}

interface AdminRoomsPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<AdminRoomsPageProps> = async (ctx) => {
  return requireAdminPage<AdminRoomsPageProps>(ctx, ["resort_admin", "super_admin"]);
};

export default function AdminRoomsPage({ adminUser }: AdminRoomsPageProps) {
  const [rooms, setRooms] = useState<AdminRoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Filters
  const [resortFilter, setResortFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected room type for units modal
  const [selectedRoomType, setSelectedRoomType] = useState<AdminRoomItem | null>(null);
  const [units, setUnits] = useState<AdminRoomUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/rooms");
      const json = await res.json();
      if (res.ok && json.success) {
        setRooms(json.data || []);
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Handle toggling room type status
  const handleToggleRoomStatus = async (room: AdminRoomItem) => {
    const newStatus = room.isUnderConstruction ? "available" : "under_construction";
    const confirmed = await adminDialog.confirm(
      newStatus === "available"
        ? {
            title: `Mark '${room.name}' as Available?`,
            message:
              "Guests can book it online straight away, and everyone on its Notify-Me list is emailed now. Emails cannot be recalled.",
            confirmLabel: "Mark Available",
            tone: "warning",
          }
        : {
            title: `Mark '${room.name}' as Under Construction?`,
            message:
              "Guests will no longer be able to book this suite online. Existing bookings are not affected.",
            confirmLabel: "Set Under Construction",
            tone: "warning",
          }
    );
    if (!confirmed) return;

    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/rooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message:
            newStatus === "available"
              ? `'${room.name}' is now available. Notify-Me emails have been dispatched to subscribed guests.`
              : `'${room.name}' marked as under construction.`,
        });
        await fetchRooms();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to update room type status",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error updating room status" });
    } finally {
      setActionLoading(false);
    }
  };

  // Open units management
  const handleOpenUnits = async (room: AdminRoomItem) => {
    setSelectedRoomType(room);
    setLoadingUnits(true);
    setUnits([]);
    try {
      const res = await fetch(`/api/v1/rooms/${room.id}/units`);
      const json = await res.json();
      if (res.ok && json.success) {
        setUnits(json.data || []);
      } else {
        setUnits([]);
      }
    } catch {
      setUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  // Update single unit status
  const handleUpdateUnitStatus = async (unitId: string, newStatus: "available" | "maintenance") => {
    if (!selectedRoomType) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/rooms/${selectedRoomType.id}/units/${unitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Unit status updated to '${newStatus}'.` });
        // Refresh units
        const unitsRes = await fetch(`/api/v1/rooms/${selectedRoomType.id}/units`);
        const unitsJson = await unitsRes.json();
        if (unitsRes.ok && unitsJson.success) {
          setUnits(unitsJson.data || []);
        }
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to update unit status",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error updating unit status" });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (resortFilter !== "all" && r.campus?.toLowerCase() !== resortFilter.toLowerCase())
      return false;
    if (tierFilter !== "all" && r.tier?.toLowerCase() !== tierFilter.toLowerCase()) return false;
    if (statusFilter === "available" && r.isUnderConstruction) return false;
    if (statusFilter === "under_construction" && !r.isUnderConstruction) return false;
    return true;
  });

  return (
    <AdminLayout
      title="Rooms & Units Management"
      user={adminUser}
      breadcrumbs={[{ label: "Rooms & Suites" }]}
    >
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Room Status & Unit Operations
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Toggle under-construction status to trigger Notify-Me broadcasts, or manage physical
            unit maintenance.
          </Text>
        </Box>
        <Button asChild size="sm" colorPalette="blue">
          <NextLink href="/admin/rooms/new">+ Add Room Suite</NextLink>
        </Button>
      </Flex>

      {feedback && (
        <Box
          bg={feedback.type === "success" ? "green.50" : "red.50"}
          color={feedback.type === "success" ? "green.700" : "red.700"}
          p={4}
          borderRadius="md"
          mb={6}
          border="1px solid"
          borderColor={feedback.type === "success" ? "green.200" : "red.200"}
        >
          <HStack gap={2}>
            <Icon as={feedback.type === "success" ? FaCheckCircle : FaExclamationCircle} />
            <Text fontWeight="semibold">{feedback.message}</Text>
          </HStack>
        </Box>
      )}

      {/* Filter Controls */}
      <Box bg="white" p={4} borderRadius="lg" border="1px solid" borderColor="gray.200" mb={6}>
        <Flex gap={3} flexWrap="wrap">
          <select
            style={{
              height: "32px",
              padding: "0 8px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              background: "white",
              color: "#2D3748",
            }}
            value={resortFilter}
            onChange={(e) => setResortFilter(e.target.value)}
          >
            <option value="all">All Campuses</option>
            <option value="elysian">Elysian Campus</option>
            <option value="village">Village Campus</option>
          </select>

          <select
            style={{
              height: "32px",
              padding: "0 8px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              background: "white",
              color: "#2D3748",
            }}
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="all">All Tiers</option>
            <option value="standard">Standard</option>
            <option value="deluxe">Deluxe</option>
            <option value="executive">Executive</option>
            <option value="presidential">Presidential</option>
            <option value="royal">Royal</option>
          </select>

          <select
            style={{
              height: "32px",
              padding: "0 8px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              background: "white",
              color: "#2D3748",
            }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Room Statuses</option>
            <option value="available">Available (Bookable)</option>
            <option value="under_construction">Under Construction</option>
          </select>
        </Flex>
      </Box>

      {/* Room Types Table */}
      <Box
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        overflow="hidden"
        boxShadow="sm"
      >
        {loading ? (
          <Flex justify="center" p={12}>
            <Spinner size="lg" color="blue.500" />
          </Flex>
        ) : filteredRooms.length === 0 ? (
          <VStack py={12} px={4}>
            <Text fontWeight="semibold" color="gray.700">
              No rooms matched the criteria
            </Text>
          </VStack>
        ) : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header bg="gray.50">
                <Table.Row>
                  <Table.ColumnHeader py={3}>Room Suite</Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Campus / Tier</Table.ColumnHeader>
                  <Table.ColumnHeader py={3} textAlign="right">
                    Base Rate
                  </Table.ColumnHeader>
                  <Table.ColumnHeader py={3} textAlign="right">
                    Units
                  </Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Status</Table.ColumnHeader>
                  <Table.ColumnHeader py={3}>Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredRooms.map((room) => {
                  const isUC = room.isUnderConstruction;
                  return (
                    <Table.Row key={room.id} _hover={{ bg: "gray.50" }}>
                      <Table.Cell fontWeight="semibold">
                        <HStack gap={2}>
                          <Icon as={FaBed} color="gray.400" />
                          <Text>{room.name}</Text>
                        </HStack>
                      </Table.Cell>
                      <Table.Cell fontSize="xs">
                        <Badge variant="subtle" colorPalette="blue" mr={1}>
                          {room.campus}
                        </Badge>
                        <Badge variant="outline">{room.tier}</Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="right" fontWeight="medium" fontSize="xs">
                        {isUC ? "Price TBD" : formatNgn(room.price ?? room.basePrice ?? 0)}
                      </Table.Cell>
                      <Table.Cell textAlign="right" fontSize="xs">
                        {room.totalUnits || 1} units
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          colorPalette={isUC ? "yellow" : "green"}
                          textTransform="uppercase"
                          fontSize="10px"
                        >
                          {isUC ? "Under Construction" : "Available"}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <HStack gap={1} flexWrap="wrap">
                          <Button
                            size="xs"
                            colorPalette={isUC ? "green" : "yellow"}
                            variant="outline"
                            onClick={() => handleToggleRoomStatus(room)}
                            loading={actionLoading}
                          >
                            <HStack gap={1}>
                              <Icon as={isUC ? FaBell : FaTools} boxSize={2.5} />
                              <Text>{isUC ? "Mark Available" : "Set Construction"}</Text>
                            </HStack>
                          </Button>
                          <Button size="xs" variant="ghost" onClick={() => handleOpenUnits(room)}>
                            Units
                          </Button>
                          <Button asChild size="xs" variant="ghost">
                            <NextLink href={`/admin/rooms/${room.id}/pricing`}>Pricing</NextLink>
                          </Button>
                          <Button asChild size="xs" variant="ghost" colorPalette="blue">
                            <NextLink href={`/admin/rooms/${room.id}/edit`}>Edit</NextLink>
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

      {/* UNITS MANAGEMENT MODAL */}
      {selectedRoomType && (
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
          <Box
            bg="white"
            maxW="600px"
            w="100%"
            p={6}
            borderRadius="lg"
            boxShadow="xl"
            maxH="80vh"
            overflowY="auto"
          >
            <Flex justify="space-between" align="center" mb={2}>
              <Heading size="md">Manage Physical Units</Heading>
              <Button size="xs" variant="ghost" onClick={() => setSelectedRoomType(null)}>
                Close
              </Button>
            </Flex>
            <Text fontSize="sm" color="gray.600" mb={4}>
              {selectedRoomType.name} ({selectedRoomType.campus}) — Set unit status to Available or
              Maintenance.
            </Text>

            {loadingUnits ? (
              <Flex justify="center" p={8}>
                <Spinner size="md" color="blue.500" />
              </Flex>
            ) : units.length === 0 ? (
              <Text fontSize="sm" color="gray.500" py={4} textAlign="center">
                No individual units registered in database for this room type.
              </Text>
            ) : (
              <Table.Root size="sm" mb={4}>
                <Table.Header bg="gray.50">
                  <Table.Row>
                    <Table.ColumnHeader>Unit #</Table.ColumnHeader>
                    <Table.ColumnHeader>Floor</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader>Active Guest</Table.ColumnHeader>
                    <Table.ColumnHeader>Action</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {units.map((unit) => {
                    const isOccupied = unit.status === "occupied" || Boolean(unit.activeAssignment);
                    const isMaint = unit.status === "maintenance";
                    return (
                      <Table.Row key={unit.id}>
                        <Table.Cell fontWeight="bold">Unit {unit.unit_number}</Table.Cell>
                        <Table.Cell fontSize="xs">{unit.floor || "Ground"}</Table.Cell>
                        <Table.Cell>
                          <Badge
                            colorPalette={isOccupied ? "blue" : isMaint ? "orange" : "green"}
                            fontSize="10px"
                          >
                            {unit.status.toUpperCase()}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell fontSize="xs" color="gray.600">
                          {unit.activeAssignment ? (
                            <Text>
                              {unit.activeAssignment.bookings?.reference} (
                              {unit.activeAssignment.bookings?.guest_name})
                            </Text>
                          ) : (
                            "—"
                          )}
                        </Table.Cell>
                        <Table.Cell>
                          {isOccupied ? (
                            <Text fontSize="xs" color="gray.400" fontStyle="italic">
                              Occupied (Manage via check-out)
                            </Text>
                          ) : (
                            <Button
                              size="xs"
                              variant="outline"
                              colorPalette={isMaint ? "green" : "orange"}
                              onClick={() =>
                                handleUpdateUnitStatus(
                                  unit.id,
                                  isMaint ? "available" : "maintenance"
                                )
                              }
                              loading={actionLoading}
                            >
                              {isMaint ? "Set Available" : "Set Maintenance"}
                            </Button>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            )}

            <Flex justify="flex-end" pt={2} borderTop="1px solid" borderColor="gray.200">
              <Button size="sm" onClick={() => setSelectedRoomType(null)}>
                Done
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
    </AdminLayout>
  );
}
