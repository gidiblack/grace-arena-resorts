import React, { useState, useSyncExternalStore } from "react";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Heading,
  Button,
  Spinner,
} from "@chakra-ui/react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatNgn } from "@/lib/formatters/currency";

export interface TimelineDataPoint {
  date: string; // YYYY-MM-DD
  totalBookings: number;
  confirmedBookings?: number;
  grossRevenue?: number;
  refunds?: number;
  netRevenue?: number;
}

export interface BookingsRevenueChartProps {
  data: TimelineDataPoint[];
  isLoading?: boolean;
}

const emptySubscribe = () => () => {};

export function BookingsRevenueChart({ data, isLoading = false }: BookingsRevenueChartProps) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [viewMode, setViewMode] = useState<"both" | "bookings" | "revenue">("both");

  const formattedData = data.map((d) => {
    // Format YYYY-MM-DD to "MMM D" e.g. "Oct 12"
    const [, month, day] = d.date.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = `${monthNames[Number(month) - 1]} ${Number(day)}`;
    return {
      ...d,
      shortDate: label,
      revenueDisplay: d.netRevenue != null ? Math.max(0, d.netRevenue) : 0,
    };
  });

  return (
    <Box
      bg="white"
      p={6}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      boxShadow="sm"
    >
      <Flex
        direction={{ base: "column", sm: "row" }}
        justify="space-between"
        align={{ base: "flex-start", sm: "center" }}
        mb={6}
        gap={4}
      >
        <Box>
          <Heading size="md" color="gray.800">
            30-Day Performance Trends
          </Heading>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Daily booking volume and net revenue in West Africa Time (WAT)
          </Text>
        </Box>

        <HStack gap={2}>
          <Button
            size="xs"
            variant={viewMode === "both" ? "solid" : "outline"}
            colorScheme="blue"
            onClick={() => setViewMode("both")}
          >
            Both
          </Button>
          <Button
            size="xs"
            variant={viewMode === "bookings" ? "solid" : "outline"}
            colorScheme="blue"
            onClick={() => setViewMode("bookings")}
          >
            Bookings
          </Button>
          <Button
            size="xs"
            variant={viewMode === "revenue" ? "solid" : "outline"}
            colorScheme="blue"
            onClick={() => setViewMode("revenue")}
          >
            Revenue
          </Button>
        </HStack>
      </Flex>

      {!mounted || isLoading ? (
        <Flex h="320px" align="center" justify="center">
          <Spinner size="lg" color="blue.500" />
        </Flex>
      ) : formattedData.length === 0 ? (
        <Flex h="320px" align="center" justify="center" direction="column">
          <Text color="gray.400" fontSize="sm">
            No transaction or booking history in the last 30 days
          </Text>
        </Flex>
      ) : (
        <Box w="100%" h="320px">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={formattedData}
              margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="shortDate"
                tick={{ fontSize: 11, fill: "#718096" }}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              {(viewMode === "both" || viewMode === "bookings") && (
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 11, fill: "#3182CE" }}
                  allowDecimals={false}
                  label={{
                    value: "Bookings",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                    fill: "#3182CE",
                  }}
                />
              )}
              {(viewMode === "both" || viewMode === "revenue") && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#38A169" }}
                  tickFormatter={(val) =>
                    val >= 1_000_000
                      ? `₦${(val / 1_000_000).toFixed(1)}M`
                      : val >= 1_000
                      ? `₦${(val / 1_000).toFixed(0)}k`
                      : `₦${val}`
                  }
                  label={{
                    value: "Net Revenue (₦)",
                    angle: 90,
                    position: "insideRight",
                    fontSize: 11,
                    fill: "#38A169",
                  }}
                />
              )}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload as TimelineDataPoint & { shortDate: string };
                    return (
                      <Box
                        bg="white"
                        p={3}
                        borderRadius="md"
                        boxShadow="lg"
                        borderWidth="1px"
                        borderColor="gray.200"
                        fontSize="xs"
                      >
                        <Text fontWeight="bold" color="gray.700" mb={2}>
                          {row.date}
                        </Text>
                        <VStack align="flex-start" gap={1}>
                          <Text color="blue.600">
                            Total Bookings: <strong>{row.totalBookings}</strong>
                          </Text>
                          {row.confirmedBookings !== undefined && (
                            <Text color="teal.600">
                              Confirmed: <strong>{row.confirmedBookings}</strong>
                            </Text>
                          )}
                          {row.grossRevenue !== undefined && (
                            <Text color="green.600">
                              Gross: <strong>{formatNgn(row.grossRevenue)}</strong>
                            </Text>
                          )}
                          {row.refunds !== undefined && row.refunds > 0 && (
                            <Text color="red.500">
                              Refunds: <strong>-{formatNgn(row.refunds)}</strong>
                            </Text>
                          )}
                          {row.netRevenue !== undefined && (
                            <Text fontWeight="bold" color="purple.700" pt={1} borderTop="1px solid #E2E8F0">
                              Net Revenue: {formatNgn(row.netRevenue)}
                            </Text>
                          )}
                        </VStack>
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
              />

              {(viewMode === "both" || viewMode === "bookings") && (
                <Bar
                  yAxisId="left"
                  dataKey="totalBookings"
                  name="Bookings"
                  fill="#3182CE"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
              )}

              {(viewMode === "both" || viewMode === "revenue") && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenueDisplay"
                  name="Net Revenue"
                  stroke="#38A169"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#38A169" }}
                  activeDot={{ r: 6 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}

export default BookingsRevenueChart;
