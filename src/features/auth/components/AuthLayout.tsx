import React from "react";
import { Box, Flex, Heading, Text, Stack } from "@chakra-ui/react";
import NextLink from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import { ROUTES } from "@/constants/ROUTES";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <PageWrapper title={`${title} — Grace Arena Resorts`} description={subtitle}>
      <Flex
        minH="100vh"
        align="center"
        justify="center"
        pt={{ base: "110px", md: "140px" }}
        pb={{ base: 12, md: 16 }}
        px={4}
        bg="linear-gradient(180deg, #F7FAFC 0%, #EDF2F7 100%)"
      >
        <Box
          data-theme="light"
          w="full"
          maxW="480px"
          bg="white"
          boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)"
          borderRadius="2xl"
          p={{ base: 6, md: 8 }}
          border="1px solid"
          borderColor="gray.100"
        >
          <Stack gap={6} textAlign="center" mb={6}>
            <NextLink href={ROUTES.home}>
              <Text
                fontSize="sm"
                fontWeight="bold"
                letterSpacing="widest"
                textTransform="uppercase"
                color="yellow.600"
              >
                Grace Arena Resorts
              </Text>
            </NextLink>
            <Heading
              as="h1"
              fontSize={{ base: "2xl", md: "3xl" }}
              color="gray.800"
              fontWeight="bold"
            >
              {title}
            </Heading>
            <Text fontSize="sm" color="gray.600">
              {subtitle}
            </Text>
          </Stack>
          {children}
        </Box>
      </Flex>
    </PageWrapper>
  );
}
