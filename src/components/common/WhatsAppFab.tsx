import React, { useState } from "react";
import { useRouter } from "next/router";
import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { FaWhatsapp } from "react-icons/fa";

interface WhatsAppFabProps {
  phoneNumber?: string;
  customMessage?: string;
}

export function getContextAwareWhatsAppMessage(
  pathname: string,
  query?: Record<string, unknown>
): string {
  if (pathname.startsWith("/rooms")) {
    if (query?.room) {
      return `Hello Grace Arena Resorts, I would like to inquire about reserving ${query.room}.`;
    }
    return "Hello Grace Arena Resorts, I would like to inquire about your available rooms and suites.";
  }

  if (pathname.startsWith("/events")) {
    return "Hello Grace Arena Resorts, I would like to inquire about hosting a church retreat, conference, or event.";
  }

  if (pathname.startsWith("/restaurants")) {
    return "Hello Grace Arena Resorts, I would like to inquire about your dining menus and restaurant reservations.";
  }

  if (pathname.startsWith("/deals")) {
    return "Hello Grace Arena Resorts, I would like to inquire about your current special offers and packages.";
  }

  if (pathname.startsWith("/contact")) {
    return "Hello Grace Arena Resorts Concierge, I would like to get in touch regarding reservations.";
  }

  return "Hello Grace Arena Resorts, I would like to inquire about booking a stay.";
}

export const WhatsAppFab: React.FC<WhatsAppFabProps> = ({ phoneNumber, customMessage }) => {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const activeNumber = phoneNumber || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2348123456789";

  const message =
    customMessage || getContextAwareWhatsAppMessage(router?.pathname || "/", router?.query);

  const whatsappUrl = `https://wa.me/${activeNumber}?text=${encodeURIComponent(message)}`;

  return (
    <Box
      position="fixed"
      bottom={{ base: "20px", md: "30px" }}
      right={{ base: "20px", md: "30px" }}
      zIndex={100}
      role="region"
      aria-label="WhatsApp Support"
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Grace Arena Resorts on WhatsApp"
        style={{ textDecoration: "none" }}
      >
        <Flex
          align="center"
          gap={2}
          bg="#25D366"
          color="white"
          p={{ base: 3, md: 3.5 }}
          borderRadius="full"
          boxShadow="0 4px 20px rgba(37, 211, 102, 0.45), 0 2px 6px rgba(0,0,0,0.3)"
          cursor="pointer"
          transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          transform={isHovered ? "scale(1.06) translateY(-2px)" : "scale(1)"}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Icon as={FaWhatsapp} boxSize={{ base: 6, md: 7 }} />
          {isHovered && (
            <Text
              display={{ base: "none", sm: "inline-block" }}
              fontSize="14px"
              fontWeight="bold"
              whiteSpace="nowrap"
              pr={2}
              letterSpacing="0.2px"
            >
              Chat with GAR
            </Text>
          )}
        </Flex>
      </a>
    </Box>
  );
};

export default WhatsAppFab;
