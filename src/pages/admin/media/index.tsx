import React, { useState, useEffect, useCallback, useRef } from "react";
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
  SimpleGrid,
} from "@chakra-ui/react";
import {
  FaPhotoVideo,
  FaUpload,
  FaCheckCircle,
  FaExclamationCircle,
  FaTrash,
  FaCopy,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import type { MediaCategory } from "@/types/db";

interface MediaItem {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  alt_text: string;
  category: MediaCategory;
  created_at: string;
}

interface MediaPageProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<MediaPageProps> = async (ctx) => {
  return requireAdminPage<MediaPageProps>(ctx, [
    "content_manager",
    "resort_admin",
    "super_admin",
  ]);
};

export default function AdminMediaPage({ adminUser }: MediaPageProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Upload form state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>("gallery");
  const [altText, setAltText] = useState("");

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        categoryFilter === "all"
          ? "/api/v1/media"
          : `/api/v1/media?category=${categoryFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setMedia(json.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!altText) {
        setAltText(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !altText.trim()) {
      setFeedback({ type: "error", message: "Please select a file and provide alt text." });
      return;
    }

    setUploading(true);
    setFeedback(null);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        const res = await fetch("/api/v1/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
            sizeBytes: selectedFile.size,
            category: uploadCategory,
            altText: altText.trim(),
            base64Data,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setFeedback({ type: "success", message: `Asset '${selectedFile.name}' uploaded!` });
          setShowUploadModal(false);
          setSelectedFile(null);
          setAltText("");
          await fetchMedia();
        } else {
          setFeedback({
            type: "error",
            message: json.error?.message || "Failed to upload asset.",
          });
        }
        setUploading(false);
      };

      reader.onerror = () => {
        setFeedback({ type: "error", message: "Error reading file." });
        setUploading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Delete media asset '${fileName}'?`)) return;

    setUploading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/v1/media/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Asset '${fileName}' deleted.` });
        await fetchMedia();
      } else {
        setFeedback({
          type: "error",
          message: json.error?.message || "Failed to delete asset.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Error deleting asset." });
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Media URL copied to clipboard!");
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AdminLayout
      title="Media Library"
      user={adminUser}
      breadcrumbs={[{ label: "Media Library" }]}
    >
      <Flex mb={6} justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Box>
          <Heading as="h1" size="lg" color="gray.800">
            Media Asset Library
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Manage high-resolution photography, videos, and CDN-delivered marketing imagery.
          </Text>
        </Box>

        <HStack gap={2}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              height: "36px",
              padding: "0 12px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #CBD5E0",
              background: "white",
            }}
          >
            <option value="all">All Categories</option>
            <option value="gallery">Resort Gallery</option>
            <option value="room">Room Suites</option>
            <option value="facility">Facilities</option>
            <option value="restaurant">Restaurants & Dining</option>
            <option value="event">Events</option>
            <option value="deal">Deals</option>
          </select>

          <Button size="sm" colorScheme="blue" onClick={() => setShowUploadModal(true)}>
            <HStack gap={1}>
              <Icon as={FaUpload} boxSize={3} />
              <Text>Upload Media</Text>
            </HStack>
          </Button>
        </HStack>
      </Flex>

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

      {loading ? (
        <Flex justify="center" p={12}>
          <Spinner size="lg" color="blue.500" />
        </Flex>
      ) : media.length === 0 ? (
        <Box bg="white" p={12} borderRadius="lg" border="1px solid" borderColor="gray.200" textAlign="center">
          <Icon as={FaPhotoVideo} boxSize={10} color="gray.400" mb={3} />
          <Heading size="sm" color="gray.700">No media assets found</Heading>
          <Text fontSize="xs" color="gray.500" mt={1}>Upload resort photos and videos to populate the library.</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
          {media.map((asset) => (
            <Box
              key={asset.id}
              bg="white"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
              overflow="hidden"
              boxShadow="sm"
            >
              <Box h="140px" bg="gray.100" position="relative" overflow="hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt={asset.alt_text}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    // Fallback to placeholder color
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <Badge
                  position="absolute"
                  top={2}
                  left={2}
                  colorScheme="blue"
                  fontSize="9px"
                  textTransform="uppercase"
                >
                  {asset.category}
                </Badge>
              </Box>

              <Box p={3}>
                <Text fontSize="xs" fontWeight="bold" lineClamp={1} color="gray.800" title={asset.file_name}>
                  {asset.file_name}
                </Text>
                <Text fontSize="10px" color="gray.500" lineClamp={1}>
                  {asset.alt_text}
                </Text>

                <HStack justify="space-between" mt={2} pt={2} borderTop="1px solid" borderColor="gray.100">
                  <Text fontSize="10px" color="gray.400">
                    {formatBytes(asset.size_bytes)}
                  </Text>
                  <HStack gap={1}>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => copyUrl(asset.url)}
                      title="Copy URL"
                    >
                      <Icon as={FaCopy} boxSize={2.5} />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDelete(asset.id, asset.file_name)}
                      disabled={uploading}
                      title="Delete Asset"
                    >
                      <Icon as={FaTrash} boxSize={2.5} />
                    </Button>
                  </HStack>
                </HStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={200}
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={4}
        >
          <Box bg="white" maxW="460px" w="100%" p={6} borderRadius="lg" boxShadow="xl">
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm">Upload Media Asset</Heading>
              <Button size="xs" variant="ghost" onClick={() => setShowUploadModal(false)}>
                Close
              </Button>
            </Flex>

            <form onSubmit={handleUpload}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Select File (JPEG, PNG, WebP ≤ 10MB, MP4 ≤ 100MB) *
                  </Text>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,video/mp4"
                    required
                    onChange={handleFileChange}
                    style={{ fontSize: "13px" }}
                  />
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Asset Category *
                  </Text>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as MediaCategory)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                      background: "white",
                    }}
                  >
                    <option value="gallery">Resort Gallery</option>
                    <option value="room">Room Suite</option>
                    <option value="facility">Facility</option>
                    <option value="restaurant">Restaurant & Dining</option>
                    <option value="event">Event Space</option>
                    <option value="deal">Deal Banner</option>
                  </select>
                </Box>

                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Alt Text (Accessibility & SEO) *
                  </Text>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Presidential hut thatched roof exterior view at sunset"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                    }}
                  />
                </Box>

                <Flex justify="flex-end" gap={2} pt={3} borderTop="1px solid" borderColor="gray.100">
                  <Button size="sm" variant="outline" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" colorScheme="blue" type="submit" loading={uploading}>
                    Upload Now
                  </Button>
                </Flex>
              </VStack>
            </form>
          </Box>
        </Box>
      )}
    </AdminLayout>
  );
}
