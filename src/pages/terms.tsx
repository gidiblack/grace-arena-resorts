import React from "react";
import { Box, Stack, Text } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";

export default function TermsPage() {
  return (
    <PageWrapper
      title="Terms & Conditions — Grace Arena Resorts"
      description="Terms and conditions for lodging, retreats, and reservations at Grace Arena Resorts."
    >
      <Box
        bg="linear-gradient(rgba(7, 7, 7, 0.75), rgba(7, 7, 7, 0.95)), #070707"
        pt={{ base: "100px", md: "130px" }}
        pb={{ base: 10, md: 14 }}
        px={{ base: 4, md: 8 }}
        color="white"
        textAlign="center"
      >
        <Stack maxW="46rem" mx="auto" gap={2} align="center">
          <Text
            fontSize="12px"
            fontWeight="bold"
            color="accent.500"
            letterSpacing="3px"
            textTransform="uppercase"
          >
            Guest Policy &amp; Guidelines
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "42px" }} fontWeight="bold">
            Terms &amp; Conditions
          </Text>
        </Stack>
      </Box>

      <Box py={{ base: 12, md: 16 }} px={{ base: 4, md: 8, xl: 12 }} bg="#070707" color="gray.300">
        <Box
          maxW="54rem"
          mx="auto"
          bg="#0F172A"
          p={{ base: 6, md: 10 }}
          borderRadius="24px"
          border="1px solid #1E293B"
        >
          <Stack gap={6} lineHeight="tall" fontSize="14px">
            <Box>
              <Text fontSize="18px" fontWeight="bold" color="white" mb={2}>
                1. Christian Retreat Conduct &amp; Family Harmony
              </Text>
              <Text>
                Grace Arena Resorts is dedicated to Christian sanctity, peace, and wholesome family
                relaxation. Possession or consumption of open alcoholic beverages, illicit
                substances, or conduct causing disturbance to fellow guests in prayer or quiet
                reflection is prohibited on the grounds.
              </Text>
            </Box>

            <Box>
              <Text fontSize="18px" fontWeight="bold" color="white" mb={2}>
                2. Check-In &amp; Check-Out
              </Text>
              <Text>
                Standard check-in time is 2:00 PM and check-out time is 11:00 AM. Late check-out may
                be requested in advance subject to room occupancy. Valid government identification
                is required upon arrival.
              </Text>
            </Box>

            <Box>
              <Text fontSize="18px" fontWeight="bold" color="white" mb={2}>
                3. Cancellation &amp; Refund Policy
              </Text>
              <Text>
                Cancellations made 7 or more days prior to check-in are eligible for a full refund
                minus a 5% administrative processing fee. Cancellations made between 3 to 6 days
                prior to check-in are eligible for a 50% refund. Cancellations within 48 hours of
                arrival or no-shows are non-refundable.
              </Text>
            </Box>
          </Stack>
        </Box>
      </Box>
    </PageWrapper>
  );
}
