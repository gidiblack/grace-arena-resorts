import React from "react";
import { Box, Flex, HStack, VStack, Text, Heading, Badge, Icon, Spinner } from "@chakra-ui/react";
import { FaExchangeAlt, FaEnvelope, FaCalendarCheck, FaShieldAlt, FaClock } from "react-icons/fa";

export interface ActivityItem {
  id: string;
  type: "booking_status" | "contact_submission" | "event_inquiry" | "audit_log";
  title: string;
  description: string;
  actor: string;
  timestamp: string;
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

function getEventIconAndColor(type: ActivityItem["type"]) {
  switch (type) {
    case "booking_status":
      return { icon: FaExchangeAlt, colorPalette: "blue" };
    case "contact_submission":
      return { icon: FaEnvelope, colorPalette: "purple" };
    case "event_inquiry":
      return { icon: FaCalendarCheck, colorPalette: "teal" };
    case "audit_log":
      return { icon: FaShieldAlt, colorPalette: "orange" };
    default:
      return { icon: FaClock, colorPalette: "gray" };
  }
}

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function ActivityFeed({ activities, isLoading = false }: ActivityFeedProps) {
  return (
    <Box bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.200" boxShadow="sm">
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading size="md" color="gray.800">
            Recent System Activity
          </Heading>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Real-time feed of booking status changes, inquiries, and audit events
          </Text>
        </Box>
        <Badge colorPalette="gray" variant="subtle" fontSize="xs">
          Last 10 events
        </Badge>
      </Flex>

      {isLoading ? (
        <Flex py={8} align="center" justify="center">
          <Spinner size="md" color="blue.500" />
        </Flex>
      ) : activities.length === 0 ? (
        <Flex py={8} align="center" justify="center" direction="column">
          <Text color="gray.400" fontSize="sm">
            No recent activity recorded yet
          </Text>
        </Flex>
      ) : (
        <VStack align="stretch" gap={0}>
          {activities.map((item) => {
            const { icon, colorPalette } = getEventIconAndColor(item.type);
            const timeAgo = formatRelativeTime(item.timestamp);

            return (
              <Flex
                key={item.id}
                justify="space-between"
                align="flex-start"
                py={2.5}
                borderBottomWidth="1px"
                borderColor="gray.100"
                gap={3}
              >
                <HStack align="flex-start" gap={3} flex="1" minW={0}>
                  <Flex
                    w={8}
                    h={8}
                    borderRadius="full"
                    bg={`${colorPalette}.50`}
                    color={`${colorPalette}.600`}
                    align="center"
                    justify="center"
                    flexShrink={0}
                    mt={0.5}
                  >
                    <Icon as={icon} boxSize={3.5} />
                  </Flex>

                  <Box flex="1" minW={0}>
                    <HStack gap={2} wrap="wrap">
                      <Text fontSize="xs" fontWeight="bold" color="gray.800" lineClamp={1}>
                        {item.title}
                      </Text>
                      <Badge
                        fontSize="10px"
                        colorPalette={item.actor === "System" ? "gray" : "blue"}
                        variant="subtle"
                        borderRadius="full"
                        px={1.5}
                      >
                        {item.actor}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.600" mt={0.5}>
                      {item.description}
                    </Text>
                  </Box>
                </HStack>

                <Text fontSize="11px" color="gray.400" whiteSpace="nowrap" flexShrink={0}>
                  {timeAgo}
                </Text>
              </Flex>
            );
          })}
        </VStack>
      )}
    </Box>
  );
}

export default ActivityFeed;
