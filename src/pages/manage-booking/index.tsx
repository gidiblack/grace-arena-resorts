import React from "react";
import { Box, Text } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import RequestManageLinkForm from "@/features/booking/components/RequestManageLinkForm";

/**
 * Entry point for guests who booked without an account and need their private manage link.
 */
export default function FindBookingPage() {
  return (
    <PageWrapper
      title="Find Your Booking — Grace Arena Resorts"
      description="Get a private link to view, download, or cancel your Grace Arena Resorts reservation."
    >
      <Box bg="#0B132B" color="white" minH="80vh" py={{ base: 8, md: 14 }} px={4}>
        <Box
          maxW="520px"
          mx="auto"
          bg="#0F172A"
          p={6}
          borderRadius="16px"
          border="1px solid #1E293B"
        >
          <Text as="h1" fontSize={{ base: "24px", md: "30px" }} fontWeight="extrabold" mb={2}>
            Find Your Booking
          </Text>
          <Text fontSize="14px" color="gray.300" mb={6}>
            Booked without an account? Enter your reference and email and we&apos;ll send you a
            private link to view, download, or cancel your reservation.
          </Text>
          <RequestManageLinkForm />
        </Box>
      </Box>
    </PageWrapper>
  );
}
