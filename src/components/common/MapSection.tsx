import React, { useState } from "react";
import { Box, Flex, HStack, Icon, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import Button from "@/components/ui/button";
import { FaLocationDot, FaWhatsapp, FaCompass, FaMapLocationDot } from "react-icons/fa6";
import { MdDirectionsCar } from "react-icons/md";

interface MapSectionProps {
  title?: string;
  subtitle?: string;
  description?: string;
  showDetailsOnly?: boolean;
}

export const MapSection: React.FC<MapSectionProps> = ({
  title = "Located in Igbo-Ora — The Land of Twins",
  subtitle = "Finding Serenity",
  description = "Grace Arena Resorts is situated in the peaceful, scenic town of Igbo-Ora, Oyo State, famous globally for having the world's highest rate of twin births and surrounded by refreshing agrarian serenity.",
  showDetailsOnly = false,
}) => {
  const [embedFailed, setEmbedFailed] = useState(false);
  const [forceStaticFallback, setForceStaticFallback] = useState(false);

  const resortCoordinates = "7.4333° N, 3.2833° E";
  const directionsUrl = "https://maps.google.com/?q=Igbo-Ora+Oyo+State+Nigeria";
  const whatsappDirectionsUrl =
    "https://wa.me/2348123456789?text=Hello%20Grace%20Arena%20Resorts,%20I%20need%20driving%20directions%20to%20the%20resort.";

  return (
    <Box py={{ base: 14, md: 18 }} px={{ base: 4, md: 8, xl: 12 }} bg="white" color="#0F172A">
      <Box maxW="80rem" mx="auto">
        <SimpleGrid
          columns={{ base: 1, lg: showDetailsOnly ? 1 : 2 }}
          gap={{ base: 8, lg: 12 }}
          alignItems="center"
        >
          {/* Information Column */}
          <Stack gap={4}>
            {subtitle && (
              <Text
                fontSize="13px"
                fontWeight="bold"
                color="accent.600"
                letterSpacing="3px"
                textTransform="uppercase"
              >
                {subtitle}
              </Text>
            )}
            <Text
              as="h2"
              fontSize={{ base: "26px", md: "36px" }}
              fontWeight="bold"
              lineHeight="shorter"
            >
              {title}
            </Text>
            <Text fontSize="15px" color="#475569" lineHeight="tall">
              {description}
            </Text>

            <Stack gap={3.5} pt={2}>
              <HStack gap={3} align="flex-start">
                <Icon as={FaLocationDot} color="accent.500" boxSize={5} mt={1} />
                <Box>
                  <Text fontSize="14px" fontWeight="bold">
                    Resort Campus Address
                  </Text>
                  <Text fontSize="13px" color="#64748B">
                    Grace Arena Resorts, Igbo-Ora, Ibarapa Central Local Government, Oyo State,
                    Nigeria
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3} align="flex-start">
                <Icon as={FaCompass} color="accent.500" boxSize={4} mt={1} />
                <Box>
                  <Text fontSize="14px" fontWeight="bold">
                    GPS Coordinates
                  </Text>
                  <Text fontSize="13px" color="#64748B" fontFamily="monospace">
                    {resortCoordinates} (7.4333, 3.2833)
                  </Text>
                </Box>
              </HStack>

              <HStack gap={3} align="flex-start">
                <Icon as={MdDirectionsCar} color="accent.500" boxSize={5} mt={1} />
                <Box>
                  <Text fontSize="14px" fontWeight="bold">
                    Travel Times
                  </Text>
                  <Text fontSize="13px" color="#64748B">
                    ~50 mins from Abeokuta · ~1 hr 15 mins from Ibadan · ~2 hrs 30 mins from Lagos
                  </Text>
                </Box>
              </HStack>
            </Stack>

            <HStack gap={4} pt={4} flexWrap="wrap">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Button variant="primary" size="md">
                  Get Driving Directions
                </Button>
              </a>
              <a
                href={whatsappDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
              >
                <HStack
                  px={4}
                  py={2.5}
                  borderRadius="8px"
                  border="1px solid #25D366"
                  color="#16a34a"
                  _hover={{ bg: "rgba(37, 211, 102, 0.08)" }}
                  cursor="pointer"
                  transition="all 0.2s"
                >
                  <Icon as={FaWhatsapp} boxSize={4} />
                  <Text fontSize="14px" fontWeight="bold">
                    WhatsApp Concierge
                  </Text>
                </HStack>
              </a>
            </HStack>
          </Stack>

          {/* Map Frame / Card with Fallback */}
          {!showDetailsOnly && (
            <Box
              h={{ base: "320px", md: "380px" }}
              borderRadius="20px"
              overflow="hidden"
              boxShadow="0 10px 30px rgba(0,0,0,0.08)"
              border="1px solid #CBD5E1"
              position="relative"
              bg="#0F172A"
            >
              {!embedFailed && !forceStaticFallback ? (
                <iframe
                  title="Grace Arena Resorts Location Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126435.53982449757!2d3.20815185!3d7.433333!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x10398bb2c2b3c299%3A0x6b63d91cf97ceea7!2sIgbo-Ora%2C%20Oyo!5e0!3m2!1sen!2sng!4v1700000000000"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  onError={() => setEmbedFailed(true)}
                />
              ) : (
                /* Static Map Fallback Card */
                <Flex
                  w="full"
                  h="full"
                  p={6}
                  direction="column"
                  justify="center"
                  align="center"
                  textAlign="center"
                  bg="linear-gradient(145deg, #0F172A 0%, #1E293B 100%)"
                  color="white"
                  data-testid="map-static-fallback"
                >
                  <Icon as={FaMapLocationDot} boxSize={12} color="accent.500" mb={3} />
                  <Text fontSize="18px" fontWeight="bold" mb={1}>
                    Grace Arena Resorts Campus
                  </Text>
                  <Text fontSize="13px" color="gray.300" maxW="340px" mb={3}>
                    Igbo-Ora, Ibarapa Central Local Government, Oyo State, Nigeria
                  </Text>
                  <Text fontSize="12px" color="accent.400" fontFamily="monospace" mb={4}>
                    Coordinates: {resortCoordinates}
                  </Text>
                  <HStack gap={3}>
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="primary" size="sm">
                        Open in Google Maps
                      </Button>
                    </a>
                    <button
                      type="button"
                      onClick={() => setForceStaticFallback(false)}
                      style={{
                        background: "transparent",
                        border: "1px solid #475569",
                        color: "white",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Retry Interactive Map
                    </button>
                  </HStack>
                </Flex>
              )}

              {/* Toggle button to test or view static map fallback */}
              {!embedFailed && !forceStaticFallback && (
                <Box position="absolute" bottom={3} right={3} zIndex={2}>
                  <button
                    type="button"
                    onClick={() => setForceStaticFallback(true)}
                    style={{
                      backgroundColor: "rgba(15, 23, 42, 0.85)",
                      color: "#E2E8F0",
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      cursor: "pointer",
                      backdropFilter: "blur(4px)",
                    }}
                    aria-label="View static fallback map"
                  >
                    Static View
                  </button>
                </Box>
              )}
            </Box>
          )}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default MapSection;
