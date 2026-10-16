import React, { useState, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Icon,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import {
  FaFileAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaGlobe,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";

interface ContentPageProps {
  adminUser: AdminUserSession;
}

const AVAILABLE_PAGES = [
  { key: "about", label: "About & Our Story" },
  { key: "facilities", label: "Facilities Showcase" },
  { key: "gems", label: "Off-Beat Gems" },
  { key: "events", label: "Events & Gatherings" },
  { key: "contact", label: "Contact Information" },
  { key: "privacy", label: "Privacy Policy (NDPR/NDPA)" },
  { key: "terms", label: "Terms & Conditions" },
];

export const getServerSideProps: GetServerSideProps<ContentPageProps> = async (ctx) => {
  return requireAdminPage<ContentPageProps>(ctx, [
    "content_manager",
    "resort_admin",
    "super_admin",
  ]);
};

export default function AdminContentPage({ adminUser }: ContentPageProps) {
  const [activePage, setActivePage] = useState("about");
  const [contentJson, setContentJson] = useState<string>("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const fetchContent = useCallback(async (pageKey: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/content/${pageKey}`);
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setContentJson(JSON.stringify(json.data, null, 2));
      } else {
        setContentJson("{}");
      }
    } catch {
      setContentJson("{}");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent(activePage);
  }, [activePage, fetchContent]);

  const handleSave = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(contentJson);
    } catch {
      setFeedback({ type: "error", message: "Invalid JSON format. Please verify syntax." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/content/${activePage}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: "success",
          message: `Content for '${activePage}' published successfully!`,
        });
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to publish content.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error saving content." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Content Management (CMS)"
      user={adminUser}
      breadcrumbs={[{ label: "Content CMS" }]}
    >
      <Box mb={6}>
        <Heading as="h1" size="lg" color="gray.800">
          Managed Content Pages
        </Heading>
        <Text fontSize="sm" color="gray.600">
          Update copy, mission statements, and policies across public marketing pages.
        </Text>
      </Box>

      {feedback && (
        <Box
          bg={feedback.type === "success" ? "green.50" : "red.50"}
          color={feedback.type === "success" ? "green.700" : "red.700"}
          p={3}
          borderRadius="md"
          mb={4}
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

      <Flex gap={6} direction={{ base: "column", md: "row" }} align="flex-start">
        {/* Page selector sidebar */}
        <Box
          w={{ base: "100%", md: "240px" }}
          bg="white"
          p={3}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          boxShadow="sm"
          flexShrink={0}
        >
          <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={3} px={2}>
            Select Page
          </Text>
          <VStack align="stretch" gap={1}>
            {AVAILABLE_PAGES.map((page) => {
              const isActive = activePage === page.key;
              return (
                <Box
                  key={page.key}
                  px={3}
                  py={2}
                  borderRadius="md"
                  cursor="pointer"
                  bg={isActive ? "blue.50" : "transparent"}
                  color={isActive ? "blue.700" : "gray.700"}
                  fontWeight={isActive ? "semibold" : "normal"}
                  border="1px solid"
                  borderColor={isActive ? "blue.200" : "transparent"}
                  _hover={{ bg: isActive ? "blue.50" : "gray.50" }}
                  onClick={() => setActivePage(page.key)}
                >
                  <HStack justify="space-between">
                    <Text fontSize="sm">{page.label}</Text>
                    {isActive && <Icon as={FaFileAlt} boxSize={3} color="blue.500" />}
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        </Box>

        {/* Editor panel */}
        <Box
          flex="1"
          bg="white"
          p={6}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          boxShadow="sm"
          minW={0}
          w="100%"
        >
          <Flex justify="space-between" align="center" mb={4} pb={3} borderBottom="1px solid" borderColor="gray.100">
            <HStack gap={2}>
              <Icon as={FaGlobe} color="blue.500" />
              <Heading size="md" color="gray.800">
                {AVAILABLE_PAGES.find((p) => p.key === activePage)?.label}
              </Heading>
              <Badge colorScheme="blue" fontSize="10px">
                /{activePage}
              </Badge>
            </HStack>

            <Button
              size="sm"
              colorScheme="blue"
              onClick={handleSave}
              loading={saving || loading}
            >
              Publish Changes
            </Button>
          </Flex>

          {loading ? (
            <Flex justify="center" p={12}>
              <Spinner size="lg" color="blue.500" />
            </Flex>
          ) : (
            <VStack align="stretch" gap={4}>
              <Text fontSize="xs" color="gray.500">
                Structured content schema for this page. Edit fields and click Publish Changes.
              </Text>
              <textarea
                rows={16}
                value={contentJson}
                onChange={(e) => setContentJson(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E0",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  background: "#FAFAFA",
                }}
              />
            </VStack>
          )}
        </Box>
      </Flex>
    </AdminLayout>
  );
}
