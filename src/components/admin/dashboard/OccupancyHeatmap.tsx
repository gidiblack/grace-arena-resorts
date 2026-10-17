import React, { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Text,
  Heading,
  Button,
  Grid,
  GridItem,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import type { DailyOccupancy } from "@/services/analytics/analytics-service";

export interface OccupancyHeatmapProps {
  currentMonth: DailyOccupancy[];
  nextMonth: DailyOccupancy[];
  isLoading?: boolean;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getCellColor(rate: number): {
  bg: string;
  borderColor: string;
  color: string;
  label: string;
} {
  if (rate === 0) {
    return { bg: "gray.50", borderColor: "gray.200", color: "gray.600", label: "Empty (0%)" };
  }
  if (rate <= 40) {
    return { bg: "green.50", borderColor: "green.200", color: "green.800", label: "Low (1-40%)" };
  }
  if (rate <= 75) {
    return {
      bg: "yellow.100",
      borderColor: "yellow.300",
      color: "yellow.900",
      label: "Moderate (41-75%)",
    };
  }
  if (rate < 100) {
    return {
      bg: "orange.100",
      borderColor: "orange.300",
      color: "orange.900",
      label: "High (76-99%)",
    };
  }
  return { bg: "red.200", borderColor: "red.400", color: "red.900", label: "Sold Out (100%)" };
}

export function OccupancyHeatmap({
  currentMonth,
  nextMonth,
  isLoading = false,
}: OccupancyHeatmapProps) {
  const [activeTab, setActiveTab] = useState<"current" | "next">("current");

  const activeDays = activeTab === "current" ? currentMonth : nextMonth;

  // Month Title from the first day in list
  let monthTitle = activeTab === "current" ? "Current Month" : "Next Month";
  let emptyOffset = 0;

  if (activeDays.length > 0) {
    const firstDateStr = activeDays[0].date;
    const [y, m] = firstDateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, 1));
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    monthTitle = `${monthNames[m - 1]} ${y}`;

    // Get day of week for the 1st day (0 = Sun, 1 = Mon ... 6 = Sat)
    // We want Monday = 0, Sunday = 6
    const rawDay = dateObj.getUTCDay();
    emptyOffset = rawDay === 0 ? 6 : rawDay - 1;
  }

  return (
    <Box bg="white" p={6} borderRadius="lg" borderWidth="1px" borderColor="gray.200" boxShadow="sm">
      <Flex
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "flex-start", sm: "center" }}
        mb={5}
        gap={3}
      >
        <Box>
          <HStack gap={2}>
            <Heading size="md" color="gray.800">
              Occupancy Heatmap
            </Heading>
            <Badge colorPalette="teal" variant="subtle" fontSize="xs">
              {monthTitle}
            </Badge>
          </HStack>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Daily occupancy rates excluding under-construction room types and maintenance units
          </Text>
        </Box>

        <HStack gap={2}>
          <Button
            size="xs"
            variant={activeTab === "current" ? "solid" : "outline"}
            colorPalette="teal"
            onClick={() => setActiveTab("current")}
          >
            Current Month
          </Button>
          <Button
            size="xs"
            variant={activeTab === "next" ? "solid" : "outline"}
            colorPalette="teal"
            onClick={() => setActiveTab("next")}
          >
            Next Month
          </Button>
        </HStack>
      </Flex>

      {isLoading ? (
        <Flex h="240px" align="center" justify="center">
          <Spinner size="lg" color="teal.500" />
        </Flex>
      ) : activeDays.length === 0 ? (
        <Flex h="240px" align="center" justify="center">
          <Text color="gray.400" fontSize="sm">
            No occupancy calendar data available
          </Text>
        </Flex>
      ) : (
        <Box>
          {/* Weekday headers */}
          <Grid templateColumns="repeat(7, 1fr)" gap={2} mb={2}>
            {WEEKDAYS.map((day) => (
              <GridItem key={day} textAlign="center">
                <Text fontSize="xs" fontWeight="bold" color="gray.500">
                  {day}
                </Text>
              </GridItem>
            ))}
          </Grid>

          {/* Calendar grid */}
          <Grid templateColumns="repeat(7, 1fr)" gap={2}>
            {/* Empty slots for month start offset */}
            {Array.from({ length: emptyOffset }).map((_, idx) => (
              <GridItem key={`empty-${idx}`} h="44px" />
            ))}

            {/* Day cells */}
            {activeDays.map((day) => {
              const dayNum = Number(day.date.split("-")[2]);
              const colorInfo = getCellColor(day.rate);

              return (
                <GridItem key={day.date}>
                  <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    h="44px"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={colorInfo.borderColor}
                    bg={colorInfo.bg}
                    color={colorInfo.color}
                    cursor="pointer"
                    transition="transform 0.1s"
                    _hover={{ transform: "scale(1.05)", zIndex: 1, boxShadow: "xs" }}
                    title={`${day.date}: ${day.rate}% (${day.occupiedUnits}/${day.totalBookableUnits} units occupied)`}
                  >
                    <Text fontSize="xs" fontWeight="bold">
                      {dayNum}
                    </Text>
                    <Text fontSize="10px" fontWeight="medium" opacity={0.85}>
                      {day.rate}%
                    </Text>
                  </Flex>
                </GridItem>
              );
            })}
          </Grid>

          {/* Legend */}
          <Flex
            wrap="wrap"
            align="center"
            justify="center"
            gap={4}
            mt={6}
            pt={4}
            borderTopWidth="1px"
            borderColor="gray.100"
            fontSize="xs"
            color="gray.600"
          >
            <HStack gap={1.5}>
              <Box
                w={3}
                h={3}
                borderRadius="sm"
                bg="gray.100"
                borderWidth="1px"
                borderColor="gray.300"
              />
              <Text>0% Available</Text>
            </HStack>
            <HStack gap={1.5}>
              <Box
                w={3}
                h={3}
                borderRadius="sm"
                bg="green.100"
                borderWidth="1px"
                borderColor="green.300"
              />
              <Text>1–40%</Text>
            </HStack>
            <HStack gap={1.5}>
              <Box
                w={3}
                h={3}
                borderRadius="sm"
                bg="yellow.100"
                borderWidth="1px"
                borderColor="yellow.400"
              />
              <Text>41–75%</Text>
            </HStack>
            <HStack gap={1.5}>
              <Box
                w={3}
                h={3}
                borderRadius="sm"
                bg="orange.100"
                borderWidth="1px"
                borderColor="orange.400"
              />
              <Text>76–99%</Text>
            </HStack>
            <HStack gap={1.5}>
              <Box
                w={3}
                h={3}
                borderRadius="sm"
                bg="red.200"
                borderWidth="1px"
                borderColor="red.400"
              />
              <Text>100% Sold Out</Text>
            </HStack>
          </Flex>
        </Box>
      )}
    </Box>
  );
}

export default OccupancyHeatmap;
