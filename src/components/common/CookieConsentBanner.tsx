import React, { useState, useEffect } from "react";
import { Box, Flex, HStack, Stack, Text, Dialog, Icon, Portal } from "@chakra-ui/react";
import Button from "@/components/ui/button";
import { cleanupModalLocks, useModalCleanup } from "@/helpers/modal-cleanup";
import { FaShieldAlt, FaTimes, FaCheck, FaLock } from "react-icons/fa";

export type CookieConsentState = {
  version: 1;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  consentedAt: string;
};

const COOKIE_KEY = "gar_cookie_consent";

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  useModalCleanup(modalOpen);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [marketingAllowed, setMarketingAllowed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem(COOKIE_KEY);
        if (!stored) {
          setIsVisible(true);
        } else {
          const parsed = JSON.parse(stored);
          setAnalyticsAllowed(Boolean(parsed.analytics));
          setMarketingAllowed(Boolean(parsed.marketing));
        }
      } catch {
        setIsVisible(true);
      }
    }, 50);

    const handleOpenSettings = () => {
      try {
        const stored = localStorage.getItem(COOKIE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setAnalyticsAllowed(Boolean(parsed.analytics));
          setMarketingAllowed(Boolean(parsed.marketing));
        }
      } catch {
        // ignore
      }
      setModalOpen(true);
    };

    window.addEventListener("gar:open-cookie-preferences", handleOpenSettings);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("gar:open-cookie-preferences", handleOpenSettings);
    };
  }, []);

  // Safeguard: Ensure scroll lock and pointer events are immediately restored whenever modal closes
  useEffect(() => {
    if (!modalOpen && typeof document !== "undefined") {
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("pointer-events");
      document.body.removeAttribute("data-scroll-locked");
      document.documentElement.style.removeProperty("overflow");
    }
  }, [modalOpen]);

  const saveConsent = (analytics: boolean, marketing: boolean) => {
    const consent: CookieConsentState = {
      version: 1,
      essential: true,
      analytics,
      marketing,
      consentedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(
        JSON.stringify(consent)
      )}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch (e) {
      console.warn("Could not save cookie consent", e);
    }
    setIsVisible(false);
    setModalOpen(false);
    cleanupModalLocks();
  };

  const handleAcceptAll = () => saveConsent(true, true);
  const handleRejectNonEssential = () => saveConsent(false, false);
  const handleSavePreferences = () => saveConsent(analyticsAllowed, marketingAllowed);

  return (
    <>
      {/* Bottom Bar: Only shown when initial consent is pending */}
      {isVisible && (
        <Box
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          zIndex={95}
          bg="rgba(15, 23, 42, 0.96)"
          backdropFilter="blur(16px)"
          borderTop="1px solid rgba(252, 202, 70, 0.3)"
          p={{ base: 4, md: 5 }}
          boxShadow="0 -10px 30px rgba(0, 0, 0, 0.45)"
          role="region"
          aria-label="Cookie and Privacy Consent"
        >
          <Flex
            maxW="85rem"
            mx="auto"
            flexDir={{ base: "column", lg: "row" }}
            align={{ base: "flex-start", lg: "center" }}
            justify="space-between"
            gap={4}
          >
            <HStack align="flex-start" gap={3} flex="1">
              <Icon as={FaShieldAlt} color="accent.500" boxSize={6} mt={1} />
              <Stack gap={1}>
                <Text fontSize="14px" fontWeight="semibold" color="light.500">
                  Your Privacy Matters (NDPR &amp; GDPR Compliant)
                </Text>
                <Text fontSize="12px" color="dark.100" maxW="48rem" lineHeight="tall">
                  Grace Arena Resorts uses essential cookies to ensure our website functions
                  securely and reliably. We also request your permission for optional analytics and
                  marketing cookies to enhance your experience.
                </Text>
              </Stack>
            </HStack>

            <Flex
              gap={3}
              w={{ base: "full", lg: "auto" }}
              flexWrap="wrap"
              align="center"
              justify={{ base: "flex-start", sm: "flex-end" }}
            >
              <Button
                variant="white"
                size="sm"
                onClick={() => setModalOpen(true)}
                style={{ fontSize: "12px", padding: "8px 16px" }}
              >
                Manage Preferences
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRejectNonEssential}
                style={{ fontSize: "12px", padding: "8px 16px", border: "1px solid #334155" }}
              >
                Essential Only
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAcceptAll}
                style={{ fontSize: "12px", padding: "8px 20px" }}
              >
                Accept All
              </Button>
            </Flex>
          </Flex>
        </Box>
      )}

      {/* Preferences Dialog: Persistently mounted in DOM with Portal so open/close transitions cleanly release scroll locks */}
      <Dialog.Root
        open={modalOpen}
        onOpenChange={(details) => {
          setModalOpen(details.open);
          if (!details.open) {
            cleanupModalLocks();
          }
        }}
        preventScroll={false}
        trapFocus={false}
        restoreFocus={false}
      >
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.850" backdropFilter="blur(6px)" />
          <Dialog.Positioner>
            <Dialog.Content
              bg="#111827"
              color="light.500"
              border="1px solid #374151"
              borderRadius="16px"
              p={{ base: 5, md: 7 }}
              maxW="540px"
              maxH="90vh"
              overflowY="auto"
              w="90vw"
              boxShadow="2xl"
              tabIndex={-1}
            >
            <Flex justify="space-between" align="center" mb={4}>
              <HStack gap={2}>
                <Icon as={FaShieldAlt} color="accent.500" boxSize={5} />
                <Dialog.Title fontSize="18px" fontWeight="bold">
                  Cookie &amp; Privacy Preferences
                </Dialog.Title>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close preferences"
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

            <Stack gap={4} my={3}>
              {/* Essential */}
              <Box p={3.5} borderRadius="10px" bg="#1f2937" border="1px solid #374151">
                <Flex justify="space-between" align="center">
                  <HStack gap={2}>
                    <Icon as={FaLock} color="accent.500" boxSize={3.5} />
                    <Text fontSize="14px" fontWeight="bold">
                      Essential Cookies
                    </Text>
                  </HStack>
                  <Text
                    fontSize="11px"
                    fontWeight="bold"
                    color="green.400"
                    bg="green.950"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                  >
                    ALWAYS ACTIVE
                  </Text>
                </Flex>
                <Text fontSize="12px" color="gray.300" mt={1.5} lineHeight="shorter">
                  Required for core site security, booking sessions, user authentication, and NDPR
                  verification.
                </Text>
              </Box>

              {/* Analytics */}
              <Box p={3.5} borderRadius="10px" bg="#1f2937" border="1px solid #374151">
                <Flex justify="space-between" align="center">
                  <Text fontSize="14px" fontWeight="bold">
                    Analytics &amp; Performance
                  </Text>
                  <Box
                    as="button"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="12px"
                    fontWeight="semibold"
                    bg={analyticsAllowed ? "accent.500" : "#374151"}
                    color={analyticsAllowed ? "dark.500" : "gray.300"}
                    onClick={() => setAnalyticsAllowed(!analyticsAllowed)}
                    cursor="pointer"
                    aria-label={`Toggle Analytics cookies, currently ${analyticsAllowed ? "enabled" : "disabled"}`}
                  >
                    {analyticsAllowed ? "Enabled" : "Disabled"}
                  </Box>
                </Flex>
                <Text fontSize="12px" color="gray.300" mt={1.5} lineHeight="shorter">
                  Allows us to measure traffic and feature usage anonymously to refine resort
                  amenities and navigation.
                </Text>
              </Box>

              {/* Marketing */}
              <Box p={3.5} borderRadius="10px" bg="#1f2937" border="1px solid #374151">
                <Flex justify="space-between" align="center">
                  <Text fontSize="14px" fontWeight="bold">
                    Personalized Offers
                  </Text>
                  <Box
                    as="button"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="12px"
                    fontWeight="semibold"
                    bg={marketingAllowed ? "accent.500" : "#374151"}
                    color={marketingAllowed ? "dark.500" : "gray.300"}
                    onClick={() => setMarketingAllowed(!marketingAllowed)}
                    cursor="pointer"
                    aria-label={`Toggle Marketing cookies, currently ${marketingAllowed ? "enabled" : "disabled"}`}
                  >
                    {marketingAllowed ? "Enabled" : "Disabled"}
                  </Box>
                </Flex>
                <Text fontSize="12px" color="gray.300" mt={1.5} lineHeight="shorter">
                  Enables seasonal deals and retreat package notifications tailored to your booking
                  interests.
                </Text>
              </Box>
            </Stack>

            <Flex justify="flex-end" gap={3} mt={5}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModalOpen(false)}
                style={{ fontSize: "12px", padding: "6px 16px" }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSavePreferences}
                style={{ fontSize: "12px", padding: "6px 18px" }}
              >
                <Icon as={FaCheck} mr={1} /> Save Preferences
              </Button>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
};

export default CookieConsentBanner;
