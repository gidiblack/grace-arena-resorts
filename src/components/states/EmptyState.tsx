import React from "react";
import { Box, Flex, Icon, Text, VStack } from "@chakra-ui/react";
import { MdInbox } from "react-icons/md";
import Button from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
  minH?: string | number;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = MdInbox,
  actionLabel,
  onAction,
  minH = "280px",
}) => {
  return (
    <Flex
      direction="column"
      justify="center"
      align="center"
      minH={minH}
      w="100%"
      p={8}
      textAlign="center"
    >
      <VStack gap={3} maxW="420px">
        <Icon as={icon} boxSize={12} color="gray.400" />
        <Text fontSize="18px" fontWeight="semibold" color="gray.700">
          {title}
        </Text>
        {description && (
          <Text fontSize="14px" color="gray.500" lineHeight="1.5">
            {description}
          </Text>
        )}
        {actionLabel && onAction && (
          <Box pt={2}>
            <Button onClick={onAction} variant="outline">
              {actionLabel}
            </Button>
          </Box>
        )}
      </VStack>
    </Flex>
  );
};

export default EmptyState;
