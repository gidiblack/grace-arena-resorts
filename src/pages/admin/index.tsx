import React, { useState, useEffect } from "react";
import type { GetServerSideProps } from "next";
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Heading,
  SimpleGrid,
  Badge,
  Icon,
  Table,
} from "@chakra-ui/react";
import {
  FaCalendarCheck,
  FaMoneyBillWave,
  FaBed,
  FaClock,
  FaEnvelope,
  FaUndo,
  FaUsers,
  FaTags,
  FaCreditCard,
  FaDoorOpen,
  FaExclamationCircle,
} from "react-icons/fa";
import AdminLayout from "@/components/admin/AdminLayout";
import { requireAdminPage, type AdminUserSession } from "@/lib/auth/admin-guard";
import { MetricCard } from "@/components/admin/dashboard/MetricCard";
import {
  BookingsRevenueChart,
  type TimelineDataPoint,
} from "@/components/admin/dashboard/BookingsRevenueChart";
import { OccupancyHeatmap } from "@/components/admin/dashboard/OccupancyHeatmap";
import { ActivityFeed } from "@/components/admin/dashboard/ActivityFeed";
import { QuickActions } from "@/components/admin/dashboard/QuickActions";
import { formatNgn } from "@/lib/formatters/currency";
import type {
  AdminSummaryData,
  AnalyticsBookingsData,
  AnalyticsRevenueData,
  AnalyticsOccupancyData,
} from "@/services/analytics/analytics-service";

interface AdminDashboardProps {
  adminUser: AdminUserSession;
}

export const getServerSideProps: GetServerSideProps<AdminDashboardProps> = async (ctx) => {
  return requireAdminPage<AdminDashboardProps>(ctx, [
    "content_manager",
    "resort_admin",
    "super_admin",
  ]);
};

export default function AdminDashboardPage({ adminUser }: AdminDashboardProps) {
  const isContentManager = adminUser.role === "content_manager";

  const [summary, setSummary] = useState<AdminSummaryData | null>(null);
  const [bookingsAnalytics, setBookingsAnalytics] = useState<AnalyticsBookingsData | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<AnalyticsRevenueData | null>(null);
  const [occupancyAnalytics, setOccupancyAnalytics] = useState<AnalyticsOccupancyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;

    async function loadDashboardData() {
      setIsLoading(true);
      try {
        // 1. All roles fetch summary
        const summaryRes = await fetch("/api/v1/admin/summary");
        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          if (isSubscribed && summaryJson.data) {
            setSummary(summaryJson.data);
          }
        }

        // 2. Financial & operational analytics only for Resort Admin+
        if (!isContentManager) {
          const [bRes, rRes, oRes] = await Promise.all([
            fetch("/api/v1/analytics/bookings"),
            fetch("/api/v1/analytics/revenue"),
            fetch("/api/v1/analytics/occupancy"),
          ]);

          if (bRes.ok) {
            const bJson = await bRes.json();
            if (isSubscribed && bJson.data) setBookingsAnalytics(bJson.data);
          }
          if (rRes.ok) {
            const rJson = await rRes.json();
            if (isSubscribed && rJson.data) setRevenueAnalytics(rJson.data);
          }
          if (oRes.ok) {
            const oJson = await oRes.json();
            if (isSubscribed && oJson.data) setOccupancyAnalytics(oJson.data);
          }
        }
      } catch {
        // Silently handle error or log
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isSubscribed = false;
    };
  }, [isContentManager]);

  // Combine bookings & revenue timelines for chart
  const combinedTimeline: TimelineDataPoint[] = React.useMemo(() => {
    if (!bookingsAnalytics && !revenueAnalytics) return [];

    const dateMap: Record<string, TimelineDataPoint> = {};

    if (bookingsAnalytics?.timeline) {
      for (const item of bookingsAnalytics.timeline) {
        dateMap[item.date] = {
          date: item.date,
          totalBookings: item.totalBookings,
          confirmedBookings: item.confirmedBookings,
        };
      }
    }

    if (revenueAnalytics?.timeline) {
      for (const item of revenueAnalytics.timeline) {
        if (!dateMap[item.date]) {
          dateMap[item.date] = {
            date: item.date,
            totalBookings: 0,
          };
        }
        dateMap[item.date].grossRevenue = item.grossRevenue;
        dateMap[item.date].refunds = item.refunds;
        dateMap[item.date].netRevenue = item.netRevenue;
      }
    }

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [bookingsAnalytics, revenueAnalytics]);

  return (
    <AdminLayout
      title="Dashboard"
      user={adminUser}
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }]}
    >
      <VStack align="stretch" gap={6}>
        {/* Welcome Header */}
        <Flex
          justify="space-between"
          align={{ base: "flex-start", md: "center" }}
          direction={{ base: "column", md: "row" }}
          gap={3}
        >
          <Box>
            <HStack gap={2}>
              <Heading size="lg" color="gray.800">
                Resort Operations Dashboard
              </Heading>
              <Badge
                colorPalette="blue"
                variant="subtle"
                fontSize="xs"
                px={2}
                py={0.5}
                borderRadius="full"
              >
                Live Overview
              </Badge>
            </HStack>
            <Text fontSize="sm" color="gray.500" mt={1}>
              Grace Arena Resorts · West Africa Time (WAT, UTC+1)
            </Text>
          </Box>
        </Flex>

        {/* Content Manager Role Restriction Notice */}
        {isContentManager && (
          <Box borderRadius="md" bg="blue.50" borderWidth="1px" borderColor="blue.200" p={3.5}>
            <HStack gap={3}>
              <Icon as={FaExclamationCircle} color="blue.500" boxSize={4} flexShrink={0} />
              <Text fontSize="xs" color="blue.800">
                You are signed in as <strong>Content Manager</strong> with non-financial view
                privileges. Financial metrics, revenue analytics, and occupancy reports are
                restricted to Resort Administrators and Super Admins.
              </Text>
            </HStack>
          </Box>
        )}

        {/* Primary Metric Cards Grid */}
        <SimpleGrid
          columns={{ base: 1, sm: 2, lg: isContentManager ? 4 : 3, xl: isContentManager ? 4 : 6 }}
          gap={4}
        >
          {/* Revenue Card (Resort Admin+ only) */}
          {!isContentManager && (
            <MetricCard
              title="Net Revenue (Month)"
              value={formatNgn(
                summary?.revenue?.thisMonth ?? revenueAnalytics?.revenue?.thisMonth ?? 0
              )}
              icon={FaMoneyBillWave}
              colorPalette="green"
              subtitle={`Today: ${formatNgn(summary?.revenue?.today ?? 0)} · Week: ${formatNgn(summary?.revenue?.thisWeek ?? 0)}`}
              isLoading={isLoading}
            />
          )}

          {/* Bookings Card */}
          <MetricCard
            title="Total Bookings (Month)"
            value={summary?.bookings?.thisMonth ?? bookingsAnalytics?.counts?.thisMonth ?? 0}
            icon={FaCalendarCheck}
            colorPalette="blue"
            subtitle={`Today: ${summary?.bookings?.today ?? 0} · Week: ${summary?.bookings?.thisWeek ?? 0}`}
            isLoading={isLoading}
            href="/admin/bookings"
          />

          {/* Occupancy Card (Resort Admin+ only) */}
          {!isContentManager && (
            <MetricCard
              title="Today's Occupancy"
              value={`${summary?.occupancy?.rateToday ?? occupancyAnalytics?.today?.rate ?? 0}%`}
              icon={FaBed}
              colorPalette="teal"
              subtitle={`${summary?.occupancy?.occupiedUnitsToday ?? occupancyAnalytics?.today?.occupiedUnits ?? 0} of ${summary?.occupancy?.bookableUnitsToday ?? occupancyAnalytics?.today?.totalBookableUnits ?? 0} units active`}
              isLoading={isLoading}
            />
          )}

          {/* Pending Bookings Card */}
          <MetricCard
            title="Pending Bookings"
            value={summary?.bookings?.pending ?? 0}
            icon={FaClock}
            colorPalette="yellow"
            subtitle="Awaiting payment confirmation"
            badge={
              (summary?.bookings?.pending ?? 0) > 0
                ? { label: "Action Needed", colorPalette: "yellow" }
                : undefined
            }
            href="/admin/bookings?status=pending"
            isLoading={isLoading}
          />

          {/* Refunds to Process (Resort Admin+ only) */}
          {!isContentManager && (
            <MetricCard
              title="Refunds to Process"
              value={summary?.inbox?.refundsToProcess ?? 0}
              icon={FaUndo}
              colorPalette="purple"
              subtitle="Manual refunds pending or failed"
              badge={
                (summary?.inbox?.refundsToProcess ?? 0) > 0
                  ? { label: "Review", colorPalette: "red" }
                  : undefined
              }
              href="/admin/bookings?refundQueue=true"
              isLoading={isLoading}
            />
          )}

          {/* Unread Inquiries & Messages */}
          <MetricCard
            title="Unread Inbox"
            value={
              (summary?.inbox?.unreadContactSubmissions ?? 0) +
              (summary?.inbox?.unreadEventInquiries ?? 0)
            }
            icon={FaEnvelope}
            colorPalette="orange"
            subtitle={`${summary?.inbox?.unreadContactSubmissions ?? 0} contacts · ${summary?.inbox?.unreadEventInquiries ?? 0} events`}
            badge={
              (summary?.inbox?.unreadContactSubmissions ?? 0) +
                (summary?.inbox?.unreadEventInquiries ?? 0) >
              0
                ? { label: "New", colorPalette: "orange" }
                : undefined
            }
            isLoading={isLoading}
          />

          {/* Newsletter Subscribers (for Content Manager view) */}
          {isContentManager && (
            <MetricCard
              title="Newsletter Audience"
              value={summary?.newsletter?.totalSubscribers ?? 0}
              icon={FaUsers}
              colorPalette="purple"
              subtitle={`${summary?.newsletter?.confirmedSubscribers ?? 0} confirmed subscribers`}
              isLoading={isLoading}
            />
          )}
        </SimpleGrid>

        {/* Quick Actions Bar */}
        <QuickActions
          userRole={adminUser.role}
          refundsToProcessCount={summary?.inbox?.refundsToProcess ?? 0}
        />

        {/* Resort Admin+ Performance Visualizations */}
        {!isContentManager && (
          <>
            {/* 30-Day Trends Chart */}
            <BookingsRevenueChart data={combinedTimeline} isLoading={isLoading} />

            {/* Occupancy Heatmap */}
            <OccupancyHeatmap
              currentMonth={occupancyAnalytics?.currentMonth || []}
              nextMonth={occupancyAnalytics?.nextMonth || []}
              isLoading={isLoading}
            />

            {/* SRS 4.6 Metric Cards & Breakdowns */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
              {/* Average Stay Duration */}
              <Box
                bg="white"
                p={5}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                    Avg. Stay Duration
                  </Text>
                  <Icon as={FaClock} color="blue.500" />
                </HStack>
                <Heading size="lg" color="gray.800">
                  {bookingsAnalytics?.averageStayDuration ?? 0} nights
                </Heading>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Mean stay across all confirmed bookings
                </Text>
              </Box>

              {/* Deal Redemptions */}
              <Box
                bg="white"
                p={5}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                    Deal Redemptions
                  </Text>
                  <Icon as={FaTags} color="teal.500" />
                </HStack>
                <Heading size="lg" color="gray.800">
                  {bookingsAnalytics?.dealRedemptions ?? 0}
                </Heading>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Bookings redeemed with promotional discounts
                </Text>
              </Box>

              {/* Expired Holds */}
              <Box
                bg="white"
                p={5}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" color="gray.500">
                    Expired Holds
                  </Text>
                  <Icon as={FaUndo} color="red.500" />
                </HStack>
                <Heading size="lg" color="gray.800">
                  {bookingsAnalytics?.expiredHolds ?? summary?.bookings?.expiredHolds ?? 0}
                </Heading>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Pending holds released after timeout (excluded from totals)
                </Text>
              </Box>
            </SimpleGrid>

            {/* Gateway & Room Type Revenue Tables */}
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
              {/* Gateway Breakdown */}
              <Box
                bg="white"
                p={5}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <HStack gap={2} mb={4}>
                  <Icon as={FaCreditCard} color="blue.500" />
                  <Heading size="sm" color="gray.800">
                    Revenue by Payment Gateway
                  </Heading>
                </HStack>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Gateway</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Payments</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Gross</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Refunds</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Net Revenue</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(revenueAnalytics?.gatewayBreakdown || []).map((gw) => (
                      <Table.Row key={gw.gateway}>
                        <Table.Cell fontWeight="medium" textTransform="capitalize">
                          {gw.gateway.replace("_", " ")}
                        </Table.Cell>
                        <Table.Cell textAlign="right">{gw.paymentCount}</Table.Cell>
                        <Table.Cell textAlign="right">{formatNgn(gw.grossRevenue)}</Table.Cell>
                        <Table.Cell
                          textAlign="right"
                          color={gw.refunds > 0 ? "red.500" : undefined}
                        >
                          {gw.refunds > 0 ? `-${formatNgn(gw.refunds)}` : "₦0"}
                        </Table.Cell>
                        <Table.Cell textAlign="right" fontWeight="bold" color="green.600">
                          {formatNgn(gw.netRevenue)}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>

              {/* Revenue by Room Type */}
              <Box
                bg="white"
                p={5}
                borderRadius="lg"
                borderWidth="1px"
                borderColor="gray.200"
                boxShadow="sm"
              >
                <HStack gap={2} mb={4}>
                  <Icon as={FaDoorOpen} color="teal.500" />
                  <Heading size="sm" color="gray.800">
                    Revenue by Room Type
                  </Heading>
                </HStack>
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Room Type</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Bookings</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Net Revenue</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(revenueAnalytics?.roomTypeBreakdown || []).length === 0 ? (
                      <Table.Row>
                        <Table.Cell colSpan={3} textAlign="center" color="gray.400" py={4}>
                          No room revenue recorded yet
                        </Table.Cell>
                      </Table.Row>
                    ) : (
                      (revenueAnalytics?.roomTypeBreakdown || []).map((rt) => (
                        <Table.Row key={rt.roomTypeId}>
                          <Table.Cell fontWeight="medium">{rt.roomTypeName}</Table.Cell>
                          <Table.Cell textAlign="right">{rt.bookingsCount}</Table.Cell>
                          <Table.Cell textAlign="right" fontWeight="bold" color="teal.600">
                            {formatNgn(rt.revenue)}
                          </Table.Cell>
                        </Table.Row>
                      ))
                    )}
                  </Table.Body>
                </Table.Root>
              </Box>
            </SimpleGrid>
          </>
        )}

        {/* Activity Feed (Visible to all staff roles) */}
        <ActivityFeed activities={summary?.recentActivity || []} isLoading={isLoading} />
      </VStack>
    </AdminLayout>
  );
}
