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
  FaEdit,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminDialog } from "@/components/admin/AdminDialog";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import type { MediaCategory } from "@/types/db";
import { formatLimit, isAllowedMediaMimeType, maxBytesFor } from "@/services/media/media-rules";

/**
 * Uploads the file body straight to Storage with the signed URL from /api/v1/media/upload-url.
 * XMLHttpRequest rather than fetch so large videos can report progress.
 */
function putToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("content-type", file.type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new Error(
              xhr.status === 413
                ? "File is larger than storage allows."
                : `Upload failed (${xhr.status}).`
            )
          );
    xhr.onerror = () =>
      reject(new Error("Network error while uploading. Check your connection and retry."));
    xhr.send(file);
  });
}

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
  return requireAdminPage<MediaPageProps>(ctx, ["content_manager", "resort_admin", "super_admin"]);
};

export default function AdminMediaPage({ adminUser }: MediaPageProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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

  // Edit asset details (alt text and category; the file itself is immutable)
  const [editingAsset, setEditingAsset] = useState<MediaItem | null>(null);
  const [editAltText, setEditAltText] = useState("");
  const [editCategory, setEditCategory] = useState<MediaCategory>("gallery");

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        categoryFilter === "all" ? "/api/v1/media" : `/api/v1/media?category=${categoryFilter}`;
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
    if (!isAllowedMediaMimeType(selectedFile.type)) {
      setFeedback({
        type: "error",
        message: "Only JPEG, PNG, WebP, AVIF and MP4 files can be uploaded.",
      });
      return;
    }
    if (selectedFile.size > maxBytesFor(selectedFile.type)) {
      setFeedback({
        type: "error",
        message: `File exceeds maximum permitted size (${formatLimit(selectedFile.type)}).`,
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setFeedback(null);

    try {
      // 1. Ask the API for a signed upload URL (validates type and size)
      const urlRes = await fetch("/api/v1/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          sizeBytes: selectedFile.size,
          category: uploadCategory,
        }),
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok || !urlJson.success) {
        throw new Error(urlJson.error?.message || "Could not start the upload.");
      }

      // 2. Upload the file straight to Storage
      await putToSignedUrl(urlJson.data.signedUrl, selectedFile, setUploadProgress);

      // 3. Register it; the API verifies the stored bytes before adding it to the library
      const res = await fetch("/api/v1/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          category: uploadCategory,
          altText: altText.trim(),
          storagePath: urlJson.data.path,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to upload asset.");
      }

      setFeedback({ type: "success", message: `Asset '${selectedFile.name}' uploaded.` });
      setShowUploadModal(false);
      setSelectedFile(null);
      setAltText("");
      await fetchMedia();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const openEdit = (asset: MediaItem) => {
    setEditingAsset(asset);
    setEditAltText(asset.alt_text || "");
    setEditCategory(asset.category);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    if (!editAltText.trim()) {
      setFeedback({ type: "error", message: "Alt text is required for accessibility." });
      return;
    }

    setUploading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/media/${editingAsset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText: editAltText.trim(), category: editCategory }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: "success", message: `Asset '${editingAsset.file_name}' updated.` });
        setEditingAsset(null);
        await fetchMedia();
      } else {
        setFeedback({ type: "error", message: json.error?.message || "Failed to update asset." });
      }
    } catch {
      setFeedback({ type: "error", message: "Error updating asset." });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    const confirmed = await adminDialog.confirm({
      title: "Delete media asset?",
      message: `'${fileName}' and its stored file will be deleted. Pages that still link to it will show it as missing. This cannot be undone.`,
      confirmLabel: "Delete Asset",
    });
    if (!confirmed) return;

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

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      await adminDialog.notify({
        title: "URL copied",
        message: "The media URL is on your clipboard.",
        tone: "success",
      });
    } catch {
      await adminDialog.notify({
        title: "Couldn't copy the URL",
        message: url,
        tone: "warning",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AdminLayout title="Media Library" user={adminUser} breadcrumbs={[{ label: "Media Library" }]}>
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

          <Button size="sm" colorPalette="blue" onClick={() => setShowUploadModal(true)}>
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
        <Box
          bg="white"
          p={12}
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
          textAlign="center"
        >
          <Icon as={FaPhotoVideo} boxSize={10} color="gray.400" mb={3} />
          <Heading size="sm" color="gray.700">
            No media assets found
          </Heading>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Upload resort photos and videos to populate the library.
          </Text>
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
                  colorPalette="blue"
                  fontSize="9px"
                  textTransform="uppercase"
                >
                  {asset.category}
                </Badge>
              </Box>

              <Box p={3}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  lineClamp={1}
                  color="gray.800"
                  title={asset.file_name}
                >
                  {asset.file_name}
                </Text>
                <Text fontSize="10px" color="gray.500" lineClamp={1}>
                  {asset.alt_text}
                </Text>

                <HStack
                  justify="space-between"
                  mt={2}
                  pt={2}
                  borderTop="1px solid"
                  borderColor="gray.100"
                >
                  <Text fontSize="10px" color="gray.400">
                    {formatBytes(asset.size_bytes)}
                  </Text>
                  <HStack gap={1}>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => copyUrl(asset.url)}
                      title="Copy URL"
                      aria-label={`Copy URL of ${asset.file_name}`}
                    >
                      <Icon as={FaCopy} boxSize={2.5} />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => openEdit(asset)}
                      disabled={uploading}
                      title="Edit details"
                      aria-label={`Edit details of ${asset.file_name}`}
                    >
                      <Icon as={FaEdit} boxSize={2.5} />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      aria-label={`Delete media ${asset.file_name}`}
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

      {/* EDIT DETAILS MODAL */}
      {editingAsset && (
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
              <Heading size="sm">Edit Media Details</Heading>
              <Button size="xs" variant="ghost" onClick={() => setEditingAsset(null)}>
                Close
              </Button>
            </Flex>
            <Text fontSize="xs" color="gray.500" mb={4} lineClamp={1}>
              {editingAsset.file_name}
            </Text>

            <form onSubmit={handleSaveEdit}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Asset Category *
                  </Text>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as MediaCategory)}
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
                    value={editAltText}
                    onChange={(e) => setEditAltText(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E0",
                      fontSize: "14px",
                    }}
                  />
                </Box>

                <Flex
                  justify="flex-end"
                  gap={2}
                  pt={3}
                  borderTop="1px solid"
                  borderColor="gray.100"
                >
                  <Button size="sm" variant="outline" onClick={() => setEditingAsset(null)}>
                    Cancel
                  </Button>
                  <Button size="sm" colorPalette="blue" type="submit" loading={uploading}>
                    Save Changes
                  </Button>
                </Flex>
              </VStack>
            </form>
          </Box>
        </Box>
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
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                Close
              </Button>
            </Flex>

            <form onSubmit={handleUpload}>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text fontSize="xs" fontWeight="bold" color="gray.700" mb={1}>
                    Select File (JPEG, PNG, WebP, AVIF ≤ 10 MB; MP4 ≤ 50 MB) *
                  </Text>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/avif,video/mp4"
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

                <Flex
                  justify="flex-end"
                  gap={2}
                  pt={3}
                  borderTop="1px solid"
                  borderColor="gray.100"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    colorPalette="blue"
                    type="submit"
                    loading={uploading}
                    loadingText={
                      uploadProgress !== null && uploadProgress < 100
                        ? `Uploading ${uploadProgress}%`
                        : "Verifying…"
                    }
                  >
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
