import React from "react";
import { Flex, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import { MdErrorOutline } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import Button from "@/components/ui/button";
import { t } from "@/lib/i18n";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showWhatsAppFallback?: boolean;
  minH?: string | number;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = t("common.errorTitle"),
  message = t("common.errorMessage"),
  onRetry,
  showWhatsAppFallback = true,
  minH = "320px",
}) => {
  const whatsappUrl = `https://wa.me/2348123456789?text=${encodeURIComponent(
    "Hello Grace Arena Concierge, I encountered an issue on your website and would like assistance."
  )}`;

  return (
    <Flex
      direction="column"
      justify="center"
      align="center"
      minH={minH}
      w="100%"
      p={8}
      textAlign="center"
      role="alert"
    >
      <VStack gap={4} maxW="480px">
        <Icon as={MdErrorOutline} boxSize={12} color="#E53E3E" />
        <Text fontSize="20px" fontWeight="bold" color="gray.800">
          {title}
        </Text>
        <Text fontSize="15px" color="gray.600" lineHeight="1.6">
          {message}
        </Text>

        <HStack gap={4} pt={2} flexWrap="wrap" justify="center">
          {onRetry && (
            <Button onClick={onRetry} variant="primary">
              {t("common.tryAgain")}
            </Button>
          )}

          {showWhatsAppFallback && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <Button
                variant="outline"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  borderColor: "#25D366",
                  color: "#22543d",
                }}
              >
                <Icon as={FaWhatsapp} color="#25D366" boxSize={5} />
                {t("common.contactWhatsApp")}
              </Button>
            </a>
          )}
        </HStack>
      </VStack>
    </Flex>
  );
};

export default ErrorState;
