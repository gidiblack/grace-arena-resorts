import React, { useState } from "react";
import { Box, Flex, HStack, Icon, Input, Stack, Text, Dialog, Portal } from "@chakra-ui/react";
import Button from "@/components/ui/button";
import { cleanupModalLocks, useModalCleanup } from "@/helpers/modal-cleanup";
import { FaBell, FaCheckCircle, FaHardHat, FaTimes } from "react-icons/fa";

interface NotifyMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTitle: string;
  campusName: string;
  roomTypeId?: string;
}

export const NotifyMeModal: React.FC<NotifyMeModalProps> = ({
  isOpen,
  onClose,
  roomTitle,
  campusName,
  roomTypeId,
}) => {
  useModalCleanup(isOpen);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [responseMsg, setResponseMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/notify-me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: phone || undefined,
          roomTypeId,
          roomTitle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error?.message || "Failed to register for notifications"
        );
      }

      setResponseMsg(data.data?.message || data.message || "You are on the priority list!");
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to register. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAndClose = () => {
    cleanupModalLocks();
    onClose();
    setTimeout(() => {
      setSubmitted(false);
      setEmail("");
      setPhone("");
      setErrorMessage("");
      setResponseMsg("");
    }, 300);
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => {
        if (!details.open) {
          handleResetAndClose();
          cleanupModalLocks();
        }
      }}
      preventScroll={false}
      trapFocus={false}
      restoreFocus={false}
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.800" backdropFilter="blur(8px)" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="#0F172A"
            color="light.500"
            border="1px solid #334155"
            borderRadius="20px"
            p={{ base: 6, md: 8 }}
            maxW="480px"
            maxH="90vh"
            overflowY="auto"
            w="92vw"
            boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.75)"
            tabIndex={-1}
          >
            <Flex justify="space-between" align="center" mb={4}>
              <HStack gap={2}>
                <Box bg="amber.500/20" color="#F59E0B" p={2} borderRadius="10px">
                  <Icon as={FaHardHat} boxSize={5} />
                </Box>
                <Box>
                  <Text
                    fontSize="12px"
                    fontWeight="bold"
                    color="#F59E0B"
                    letterSpacing="wide"
                    textTransform="uppercase"
                  >
                    Under Construction
                  </Text>
                  <Dialog.Title fontSize="18px" fontWeight="bold">
                    {roomTitle}
                  </Dialog.Title>
                </Box>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  aria-label="Close dialog"
                  tabIndex={0}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "6px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    color: "#94A3B8",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon as={FaTimes} boxSize={4} />
                </button>
              </Dialog.CloseTrigger>
            </Flex>

            {submitted ? (
              <Stack align="center" textAlign="center" py={6} gap={4}>
                <Icon as={FaCheckCircle} color="green.400" boxSize={12} />
                <Text fontSize="18px" fontWeight="bold" color="white">
                  You’re on the Priority List!
                </Text>
                <Text fontSize="13px" color="gray.300" maxW="360px">
                  {responseMsg} We will email you at{" "}
                  <strong style={{ color: "#FCCA46" }}>{email}</strong> the moment bookings open for
                  the <strong>{roomTitle}</strong> at {campusName}.
                </Text>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleResetAndClose}
                  style={{ marginTop: "12px" }}
                >
                  Done
                </Button>
              </Stack>
            ) : (
              <form onSubmit={handleSubmit}>
                <Stack gap={4}>
                  {errorMessage && (
                    <Box
                      bg="red.900/40"
                      border="1px solid"
                      borderColor="red.500"
                      p={2.5}
                      borderRadius="8px"
                    >
                      <Text fontSize="12px" color="red.300">
                        {errorMessage}
                      </Text>
                    </Box>
                  )}
                  <Dialog.Description fontSize="13px" color="gray.300" lineHeight="tall">
                    The {roomTitle} is currently undergoing exquisite architectural finishing.
                    Register below to receive exclusive early-bird access and special opening rates.
                  </Dialog.Description>

                  <Box>
                    <Text fontSize="12px" fontWeight="medium" mb={1.5} color="gray.300">
                      Email Address *
                    </Text>
                    <Input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. grace@example.com"
                      bg="#1E293B"
                      border="1px solid #475569"
                      color="white"
                      px={3.5}
                      py={2.5}
                      borderRadius="8px"
                      fontSize="14px"
                      _placeholder={{ color: "gray.400", opacity: 1 }}
                      _focus={{ borderColor: "brand.gold", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
                    />
                  </Box>

                  <Box>
                    <Text fontSize="12px" fontWeight="medium" mb={1.5} color="gray.300">
                      WhatsApp Number (Optional)
                    </Text>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +234 812 345 6789"
                      bg="#1E293B"
                      border="1px solid #475569"
                      color="white"
                      px={3.5}
                      py={2.5}
                      borderRadius="8px"
                      fontSize="14px"
                      _placeholder={{ color: "gray.400", opacity: 1 }}
                      _focus={{ borderColor: "brand.gold", outline: "none", boxShadow: "0 0 0 1px #D4AF37" }}
                    />
                  </Box>

                  <Flex justify="flex-end" gap={3} mt={4}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleResetAndClose}
                      style={{ fontSize: "13px", padding: "8px 18px" }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isLoading}
                      style={{ fontSize: "13px", padding: "8px 22px" }}
                    >
                      <Icon as={FaBell} mr={1.5} />
                      {isLoading ? "Subscribing..." : "Notify Me"}
                    </Button>
                  </Flex>
                </Stack>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default NotifyMeModal;
