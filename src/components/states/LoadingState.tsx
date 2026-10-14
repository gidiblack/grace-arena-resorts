import React from "react";
import { Flex, Spinner, Text, VStack } from "@chakra-ui/react";
import { t } from "@/lib/i18n";

interface LoadingStateProps {
  message?: string;
  minH?: string | number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = t("common.loading"),
  minH = "300px",
}) => {
  return (
    <Flex
      direction="column"
      justify="center"
      align="center"
      minH={minH}
      w="100%"
      p={6}
      role="status"
      aria-live="polite"
    >
      <VStack gap={4}>
        <Spinner size="xl" color="#C5A880" borderWidth="3px" />
        <Text color="gray.600" fontSize="15px" fontWeight="medium">
          {message}
        </Text>
      </VStack>
    </Flex>
  );
};

export default LoadingState;
