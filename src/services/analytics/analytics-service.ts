import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { addCalendarDays, resortDateTime } from "@/domain/booking/time";
import { REFUND_QUEUE_FILTER } from "@/services/payments/refund-queue";
import type { BookingChannel, UserRole } from "@/types/db";

export interface AdminSummaryData {
  bookings: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    pending: number;
    expiredHolds: number;
  };
  occupancy: {
    rateToday: number;
    occupiedUnitsToday: number;
    bookableUnitsToday: number;
  };
  inbox: {
    unreadContactSubmissions: number;
    unreadEventInquiries: number;
    refundsToProcess?: number;
  };
  notificationBell: {
    count: number;
    unreadContactSubmissions: number;
    unreadEventInquiries: number;
    pendingBookings: number;
    refundsToProcess?: number;
  };
  recentActivity: Array<{
    id: string;
    type: "booking_status" | "contact_submission" | "event_inquiry" | "audit_log";
    title: string;
    description: string;
    actor: string;
    timestamp: string;
  }>;
  newsletter: {
    totalSubscribers: number;
    confirmedSubscribers: number;
  };
  revenue?: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
}

export interface AnalyticsBookingsData {
  counts: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  statusBreakdown: Record<string, number>;
  expiredHolds: number;
  channelBreakdown: Record<string, number>;
  averageStayDuration: number;
  dealRedemptions: number;
  timeline: Array<{
    date: string;
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
  }>;
}

export interface AnalyticsRevenueData {
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  gatewayBreakdown: Array<{
    gateway: string;
    grossRevenue: number;
    refunds: number;
    netRevenue: number;
    paymentCount: number;
  }>;
  roomTypeBreakdown: Array<{
    roomTypeId: string;
    roomTypeName: string;
    revenue: number;
    bookingsCount: number;
  }>;
  timeline: Array<{
    date: string;
    grossRevenue: number;
    refunds: number;
    netRevenue: number;
  }>;
}

export interface DailyOccupancy {
  date: string;
  rate: number;
  occupiedUnits: number;
  totalBookableUnits: number;
}

export interface AnalyticsOccupancyData {
  today: DailyOccupancy;
  currentMonth: DailyOccupancy[];
  nextMonth: DailyOccupancy[];
}

/**
 * Returns YYYY-MM-DD representation of a Date in WAT (UTC+1).
 */
export function getWATDateString(date: Date = new Date()): string {
  const watMs = date.getTime() + 1 * 3600 * 1000;
  return new Date(watMs).toISOString().slice(0, 10);
}

/**
 * Start of today (00:00:00) in WAT as a UTC Date object.
 */
export function getWATStartOfToday(): Date {
  const todayStr = getWATDateString();
  return resortDateTime(todayStr, 0);
}

/**
 * Start of this week (Monday 00:00:00) in WAT as a UTC Date object.
 */
export function getWATStartOfWeek(): Date {
  const watMs = Date.now() + 1 * 3600 * 1000;
  const watDate = new Date(watMs);
  const day = watDate.getUTCDay(); // 0 = Sun, 1 = Mon...
  const diffDays = day === 0 ? -6 : 1 - day;
  const todayStr = getWATDateString();
  const mondayStr = addCalendarDays(todayStr, diffDays);
  return resortDateTime(mondayStr, 0);
}

/**
 * Start of this month (1st of month 00:00:00) in WAT as a UTC Date object.
 */
export function getWATStartOfMonth(): Date {
  const todayStr = getWATDateString();
  const firstDayStr = `${todayStr.slice(0, 7)}-01`;
  return resortDateTime(firstDayStr, 0);
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdminClient>;

/** Thrown when an analytics query fails, so endpoints return 500 instead of reporting zeros. */
export class AnalyticsQueryError extends Error {
  constructor(label: string, cause: unknown) {
    const detail =
      cause && typeof cause === "object" && "message" in cause
        ? String(cause.message)
        : String(cause);
    super(`Analytics query failed (${label}): ${detail}`);
    this.name = "AnalyticsQueryError";
  }
}

function unwrap<T>(result: { data: T | null; error: unknown }, label: string): T {
  if (result.error) throw new AnalyticsQueryError(label, result.error);
  return result.data as T;
}

function unwrapCount(result: { count: number | null; error: unknown }, label: string): number {
  if (result.error) throw new AnalyticsQueryError(label, result.error);
  return result.count ?? 0;
}

async function fetchDailyOccupancy(
  supabase: SupabaseAdmin,
  startDate: string,
  endDate: string
): Promise<DailyOccupancy[]> {
  const rows = unwrap(
    await supabase.rpc("get_daily_occupancy_rates", {
      p_start_date: startDate,
      p_end_date: endDate,
    }),
    "get_daily_occupancy_rates"
  );
  return (rows || []).map((r) => ({
    date: r.stay_date,
    rate: Number(r.occupancy_rate || 0),
    occupiedUnits: Number(r.occupied_units || 0),
    totalBookableUnits: Number(r.total_bookable_units || 0),
  }));
}

function isPaymentTimeout(booking: {
  cancellation_reason?: string | null;
  special_requests?: string | null;
}): boolean {
  return (
    booking.cancellation_reason === "payment_timeout" ||
    (typeof booking.special_requests === "string" &&
      booking.special_requests.includes("payment timeout"))
  );
}

export interface AdminNotificationCounts {
  count: number;
  pendingBookings: number;
  unreadContactSubmissions: number;
  unreadEventInquiries: number;
  /** Resort Admin+ only */
  refundsToProcess?: number;
}

/**
 * Notification bell counts for every admin page (all staff roles). Kept to head-only count
 * queries so the topbar can poll it cheaply.
 */
export async function getNotificationCounts(userRole: UserRole): Promise<AdminNotificationCounts> {
  const supabase = getSupabaseAdminClient();
  const isFinancialRole = userRole === "resort_admin" || userRole === "super_admin";

  const [pendingResult, contactsResult, inquiriesResult, refundsResult] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("contact_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("event_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    isFinancialRole
      ? supabase
          .from("payments")
          .select("id", { count: "exact", head: true })
          .or(REFUND_QUEUE_FILTER)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const pendingBookings = unwrapCount(pendingResult, "pending bookings");
  const unreadContactSubmissions = unwrapCount(contactsResult, "unread contact submissions");
  const unreadEventInquiries = unwrapCount(inquiriesResult, "unread event inquiries");
  const refundsToProcess = unwrapCount(refundsResult, "refunds to process");

  return {
    count:
      pendingBookings +
      unreadContactSubmissions +
      unreadEventInquiries +
      (isFinancialRole ? refundsToProcess : 0),
    pendingBookings,
    unreadContactSubmissions,
    unreadEventInquiries,
    ...(isFinancialRole ? { refundsToProcess } : {}),
  };
}

/**
 * Service: Admin Dashboard Summary (accessible to all staff roles).
 * Content Managers receive strictly non-financial KPIs.
 */
export async function getAdminSummary(userRole: UserRole): Promise<AdminSummaryData> {
  const supabase = getSupabaseAdminClient();
  const isFinancialRole = userRole === "resort_admin" || userRole === "super_admin";

  const todayStr = getWATDateString();
  const startOfToday = getWATStartOfToday().toISOString();
  const startOfWeek = getWATStartOfWeek().toISOString();
  const startOfMonth = getWATStartOfMonth().toISOString();

  // 1. Fetch bookings
  const bookingsList =
    unwrap(
      await supabase
        .from("bookings")
        .select("id, status, cancellation_reason, special_requests, created_at"),
      "summary bookings"
    ) || [];
  let bookingsToday = 0;
  let bookingsWeek = 0;
  let bookingsMonth = 0;
  let pendingCount = 0;
  let expiredHoldsCount = 0;

  for (const b of bookingsList) {
    const isTimeout = isPaymentTimeout(b);
    if (isTimeout) {
      expiredHoldsCount++;
      continue;
    }

    if (b.status === "pending") {
      pendingCount++;
    }

    const createdAt = b.created_at;
    if (createdAt >= startOfToday) {
      bookingsToday++;
    }
    if (createdAt >= startOfWeek) {
      bookingsWeek++;
    }
    if (createdAt >= startOfMonth) {
      bookingsMonth++;
    }
  }

  // 2. Occupancy today
  const occupancyToday: DailyOccupancy = (
    await fetchDailyOccupancy(supabase, todayStr, todayStr)
  )[0] || {
    date: todayStr,
    rate: 0,
    occupiedUnits: 0,
    totalBookableUnits: 0,
  };

  // 3. Inbox and bell counts (same source as the topbar bell on every page)
  const notifications = await getNotificationCounts(userRole);
  const { unreadContactSubmissions, unreadEventInquiries, refundsToProcess } = notifications;

  // 4. Financial items if Resort Admin+
  let revenueSummary: AdminSummaryData["revenue"] | undefined;

  if (isFinancialRole) {
    // Revenue calculation
    const payments =
      unwrap(
        await supabase
          .from("payments")
          .select("amount, refund_amount, status, paid_at, refunded_at"),
        "summary payments"
      ) || [];
    let grossToday = 0;
    let grossWeek = 0;
    let grossMonth = 0;
    let grossTotal = 0;

    let refundsToday = 0;
    let refundsWeek = 0;
    let refundsMonth = 0;
    let refundsTotal = 0;

    for (const p of payments) {
      if (
        p.paid_at &&
        (p.status === "success" || p.status === "refunded" || p.status === "partially_refunded")
      ) {
        const amt = Number(p.amount || 0);
        grossTotal += amt;
        if (p.paid_at >= startOfToday) grossToday += amt;
        if (p.paid_at >= startOfWeek) grossWeek += amt;
        if (p.paid_at >= startOfMonth) grossMonth += amt;
      }

      if (p.refunded_at && (p.status === "refunded" || p.status === "partially_refunded")) {
        const refAmt = Number(p.refund_amount != null ? p.refund_amount : p.amount || 0);
        refundsTotal += refAmt;
        if (p.refunded_at >= startOfToday) refundsToday += refAmt;
        if (p.refunded_at >= startOfWeek) refundsWeek += refAmt;
        if (p.refunded_at >= startOfMonth) refundsMonth += refAmt;
      }
    }

    revenueSummary = {
      today: grossToday - refundsToday,
      thisWeek: grossWeek - refundsWeek,
      thisMonth: grossMonth - refundsMonth,
      total: grossTotal - refundsTotal,
    };
  }

  // 6. Newsletter stats
  const [totalSubsResult, confirmedSubsResult] = await Promise.all([
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .is("unsubscribed_at", null),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .is("unsubscribed_at", null)
      .eq("is_confirmed", true),
  ]);

  // 7. Recent Activity Feed (Merge last 10 actions from history, inquiries, contacts, audit)
  const recentActivity = await getRecentActivityFeed(supabase);

  return {
    bookings: {
      today: bookingsToday,
      thisWeek: bookingsWeek,
      thisMonth: bookingsMonth,
      pending: pendingCount,
      expiredHolds: expiredHoldsCount,
    },
    occupancy: {
      rateToday: occupancyToday.rate,
      occupiedUnitsToday: occupancyToday.occupiedUnits,
      bookableUnitsToday: occupancyToday.totalBookableUnits,
    },
    inbox: {
      unreadContactSubmissions,
      unreadEventInquiries,
      ...(isFinancialRole ? { refundsToProcess } : {}),
    },
    notificationBell: notifications,
    recentActivity,
    newsletter: {
      totalSubscribers: unwrapCount(totalSubsResult, "newsletter subscribers"),
      confirmedSubscribers: unwrapCount(confirmedSubsResult, "confirmed newsletter subscribers"),
    },
    ...(isFinancialRole && revenueSummary ? { revenue: revenueSummary } : {}),
  };
}

/**
 * Service: Bookings Analytics (Resort Admin+ only).
 */
export async function getBookingsAnalytics(): Promise<AnalyticsBookingsData> {
  const supabase = getSupabaseAdminClient();
  const todayStr = getWATDateString();
  const startOfToday = getWATStartOfToday().toISOString();
  const startOfWeek = getWATStartOfWeek().toISOString();
  const startOfMonth = getWATStartOfMonth().toISOString();

  const bookings =
    unwrap(
      await supabase
        .from("bookings")
        .select(
          "id, reference, status, channel, cancellation_reason, special_requests, nights, deal_id, deal_discount, created_at"
        )
        .order("created_at", { ascending: false }),
      "analytics bookings"
    ) || [];

  let countTotal = 0;
  let countToday = 0;
  let countWeek = 0;
  let countMonth = 0;
  let expiredHolds = 0;
  let dealRedemptions = 0;
  let totalNights = 0;

  const statusBreakdown: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    checked_in: 0,
    checked_out: 0,
    cancelled: 0,
    no_show: 0,
  };

  const channelBreakdown: Record<BookingChannel, number> = {
    online_guest: 0,
    online_account: 0,
    walk_in: 0,
  };

  // 30 days timeline
  const thirtyDaysMap: Record<
    string,
    { totalBookings: number; confirmedBookings: number; cancelledBookings: number }
  > = {};
  for (let i = 29; i >= 0; i--) {
    const d = addCalendarDays(todayStr, -i);
    thirtyDaysMap[d] = { totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0 };
  }

  for (const b of bookings) {
    const isTimeout = isPaymentTimeout(b);
    if (isTimeout) {
      expiredHolds++;
      continue;
    }

    countTotal++;
    const createdAt = b.created_at;
    if (createdAt >= startOfToday) countToday++;
    if (createdAt >= startOfWeek) countWeek++;
    if (createdAt >= startOfMonth) countMonth++;

    if (b.status && statusBreakdown[b.status] !== undefined) {
      statusBreakdown[b.status]++;
    }

    const ch = b.channel as BookingChannel;
    channelBreakdown[ch] = (channelBreakdown[ch] || 0) + 1;

    totalNights += Number(b.nights || 0);
    if (b.deal_id || Number(b.deal_discount || 0) > 0) {
      dealRedemptions++;
    }

    // Timeline mapping
    const bDateWAT = getWATDateString(new Date(b.created_at));
    if (thirtyDaysMap[bDateWAT]) {
      thirtyDaysMap[bDateWAT].totalBookings++;
      if (b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out") {
        thirtyDaysMap[bDateWAT].confirmedBookings++;
      } else if (b.status === "cancelled") {
        thirtyDaysMap[bDateWAT].cancelledBookings++;
      }
    }
  }

  const averageStayDuration = countTotal > 0 ? Math.round((totalNights / countTotal) * 10) / 10 : 0;

  const timeline = Object.keys(thirtyDaysMap)
    .sort()
    .map((date) => ({
      date,
      totalBookings: thirtyDaysMap[date].totalBookings,
      confirmedBookings: thirtyDaysMap[date].confirmedBookings,
      cancelledBookings: thirtyDaysMap[date].cancelledBookings,
    }));

  return {
    counts: {
      total: countTotal,
      today: countToday,
      thisWeek: countWeek,
      thisMonth: countMonth,
    },
    statusBreakdown,
    expiredHolds,
    channelBreakdown,
    averageStayDuration,
    dealRedemptions,
    timeline,
  };
}

/**
 * Service: Revenue Analytics (Resort Admin+ only).
 * Revenue = successful payments by paid_at minus processed refunds by refunded_at.
 */
export async function getRevenueAnalytics(): Promise<AnalyticsRevenueData> {
  const supabase = getSupabaseAdminClient();
  const todayStr = getWATDateString();
  const startOfToday = getWATStartOfToday().toISOString();
  const startOfWeek = getWATStartOfWeek().toISOString();
  const startOfMonth = getWATStartOfMonth().toISOString();

  const payments =
    unwrap(
      await supabase
        .from("payments")
        .select("id, booking_id, gateway, amount, refund_amount, status, paid_at, refunded_at"),
      "revenue payments"
    ) || [];

  let grossTotal = 0;
  let grossToday = 0;
  let grossWeek = 0;
  let grossMonth = 0;

  let refundsTotal = 0;
  let refundsToday = 0;
  let refundsWeek = 0;
  let refundsMonth = 0;

  const gatewayMap: Record<string, { gross: number; refunds: number; count: number }> = {
    paystack: { gross: 0, refunds: 0, count: 0 },
    bank_transfer: { gross: 0, refunds: 0, count: 0 },
    cash: { gross: 0, refunds: 0, count: 0 },
    pos: { gross: 0, refunds: 0, count: 0 },
  };

  const timelineMap: Record<string, { grossRevenue: number; refunds: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = addCalendarDays(todayStr, -i);
    timelineMap[d] = { grossRevenue: 0, refunds: 0 };
  }

  for (const p of payments) {
    const gateway = p.gateway || "paystack";
    if (!gatewayMap[gateway]) {
      gatewayMap[gateway] = { gross: 0, refunds: 0, count: 0 };
    }

    if (
      p.paid_at &&
      (p.status === "success" || p.status === "refunded" || p.status === "partially_refunded")
    ) {
      const amt = Number(p.amount || 0);
      grossTotal += amt;
      gatewayMap[gateway].gross += amt;
      gatewayMap[gateway].count++;

      if (p.paid_at >= startOfToday) grossToday += amt;
      if (p.paid_at >= startOfWeek) grossWeek += amt;
      if (p.paid_at >= startOfMonth) grossMonth += amt;

      const pDateWAT = getWATDateString(new Date(p.paid_at));
      if (timelineMap[pDateWAT]) {
        timelineMap[pDateWAT].grossRevenue += amt;
      }
    }

    if (p.refunded_at && (p.status === "refunded" || p.status === "partially_refunded")) {
      const refAmt = Number(p.refund_amount != null ? p.refund_amount : p.amount || 0);
      refundsTotal += refAmt;
      gatewayMap[gateway].refunds += refAmt;

      if (p.refunded_at >= startOfToday) refundsToday += refAmt;
      if (p.refunded_at >= startOfWeek) refundsWeek += refAmt;
      if (p.refunded_at >= startOfMonth) refundsMonth += refAmt;

      const rDateWAT = getWATDateString(new Date(p.refunded_at));
      if (timelineMap[rDateWAT]) {
        timelineMap[rDateWAT].refunds += refAmt;
      }
    }
  }

  const gatewayBreakdown = Object.keys(gatewayMap).map((gw) => ({
    gateway: gw,
    grossRevenue: gatewayMap[gw].gross,
    refunds: gatewayMap[gw].refunds,
    netRevenue: gatewayMap[gw].gross - gatewayMap[gw].refunds,
    paymentCount: gatewayMap[gw].count,
  }));

  const timeline = Object.keys(timelineMap)
    .sort()
    .map((date) => ({
      date,
      grossRevenue: timelineMap[date].grossRevenue,
      refunds: timelineMap[date].refunds,
      netRevenue: timelineMap[date].grossRevenue - timelineMap[date].refunds,
    }));

  // Room type revenue breakdown: join booking_line_items with room_types
  const roomTypeBreakdown = await getRoomTypeRevenueBreakdown(supabase, payments);

  return {
    revenue: {
      total: grossTotal - refundsTotal,
      today: grossToday - refundsToday,
      thisWeek: grossWeek - refundsWeek,
      thisMonth: grossMonth - refundsMonth,
    },
    gatewayBreakdown,
    roomTypeBreakdown,
    timeline,
  };
}

/**
 * Service: Occupancy Analytics (Resort Admin+ only).
 * Returns today's occupancy and calendar heatmaps for current and next month.
 */
export async function getOccupancyAnalytics(): Promise<AnalyticsOccupancyData> {
  const supabase = getSupabaseAdminClient();
  const todayStr = getWATDateString();

  // Current month bounds (1st to last day)
  const currentMonthStart = `${todayStr.slice(0, 7)}-01`;
  const [cYear, cMonth] = todayStr.split("-").map(Number);
  const nextMonthDate = new Date(Date.UTC(cYear, cMonth, 1));
  const currentMonthLastDayDate = new Date(Date.UTC(cYear, cMonth, 0));
  const currentMonthEnd = currentMonthLastDayDate.toISOString().slice(0, 10);

  // Next month bounds (1st to last day)
  const nextMonthYear = nextMonthDate.getUTCFullYear();
  const nextMonthNum = nextMonthDate.getUTCMonth() + 1;
  const nextMonthStart = `${nextMonthYear}-${String(nextMonthNum).padStart(2, "0")}-01`;
  const nextMonthLastDayDate = new Date(Date.UTC(nextMonthYear, nextMonthNum, 0));
  const nextMonthEnd = nextMonthLastDayDate.toISOString().slice(0, 10);

  const [currentMonthData, nextMonthData] = await Promise.all([
    fetchDailyOccupancy(supabase, currentMonthStart, currentMonthEnd),
    fetchDailyOccupancy(supabase, nextMonthStart, nextMonthEnd),
  ]);

  const todayOccupancy = currentMonthData.find((d) => d.date === todayStr) || {
    date: todayStr,
    rate: 0,
    occupiedUnits: 0,
    totalBookableUnits: 0,
  };

  return {
    today: todayOccupancy,
    currentMonth: currentMonthData,
    nextMonth: nextMonthData,
  };
}

/**
 * Helper to fetch and merge last 10 audit and status actions for the activity feed.
 */
async function getRecentActivityFeed(
  supabase: SupabaseAdmin
): Promise<AdminSummaryData["recentActivity"]> {
  const [historyResult, auditResult, contactsResult, inquiriesResult] = await Promise.all([
    supabase
      .from("booking_status_history")
      .select(
        "id, booking_id, from_status, to_status, note, created_at, bookings(reference, guest_name)"
      )
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("audit_logs")
      .select("id, action, entity, entity_id, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("contact_submissions")
      .select("id, name, subject, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("event_inquiries")
      .select("id, contact_name, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const statusHistory = unwrap(historyResult, "activity status history");
  const auditLogs = unwrap(auditResult, "activity audit logs");
  const contacts = unwrap(contactsResult, "activity contact submissions");
  const inquiries = unwrap(inquiriesResult, "activity event inquiries");

  const items: AdminSummaryData["recentActivity"] = [];

  for (const h of statusHistory || []) {
    const booking = (h as Record<string, unknown>).bookings as
      { reference?: string; guest_name?: string } | undefined;
    const ref = booking?.reference || "Unknown";
    const guest = booking?.guest_name ? ` (${booking.guest_name})` : "";
    const fromText = h.from_status ? `${h.from_status} → ` : "";
    items.push({
      id: h.id,
      type: "booking_status",
      title: `Booking #${ref}${guest}`,
      description: `Status changed: ${fromText}${h.to_status}${h.note ? ` (${h.note})` : ""}`,
      actor: h.note === "payment_timeout" ? "System" : "Staff / System",
      timestamp: h.created_at,
    });
  }

  for (const a of auditLogs || []) {
    items.push({
      id: a.id,
      type: "audit_log",
      title: `Admin Action: ${a.action}`,
      description: `Target: ${a.entity} (${a.entity_id.slice(0, 8)}...)`,
      actor: a.user_id ? "Staff" : "System",
      timestamp: a.created_at,
    });
  }

  for (const c of contacts || []) {
    items.push({
      id: c.id,
      type: "contact_submission",
      title: `Contact: ${c.subject}`,
      description: `Message from ${c.name}`,
      actor: c.name,
      timestamp: c.created_at,
    });
  }

  for (const eq of inquiries || []) {
    items.push({
      id: eq.id,
      type: "event_inquiry",
      title: "Event Inquiry Received",
      description: `Inquiry submitted by ${eq.contact_name}`,
      actor: eq.contact_name,
      timestamp: eq.created_at,
    });
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}

/**
 * Revenue by room type, consistent with net revenue: each booking's net paid amount (successful
 * payments minus processed refunds, tax included) is allocated to its line items pro rata by
 * line_total.
 */
export async function getRoomTypeRevenueBreakdown(
  supabase: SupabaseAdmin,
  payments: Array<{
    booking_id?: string | null;
    status?: string | null;
    amount?: number | null;
    refund_amount?: number | null;
    paid_at?: string | null;
    refunded_at?: string | null;
  }>
): Promise<AnalyticsRevenueData["roomTypeBreakdown"]> {
  const netByBooking = new Map<string, number>();
  for (const p of payments) {
    if (!p.booking_id) continue;
    let net = 0;
    if (
      p.paid_at &&
      (p.status === "success" || p.status === "refunded" || p.status === "partially_refunded")
    ) {
      net += Number(p.amount || 0);
    }
    if (p.refunded_at && (p.status === "refunded" || p.status === "partially_refunded")) {
      net -= Number(p.refund_amount != null ? p.refund_amount : p.amount || 0);
    }
    if (net !== 0 || netByBooking.has(p.booking_id)) {
      netByBooking.set(p.booking_id, (netByBooking.get(p.booking_id) || 0) + net);
    }
  }

  if (netByBooking.size === 0) return [];

  const lineItems =
    unwrap(
      await supabase
        .from("booking_line_items")
        .select("line_total, room_type_id, booking_id, room_types(name)")
        .in("booking_id", Array.from(netByBooking.keys())),
      "room type revenue line items"
    ) || [];

  const lineTotalByBooking = new Map<string, number>();
  for (const item of lineItems) {
    lineTotalByBooking.set(
      item.booking_id,
      (lineTotalByBooking.get(item.booking_id) || 0) + Number(item.line_total || 0)
    );
  }

  const map: Record<string, { name: string; revenue: number; bookingsCount: Set<string> }> = {};

  for (const item of lineItems) {
    const rtId = item.room_type_id;
    const name =
      ((item as Record<string, unknown>).room_types as { name?: string } | undefined)?.name ||
      "Room";
    if (!map[rtId]) {
      map[rtId] = { name, revenue: 0, bookingsCount: new Set() };
    }
    const bookingLineTotal = lineTotalByBooking.get(item.booking_id) || 0;
    const share = bookingLineTotal > 0 ? Number(item.line_total || 0) / bookingLineTotal : 0;
    map[rtId].revenue += (netByBooking.get(item.booking_id) || 0) * share;
    map[rtId].bookingsCount.add(item.booking_id);
  }

  return Object.keys(map).map((rtId) => ({
    roomTypeId: rtId,
    roomTypeName: map[rtId].name,
    revenue: Math.round(map[rtId].revenue),
    bookingsCount: map[rtId].bookingsCount.size,
  }));
}
