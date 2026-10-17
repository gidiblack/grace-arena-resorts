import React, { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Heading,
  Input,
  Textarea,
  Button,
  SimpleGrid,
  Icon,
} from "@chakra-ui/react";
import { FaUserPlus, FaCalendarAlt, FaCreditCard, FaExclamationCircle } from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import { formatNgn } from "@/lib/formatters/currency";
import { addCalendarDays, resortToday } from "@/domain/booking/time";

interface NewAdminBookingPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<NewAdminBookingPageProps> = async (ctx) => {
  return requireAdminPage<NewAdminBookingPageProps>(ctx, ["resort_admin", "super_admin"]);
};

interface RoomTypeOption {
  id: string;
  name: string;
  tier?: string;
  price: number;
  max_guests?: number;
}

export default function NewAdminBookingPage({ adminUser }: NewAdminBookingPageProps) {
  const router = useRouter();
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [source, setSource] = useState("whatsapp");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+234");
  const [specialRequests, setSpecialRequests] = useState("");

  const tomorrow = addCalendarDays(resortToday(), 1);
  const [checkInDate, setCheckInDate] = useState(tomorrow);
  const [nights, setNights] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "cash" | "pos">(
    "bank_transfer"
  );
  const [paymentReference, setPaymentReference] = useState("");

  useEffect(() => {
    async function loadRoomTypes() {
      try {
        const res = await fetch("/api/v1/rooms?isUnderConstruction=false");
        const json = await res.json();
        if (res.ok && json.success) {
          const rawRooms = (json.data || []) as Array<Record<string, unknown>>;
          const rooms: RoomTypeOption[] = rawRooms.map((r) => ({
            id: String(r.id),
            name: String(r.name),
            tier: r.tier ? String(r.tier) : undefined,
            price: Number(r.price ?? r.basePrice ?? r.base_price ?? 0),
            max_guests: r.maxGuests != null ? Number(r.maxGuests) : undefined,
          }));
          setRoomTypes(rooms);
          if (rooms.length > 0) {
            setSelectedRoomTypeId(rooms[0].id);
          }
        }
      } catch {
        // Handled silently
      } finally {
        setLoadingRooms(false);
      }
    }
    loadRoomTypes();
  }, []);

  const selectedRoom = roomTypes.find((r) => r.id === selectedRoomTypeId);
  const estimatedSubtotal = selectedRoom ? selectedRoom.price * quantity * nights : 0;
  const estimatedTax = Math.round(estimatedSubtotal * 0.075);
  const estimatedTotal = estimatedSubtotal + estimatedTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError("Guest name and email address are required.");
      return;
    }

    if (!/^\+234\d{10}$/.test(phone.trim())) {
      setError("Phone number must be in Nigerian format: +234XXXXXXXXXX");
      return;
    }

    if (!selectedRoomTypeId) {
      setError("Please select a room type.");
      return;
    }

    if (paymentMethod === "bank_transfer" && !paymentReference.trim()) {
      setError("Payment reference is required for bank transfer payments.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        checkInDate,
        nights: Number(nights),
        adults: Number(adults),
        children: Number(children),
        rooms: [
          {
            roomTypeId: selectedRoomTypeId,
            quantity: Number(quantity),
          },
        ],
        guest: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          specialRequests: `[Source: ${source.toUpperCase()}]\n${specialRequests.trim()}`.trim(),
        },
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        privacyConsent: true,
      };

      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        const ref = json.data?.booking?.reference;
        router.push(`/admin/bookings/${ref}`);
      } else {
        setError(json.error?.message || "Failed to create reservation");
      }
    } catch {
      setError("An unexpected server error occurred creating the booking.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Create Reservation"
      user={adminUser}
      breadcrumbs={[
        { label: "Bookings", href: "/admin/bookings" },
        { label: "Create Reservation" },
      ]}
    >
      <Box maxW="900px" mx="auto">
        <Box mb={6}>
          <Heading size="lg" color="gray.800">
            Create Reservation (Admin / Concierge)
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Create a confirmed walk-in, WhatsApp concierge, or phone reservation and settle payment
            immediately.
          </Text>
        </Box>

        {error && (
          <Box
            bg="red.50"
            color="red.700"
            p={4}
            borderRadius="md"
            mb={6}
            border="1px solid"
            borderColor="red.200"
          >
            <HStack gap={2}>
              <Icon as={FaExclamationCircle} />
              <Text fontWeight="semibold">{error}</Text>
            </HStack>
          </Box>
        )}

        <Box
          as="form"
          onSubmit={handleSubmit}
          bg="white"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          boxShadow="sm"
        >
          <VStack align="stretch" gap={6}>
            {/* Booking Channel / Source */}
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Reservation Source / Channel
              </Text>
              <select
                style={{
                  height: "32px",
                  padding: "0 8px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E0",
                  background: "white",
                  color: "#2D3748",
                  maxWidth: "300px",
                  width: "100%",
                }}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="whatsapp">WhatsApp Concierge</option>
                <option value="phone">Phone Booking</option>
                <option value="front_desk">Front Desk Walk-In</option>
              </select>
            </Box>

            {/* Guest Details */}
            <Box>
              <HStack mb={3} gap={2}>
                <Icon as={FaUserPlus} color="blue.500" />
                <Heading size="sm">Guest Details</Heading>
              </HStack>
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Full Name *
                  </Text>
                  <Input
                    size="sm"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Adebayo Ogunlesi"
                    required
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Email Address *
                  </Text>
                  <Input
                    size="sm"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. guest@example.com"
                    required
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Phone Number (+234) *
                  </Text>
                  <Input
                    size="sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+2348012345678"
                    required
                  />
                </Box>
              </SimpleGrid>
            </Box>

            {/* Dates & Stay */}
            <Box>
              <HStack mb={3} gap={2}>
                <Icon as={FaCalendarAlt} color="blue.500" />
                <Heading size="sm">Stay & Room Selection</Heading>
              </HStack>
              <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4} mb={4}>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Check-In Date *
                  </Text>
                  <Input
                    size="sm"
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    min={resortToday()}
                    required
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Nights (1-30)
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    min={1}
                    max={30}
                    value={nights}
                    onChange={(e) => setNights(Number(e.target.value))}
                    required
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Adults
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    min={1}
                    max={10}
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                  />
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Children
                  </Text>
                  <Input
                    size="sm"
                    type="number"
                    min={0}
                    max={10}
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                  />
                </Box>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Room Suite *
                  </Text>
                  <select
                    style={{
                      height: "32px",
                      padding: "0 8px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      background: "white",
                      color: "#2D3748",
                      width: "100%",
                    }}
                    value={selectedRoomTypeId}
                    onChange={(e) => setSelectedRoomTypeId(e.target.value)}
                    disabled={loadingRooms}
                  >
                    {roomTypes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.tier}) — {formatNgn(r.price)}/night
                      </option>
                    ))}
                  </select>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Quantity
                  </Text>
                  <select
                    style={{
                      height: "32px",
                      padding: "0 8px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      background: "white",
                      color: "#2D3748",
                      width: "100%",
                    }}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((q) => (
                      <option key={q} value={q}>
                        {q} room(s)
                      </option>
                    ))}
                  </select>
                </Box>
              </SimpleGrid>
            </Box>

            {/* Payment & Settlement */}
            <Box>
              <HStack mb={3} gap={2}>
                <Icon as={FaCreditCard} color="blue.500" />
                <Heading size="sm">Payment & Settlement</Heading>
              </HStack>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mb={3}>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Payment Method *
                  </Text>
                  <select
                    style={{
                      height: "32px",
                      padding: "0 8px",
                      fontSize: "12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      background: "white",
                      color: "#2D3748",
                      width: "100%",
                    }}
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as "bank_transfer" | "pos" | "cash")
                    }
                  >
                    <option value="bank_transfer">Bank Transfer (Zenith/Access Concierge)</option>
                    <option value="pos">POS Terminal (Card at Front Desk)</option>
                    <option value="cash">Cash (Front Desk)</option>
                  </select>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    Payment Reference {paymentMethod === "bank_transfer" ? "*" : "(Optional)"}
                  </Text>
                  <Input
                    size="sm"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={
                      paymentMethod === "bank_transfer"
                        ? "e.g. Bank session ID or transfer reference"
                        : "e.g. POS receipt reference"
                    }
                    required={paymentMethod === "bank_transfer"}
                  />
                </Box>
              </SimpleGrid>

              {/* Price Calculation Box */}
              <Box p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                <HStack justify="space-between" fontSize="sm" mb={1}>
                  <Text color="gray.600">
                    Subtotal ({nights} nights × {quantity} room)
                  </Text>
                  <Text fontWeight="medium">{formatNgn(estimatedSubtotal)}</Text>
                </HStack>
                <HStack justify="space-between" fontSize="sm" mb={2}>
                  <Text color="gray.600">VAT & Taxes (7.5%)</Text>
                  <Text fontWeight="medium">{formatNgn(estimatedTax)}</Text>
                </HStack>
                <HStack
                  justify="space-between"
                  fontSize="md"
                  pt={2}
                  borderTop="1px solid"
                  borderColor="gray.200"
                >
                  <Text fontWeight="bold">Total Due & Paid</Text>
                  <Text fontWeight="bold" color="blue.600">
                    {formatNgn(estimatedTotal)}
                  </Text>
                </HStack>
              </Box>
            </Box>

            {/* Special Requests */}
            <Box>
              <Text fontSize="xs" color="gray.600" mb={1}>
                Special Requests / Notes
              </Text>
              <Textarea
                size="sm"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Optional notes or guest preferences"
                rows={2}
              />
            </Box>

            {/* Submit Bar */}
            <Flex justify="flex-end" gap={3} pt={4} borderTop="1px solid" borderColor="gray.200">
              <Button size="sm" variant="outline" onClick={() => router.push("/admin/bookings")}>
                Cancel
              </Button>
              <Button size="sm" colorPalette="blue" type="submit" loading={submitting}>
                Create & Confirm Reservation
              </Button>
            </Flex>
          </VStack>
        </Box>
      </Box>
    </AdminLayout>
  );
}
