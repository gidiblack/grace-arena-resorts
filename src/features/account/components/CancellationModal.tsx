import React, { useState, useEffect } from "react";
import { Box, Flex, HStack, Icon, Stack, Text, Badge, Textarea, Spinner } from "@chakra-ui/react";
import Button from "@/components/ui/button";
import { FaExclamationTriangle, FaTimes, FaUndo } from "react-icons/fa";

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingReference: string;
  onSuccess: () => void;
  /** Booking access token for guests managing a booking without an account */
  accessToken?: string;
}

interface RefundPreview {
  bookingReference: string;
  checkInDate: string;
  hoursUntilCheckIn: number;
  policyTier: "full_refund" | "partial_refund" | "no_refund";
  refundPercentage: number;
  bookingTotal: number;
  estimatedRefundAmount: number;
  reason: string;
}

export default function CancellationModal({
  isOpen,
  onClose,
  bookingReference,
  onSuccess,
  accessToken,
}: CancellationModalProps) {
  const tokenQuery = accessToken ? `?t=${encodeURIComponent(accessToken)}` : "";
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [preview, setPreview] = useState<RefundPreview | null>(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !bookingReference) return;
    setLoadingPreview(true);
    setError(null);

    async function loadPreview() {
      try {
        const res = await fetch(`/api/v1/bookings/${bookingReference}/cancel${tokenQuery}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setPreview(json.data);
        } else {
          setError(json.error?.message || "Failed to calculate refund preview.");
        }
      } catch {
        setError("Network error loading cancellation policy details.");
      } finally {
        setLoadingPreview(false);
      }
    }

    loadPreview();
  }, [isOpen, bookingReference, tokenQuery]);

  if (!isOpen) return null;

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingReference}/cancel${tokenQuery}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Guest requested cancellation" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        onSuccess();
        onClose();
      } else {
        setError(json.error?.message || "Failed to cancel reservation.");
      }
    } catch {
      setError("Network error while processing cancellation.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      w="100vw"
      h="100vh"
      bg="rgba(0, 0, 0, 0.75)"
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <Box
        bg="#0F172A"
        color="white"
        p={{ base: 6, md: 8 }}
        borderRadius="20px"
        border="1px solid #1E293B"
        maxWidth="540px"
        w="100%"
        position="relative"
      >
        {/* Close Button */}
        <Box
          position="absolute"
          top={4}
          right={4}
          cursor="pointer"
          onClick={onClose}
          color="gray.400"
          _hover={{ color: "white" }}
        >
          <Icon as={FaTimes} boxSize={5} />
        </Box>

        <HStack gap={3} mb={4}>
          <Icon as={FaExclamationTriangle} color="#FC8181" boxSize={6} />
          <Text fontSize="20px" fontWeight="bold">
            Cancel Reservation
          </Text>
        </HStack>

        <Text fontSize="13px" color="gray.400" mb={6}>
          Booking Reference:{" "}
          <Text as="span" color="accent.500" fontWeight="bold">
            {bookingReference}
          </Text>
        </Text>

        {loadingPreview ? (
          <Flex justify="center" py={8}>
            <Spinner color="accent.500" />
          </Flex>
        ) : error ? (
          <Box
            p={3}
            mb={4}
            borderRadius="8px"
            bg="rgba(229, 62, 62, 0.15)"
            color="#FC8181"
            fontSize="13px"
          >
            {error}
          </Box>
        ) : preview ? (
          <Stack gap={4} mb={6}>
            {/* Refund Tier Card */}
            <Box bg="#1E293B" p={4} borderRadius="12px" border="1px solid #334155">
              <Text fontSize="12px" color="gray.400" textTransform="uppercase" mb={1}>
                Cancellation Refund Policy
              </Text>

              <Flex justify="space-between" align="center" mb={2}>
                <Text fontSize="15px" fontWeight="bold">
                  Estimated Refund:
                </Text>
                <Badge
                  bg={
                    preview.refundPercentage === 100
                      ? "rgba(72, 187, 120, 0.2)"
                      : preview.refundPercentage === 50
                        ? "rgba(252, 202, 70, 0.2)"
                        : "rgba(229, 62, 62, 0.2)"
                  }
                  color={
                    preview.refundPercentage === 100
                      ? "#48BB78"
                      : preview.refundPercentage === 50
                        ? "accent.500"
                        : "#FC8181"
                  }
                  px={2.5}
                  py={0.5}
                  borderRadius="full"
                  fontSize="12px"
                  fontWeight="bold"
                >
                  {preview.refundPercentage}% Refund (
                  {preview.policyTier === "full_refund"
                    ? "Full"
                    : preview.policyTier === "partial_refund"
                      ? "50%"
                      : "No Refund"}
                  )
                </Badge>
              </Flex>

              <Text fontSize="22px" fontWeight="extrabold" color="accent.500" mb={2}>
                ₦{preview.estimatedRefundAmount.toLocaleString()}
              </Text>

              <Text fontSize="12px" color="gray.400">
                {preview.reason}
              </Text>
            </Box>

            {/* Policy Breakdown Legend */}
            <Box fontSize="11px" color="gray.400" bg="#131D31" p={3} borderRadius="8px">
              <Text fontWeight="bold" color="gray.300" mb={1}>
                Grace Arena Resorts Standard Policy:
              </Text>
              <Text>• &ge; 72 hours before check-in: 100% full refund</Text>
              <Text>• 24 to 72 hours before check-in: 50% partial refund</Text>
              <Text>• &lt; 24 hours before check-in: No refund</Text>
            </Box>

            {/* Optional Reason */}
            <Box>
              <Text fontSize="12px" fontWeight="medium" mb={1} color="gray.300">
                Reason for Cancellation (Optional)
              </Text>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please let us know why you need to cancel..."
                bg="#1E293B"
                border="1px solid #334155"
                color="white"
                fontSize="12px"
                p={2.5}
                borderRadius="8px"
                rows={2}
                _placeholder={{ color: "gray.400", opacity: 1 }}
                _focus={{
                  borderColor: "brand.gold",
                  outline: "none",
                  boxShadow: "0 0 0 1px #D4AF37",
                }}
              />
            </Box>
          </Stack>
        ) : null}

        {/* Buttons */}
        <Flex justify="flex-end" gap={3}>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={cancelling}>
            Keep Reservation
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={cancelling || loadingPreview}
            onClick={handleConfirmCancel}
            style={{ backgroundColor: "#E53E3E", borderColor: "#E53E3E", color: "white" }}
          >
            <HStack gap={2}>
              <Icon as={FaUndo} />
              <Text>{cancelling ? "Cancelling..." : "Confirm Cancellation"}</Text>
            </HStack>
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}
