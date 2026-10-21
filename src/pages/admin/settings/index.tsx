import React, { useState, useEffect } from "react";
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
} from "@chakra-ui/react";
import { FaCheckCircle, FaExclamationCircle, FaSave } from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";

interface SettingsPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<SettingsPageProps> = async (ctx) => {
  return requireAdminPage<SettingsPageProps>(ctx, ["super_admin"]);
};

export default function AdminSettingsPage({ adminUser }: SettingsPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // System settings state
  const [taxRate, setTaxRate] = useState("0.075");
  const [checkinTime, setCheckinTime] = useState("14:00");
  const [checkoutTime, setCheckoutTime] = useState("11:00");
  const [pendingExpiryMinutes, setPendingExpiryMinutes] = useState("30");
  const [whatsappNumber, setWhatsappNumber] = useState("2348012345678");
  const [contactEmail, setContactEmail] = useState("info@gracearenaresorts.com");
  const [contactPhone, setContactPhone] = useState("+234 801 234 5678");
  const [mapCoordinates, setMapCoordinates] = useState("6.5244,3.3792");
  const [paystackDowntime, setPaystackDowntime] = useState("false");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/admin/settings");
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const s = json.data;
          if (s.tax_rate) setTaxRate(s.tax_rate);
          if (s.checkin_time) setCheckinTime(s.checkin_time);
          if (s.checkout_time) setCheckoutTime(s.checkout_time);
          if (s.pending_booking_expiry_minutes)
            setPendingExpiryMinutes(s.pending_booking_expiry_minutes);
          if (s.whatsapp_number) setWhatsappNumber(s.whatsapp_number);
          if (s.contact_email) setContactEmail(s.contact_email);
          if (s.contact_phone) setContactPhone(s.contact_phone);
          if (s.map_coordinates) setMapCoordinates(s.map_coordinates);
          if (s.paystack_downtime) setPaystackDowntime(s.paystack_downtime);
        }
      } catch {
        // Fallback to defaults
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload = {
      tax_rate: taxRate,
      checkin_time: checkinTime,
      checkout_time: checkoutTime,
      pending_booking_expiry_minutes: pendingExpiryMinutes,
      whatsapp_number: whatsappNumber,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      map_coordinates: mapCoordinates,
      paystack_downtime: paystackDowntime,
    };

    try {
      const res = await fetch("/api/v1/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: "System settings saved and applied successfully!",
        });
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to update system settings.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="System Settings"
      user={adminUser}
      breadcrumbs={[{ label: "System Settings" }]}
    >
      <Box maxW="800px" mx="auto">
        <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <Box>
            <HStack gap={2}>
              <Heading as="h1" size="lg" color="gray.800">
                Resort Operations & System Settings
              </Heading>
              <Badge colorPalette="red" fontSize="10px">
                Super Admin Only
              </Badge>
            </HStack>
            <Text fontSize="sm" color="gray.600">
              Configure global VAT tax rates, check-in/out times, contact handles, and payment
              fallback policies.
            </Text>
          </Box>
        </Flex>

        {feedback && (
          <Box
            bg={feedback.type === "success" ? "green.50" : "red.50"}
            color={feedback.type === "success" ? "green.700" : "red.700"}
            p={3}
            borderRadius="md"
            mb={6}
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
        ) : (
          <form onSubmit={handleSave}>
            <VStack gap={6} align="stretch">
              {/* 1. FINANCIAL & TAX CONFIG */}
              <Box
                bg="white"
                p={6}
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <Heading size="sm" color="gray.800" mb={1}>
                  1. Financial & Tax Configuration
                </Heading>
                <Text fontSize="xs" color="gray.500" mb={4}>
                  Applied dynamically to all booking engine room calculations.
                </Text>

                <Flex gap={4}>
                  <Box flex="1">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      VAT Rate (Default 0.075 for 7.5% VAT) *
                    </Text>
                    <input
                      type="text"
                      required
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
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
              </Box>

              {/* 2. OPERATIONAL & BOOKING TIMINGS */}
              <Box
                bg="white"
                p={6}
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <Heading size="sm" color="gray.800" mb={1}>
                  2. Operational Timings & Inventory Locks
                </Heading>
                <Text fontSize="xs" color="gray.500" mb={4}>
                  Check-in/out policies printed on booking vouchers and temporary hold release
                  windows.
                </Text>

                <Flex gap={4} flexWrap="wrap">
                  <Box flex="1" minW="180px">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Check-In Time *
                    </Text>
                    <input
                      type="text"
                      required
                      placeholder="14:00"
                      value={checkinTime}
                      onChange={(e) => setCheckinTime(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E0",
                        fontSize: "14px",
                      }}
                    />
                  </Box>

                  <Box flex="1" minW="180px">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Check-Out Time *
                    </Text>
                    <input
                      type="text"
                      required
                      placeholder="11:00"
                      value={checkoutTime}
                      onChange={(e) => setCheckoutTime(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #CBD5E0",
                        fontSize: "14px",
                      }}
                    />
                  </Box>

                  <Box flex="1" minW="180px">
                    <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                      Pending Hold Expiry (Mins) *
                    </Text>
                    <input
                      type="number"
                      required
                      min="5"
                      max="180"
                      value={pendingExpiryMinutes}
                      onChange={(e) => setPendingExpiryMinutes(e.target.value)}
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
              </Box>

              {/* 3. RESORT CONTACT & SOCIAL CHANNELS */}
              <Box
                bg="white"
                p={6}
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <Heading size="sm" color="gray.800" mb={1}>
                  3. Contact Information & Location
                </Heading>
                <Text fontSize="xs" color="gray.500" mb={4}>
                  Displayed on the public footer, Contact page, and WhatsApp concierge CTAs.
                </Text>

                <VStack gap={4} align="stretch">
                  <Flex gap={4} flexWrap="wrap">
                    <Box flex="1" minW="220px">
                      <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                        WhatsApp Concierge Number (Digits only, with country code) *
                      </Text>
                      <input
                        type="text"
                        required
                        placeholder="2348012345678"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E0",
                          fontSize: "14px",
                        }}
                      />
                    </Box>

                    <Box flex="1" minW="220px">
                      <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                        Contact Email *
                      </Text>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
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

                  <Flex gap={4} flexWrap="wrap">
                    <Box flex="1" minW="220px">
                      <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                        Contact Phone *
                      </Text>
                      <input
                        type="text"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #CBD5E0",
                          fontSize: "14px",
                        }}
                      />
                    </Box>

                    <Box flex="1" minW="220px">
                      <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                        Map Coordinates (Latitude, Longitude) *
                      </Text>
                      <input
                        type="text"
                        required
                        placeholder="7.4431,3.2842"
                        value={mapCoordinates}
                        onChange={(e) => setMapCoordinates(e.target.value)}
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
                </VStack>
              </Box>

              {/* 4. PAYMENT GATEWAY FALLBACK */}
              <Box
                bg="white"
                p={6}
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <Heading size="sm" color="gray.800" mb={1}>
                  4. Payment Gateway Downtime Override
                </Heading>
                <Text fontSize="xs" color="gray.500" mb={4}>
                  Activate to gracefully display bank-transfer / WhatsApp concierge fallback UI when
                  Paystack is experiencing downtime.
                </Text>

                <HStack gap={3}>
                  <select
                    value={paystackDowntime}
                    onChange={(e) => setPaystackDowntime(e.target.value)}
                    style={{
                      height: "36px",
                      padding: "0 12px",
                      fontSize: "13px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      background: "white",
                    }}
                  >
                    <option value="false">Standard Mode (Paystack Online Active)</option>
                    <option value="true">
                      Gateway Degradation Fallback (WhatsApp Concierge Mode)
                    </option>
                  </select>
                </HStack>
              </Box>

              <Flex justify="flex-end" pt={2}>
                <Button size="md" colorPalette="blue" type="submit" loading={saving}>
                  <HStack gap={2}>
                    <Icon as={FaSave} />
                    <Text>Save Settings</Text>
                  </HStack>
                </Button>
              </Flex>
            </VStack>
          </form>
        )}
      </Box>
    </AdminLayout>
  );
}
