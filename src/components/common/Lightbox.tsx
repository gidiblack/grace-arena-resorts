import React, { useEffect, useCallback } from "react";
import { Box, Flex, HStack, Icon, Image, Text } from "@chakra-ui/react";
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";

export interface LightboxImage {
  src: string;
  alt: string;
  title?: string;
  category?: string;
}

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: LightboxImage[];
  currentIndex: number;
  onNavigate: (newIndex: number) => void;
}

export const Lightbox: React.FC<LightboxProps> = ({
  isOpen,
  onClose,
  images,
  currentIndex,
  onNavigate,
}) => {
  const currentImage = images[currentIndex] || images[0];

  const handlePrev = useCallback(() => {
    if (images.length === 0) return;
    const nextIdx = (currentIndex - 1 + images.length) % images.length;
    onNavigate(nextIdx);
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = useCallback(() => {
    if (images.length === 0) return;
    const nextIdx = (currentIndex + 1) % images.length;
    onNavigate(nextIdx);
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentImage) return null;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={150}
      bg="rgba(5, 5, 5, 0.94)"
      backdropFilter="blur(12px)"
      display="flex"
      flexDir="column"
      justifyContent="space-between"
      p={{ base: 4, md: 8 }}
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery lightbox">
      {/* Top bar */}
      <Flex justify="space-between" align="center" w="full" maxW="75rem" mx="auto" zIndex={2}>
        <HStack gap={3}>
          <Text color="accent.500" fontSize="13px" fontWeight="bold" letterSpacing="wide" textTransform="uppercase">
            {currentImage.category || "Resort Gallery"}
          </Text>
          <Text color="gray.400" fontSize="13px">
            •
          </Text>
          <Text color="gray.300" fontSize="13px" fontWeight="medium">
            {currentIndex + 1} of {images.length}
          </Text>
        </HStack>

        <Box
          as="button"
          onClick={onClose}
          p={2}
          borderRadius="full"
          bg="rgba(255, 255, 255, 0.1)"
          color="white"
          _hover={{ bg: "accent.500", color: "dark.500", transform: "scale(1.1)" }}
          transition="all 0.2s"
          cursor="pointer"
          aria-label="Close gallery (Press Escape)">
          <Icon as={FaTimes} boxSize={5} />
        </Box>
      </Flex>

      {/* Main Image Stage */}
      <Flex
        position="relative"
        align="center"
        justify="center"
        flex="1"
        maxW="75rem"
        w="full"
        mx="auto"
        my={4}
        overflow="hidden">
        {/* Previous Button */}
        <Box
          as="button"
          position="absolute"
          left={{ base: 1, md: 4 }}
          zIndex={5}
          onClick={handlePrev}
          p={{ base: 2.5, md: 3.5 }}
          borderRadius="full"
          bg="rgba(0, 0, 0, 0.65)"
          color="white"
          border="1px solid rgba(255, 255, 255, 0.2)"
          _hover={{ bg: "accent.500", color: "dark.500", transform: "scale(1.1)" }}
          transition="all 0.2s"
          cursor="pointer"
          aria-label="Previous photo (Left arrow)">
          <Icon as={FaChevronLeft} boxSize={{ base: 4, md: 5 }} />
        </Box>

        {/* Display Image */}
        <Box
          maxH={{ base: "65vh", md: "75vh" }}
          maxW="100%"
          display="flex"
          alignItems="center"
          justifyContent="center">
          <Image
            src={currentImage.src}
            alt={currentImage.alt}
            maxH={{ base: "65vh", md: "75vh" }}
            maxW="100%"
            objectFit="contain"
            borderRadius="12px"
            boxShadow="0 20px 50px rgba(0, 0, 0, 0.8)"
          />
        </Box>

        {/* Next Button */}
        <Box
          as="button"
          position="absolute"
          right={{ base: 1, md: 4 }}
          zIndex={5}
          onClick={handleNext}
          p={{ base: 2.5, md: 3.5 }}
          borderRadius="full"
          bg="rgba(0, 0, 0, 0.65)"
          color="white"
          border="1px solid rgba(255, 255, 255, 0.2)"
          _hover={{ bg: "accent.500", color: "dark.500", transform: "scale(1.1)" }}
          transition="all 0.2s"
          cursor="pointer"
          aria-label="Next photo (Right arrow)">
          <Icon as={FaChevronRight} boxSize={{ base: 4, md: 5 }} />
        </Box>
      </Flex>

      {/* Caption footer */}
      <Flex
        direction="column"
        align="center"
        justify="center"
        w="full"
        maxW="40rem"
        mx="auto"
        textAlign="center"
        zIndex={2}>
        <Text color="light.500" fontSize={{ base: "14px", md: "16px" }} fontWeight="semibold">
          {currentImage.title || currentImage.alt}
        </Text>
        <Text color="gray.400" fontSize="12px" mt={1}>
          Use arrow keys to navigate or click outside to close
        </Text>
      </Flex>
    </Box>
  );
};

export default Lightbox;
