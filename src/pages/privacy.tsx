import React from "react";
import { Box, Stack, Text } from "@chakra-ui/react";
import PageWrapper from "@/components/layout/PageWrapper";
import { generateWebPageJsonLd } from "@/lib/seo/meta";

export default function PrivacyPolicyPage() {
  return (
    <PageWrapper
      title="Privacy Policy (NDPR & GDPR) — Grace Arena Resorts"
      description="Grace Arena Resorts data protection policy under the Nigeria Data Protection Regulation (NDPR)."
      jsonLd={generateWebPageJsonLd({
        title: "Privacy Policy (NDPR & GDPR)",
        description:
          "Grace Arena Resorts data protection policy under the Nigeria Data Protection Regulation (NDPR).",
        url: "/privacy",
      })}
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
            Data Governance &amp; Trust
          </Text>
          <Text as="h1" fontSize={{ base: "30px", md: "42px" }} fontWeight="bold">
            Privacy Policy
          </Text>
          <Text fontSize="14px" color="gray.400">
            Last Updated: October 2026 • Compliant with NDPR 2019 and Nigeria Data Protection Act
            (NDPA)
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
                1. Introduction
              </Text>
              <Text>
                Grace Arena Resorts Ltd. (&ldquo;GAR&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or
                &ldquo;us&rdquo;) is committed to protecting the privacy, personal data, and rights
                of our guests, visitors, and website users. This Privacy Policy details our
                practices regarding information collection, storage, and usage in compliance with
                the Nigeria Data Protection Act (NDPA) and NDPR regulations.
              </Text>
            </Box>

            <Box>
              <Text fontSize="18px" fontWeight="bold" color="white" mb={2}>
                2. Information We Collect
              </Text>
              <Text>
                When you interact with our website or reserve accommodations, we may collect:
              </Text>
              <Box as="ul" pl={5} mt={2}>
                <li>Contact data: Full name, phone number, and email address.</li>
                <li>
                  Reservation records: Arrival/departure dates, room selections, and special
                  dietary/prayer requests.
                </li>
                <li>
                  Transaction records: Payment reference numbers and transaction status (processed
                  via Paystack; we do not store credit card CVVs).
                </li>
                <li>
                  Technical cookies: Essential security tokens and optional analytics preferences.
                </li>
              </Box>
            </Box>

            <Box>
              <Text fontSize="18px" fontWeight="bold" color="white" mb={2}>
                3. How We Use Your Data
              </Text>
              <Text>Your data is strictly utilized to:</Text>
              <Box as="ul" pl={5} mt={2}>
                <li>Process reservations and issue booking confirmation receipts.</li>
                <li>
                  Facilitate check-in and room assignments across GAR Elysian and GAR Village.
                </li>
                <li>Provide concierge assistance via WhatsApp or email.</li>
                <li>Send voluntary newsletter updates and retreat schedules when consented.</li>
              </Box>
            </Box>

            <Box>
              <Text fontSize="18px" fontWeight="bold" color="white" mb={2}>
                4. Data Protection &amp; Your Rights
              </Text>
              <Text>
                Under NDPR guidelines, you maintain the right to access, rectify, or request
                deletion of your personal records. For privacy inquiries or data requests, contact
                our Data Protection Officer at:{" "}
                <strong style={{ color: "#FCCA46" }}>privacy@gracearenaresorts.com</strong>.
              </Text>
            </Box>
          </Stack>
        </Box>
      </Box>
    </PageWrapper>
  );
}
