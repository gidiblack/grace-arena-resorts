/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FakeSupabase } from "@/test-utils/fake-supabase";
import { mockApiCall } from "@/test-utils/api";
import { resetRateLimits } from "@/lib/security/rate-limit";
import { requireAdminPage, ADMIN_LAST_SEEN_COOKIE, ADMIN_IDLE_TIMEOUT_MS } from "@/lib/auth/admin-guard";
import { ACCESS_COOKIE } from "@/services/auth/session";
import type { UserRole } from "@/types/db";

// Mock email & external side effects
vi.mock("@/services/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: "mock-email-id" }),
}));

vi.mock("@/services/booking/notifications", () => ({
  runAfterResponse: (_label: string, task: () => Promise<unknown>) => {
    task().catch(() => {});
  },
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/services/payments/refund", () => ({
  initiatePaystackRefund: vi.fn().mockResolvedValue({ success: true, refundId: "paystack_ref_123" }),
}));

const db = vi.hoisted(() => ({ current: null as unknown as FakeSupabase }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => db.current.client,
  createSupabaseAuthClient: () => db.current.authClient,
}));

// Endpoints under test
import adminSummaryHandler from "@/pages/api/v1/admin/summary";
import analyticsBookingsHandler from "@/pages/api/v1/analytics/bookings";
import analyticsRevenueHandler from "@/pages/api/v1/analytics/revenue";
import analyticsOccupancyHandler from "@/pages/api/v1/analytics/occupancy";
import offlinePaymentHandler from "@/pages/api/v1/bookings/[ref]/offline-payment";
import refundHandler from "@/pages/api/v1/payments/[id]/refund";
import bookingStatusHandler from "@/pages/api/v1/bookings/[ref]/status";
import unitStatusHandler from "@/pages/api/v1/rooms/[id]/units/[unitId]";

const CONTENT_MANAGER_ID = "22222222-2222-2222-2222-222222222201";
const RESORT_ADMIN_ID = "33333333-3333-3333-3333-333333333301";
const GUEST_ID = "44444444-4444-4444-4444-444444444401";

function seedUser(id: string, email: string, role: UserRole) {
  db.current.authUsers.push({
    id,
    email,
    password: "Password123!",
    user_metadata: {},
    email_confirmed_at: new Date().toISOString(),
  });
  db.current.seed("users", [
    {
      id,
      email,
      full_name: `${role.replace("_", " ")} user`,
      phone: "+2348000000000",
      role,
      is_email_verified: true,
      is_locked: false,
    },
  ]);
  return db.current.issueSession(id).access_token;
}

describe("Step 12: Admin Operations & RBAC Protection", () => {
  let contentManagerToken: string;
  let resortAdminToken: string;
  let guestToken: string;

  beforeEach(() => {
    resetRateLimits();
    vi.clearAllMocks();
    db.current = new FakeSupabase();

    contentManagerToken = seedUser(CONTENT_MANAGER_ID, "cm@gracearena.com", "content_manager");
    resortAdminToken = seedUser(RESORT_ADMIN_ID, "admin@gracearena.com", "resort_admin");
    guestToken = seedUser(GUEST_ID, "guest@example.com", "guest");

    // Seed test room types and rooms
    db.current.seed("room_types", [
      { id: "rt-std", name: "Standard Deluxe", base_price: 60000, status: "available" },
      { id: "rt-hut", name: "Thatched Hut", base_price: 120000, status: "available" },
    ]);

    db.current.seed("rooms", [
      { id: "rm-101", room_type_id: "rt-std", room_number: "101", status: "available" },
      { id: "rm-102", room_type_id: "rt-std", room_number: "102", status: "available" },
      { id: "rm-201", room_type_id: "rt-hut", room_number: "201", status: "available" },
    ]);

    // Seed RPC for occupancy calculation
    db.current.rpcHandlers["get_daily_occupancy_rates"] = (args: any) => {
      const { p_start_date } = args;
      return {
        data: [
          {
            stay_date: p_start_date,
            occupancy_rate: 33.3,
            occupied_units: 1,
            total_bookable_units: 3,
          },
        ],
        error: null,
        status: 200,
      };
    };
  });

  describe("Admin Shell Server-Side Guard (requireAdminPage)", () => {
    it("redirects unauthenticated users to /login", async () => {
      const ctx: any = {
        req: { cookies: {} },
        res: { setHeader: vi.fn(), getHeader: vi.fn() },
        resolvedUrl: "/admin/bookings",
      };

      const result = await requireAdminPage(ctx);
      expect(result).toHaveProperty("redirect");
      expect((result as any).redirect.destination).toContain("/login");
    });

    it("redirects users with expired admin idle session to /login?reason=idle", async () => {
      const expiredTimestamp = (Date.now() - (ADMIN_IDLE_TIMEOUT_MS + 60000)).toString();
      const ctx: any = {
        req: {
          cookies: {
            [ACCESS_COOKIE]: resortAdminToken,
            [ADMIN_LAST_SEEN_COOKIE]: expiredTimestamp,
          },
        },
        res: { setHeader: vi.fn(), getHeader: vi.fn() },
        resolvedUrl: "/admin",
      };

      const result = await requireAdminPage(ctx);
      expect(result).toHaveProperty("redirect");
      expect((result as any).redirect.destination).toContain("reason=idle");
    });

    it("redirects guest users away from admin pages", async () => {
      const freshTimestamp = Date.now().toString();
      const ctx: any = {
        req: {
          cookies: {
            [ACCESS_COOKIE]: guestToken,
            [ADMIN_LAST_SEEN_COOKIE]: freshTimestamp,
          },
        },
        res: { setHeader: vi.fn(), getHeader: vi.fn() },
        resolvedUrl: "/admin",
      };

      const result = await requireAdminPage(ctx);
      expect(result).toHaveProperty("redirect");
      expect((result as any).redirect.destination).toContain("/login");
    });

    it("allows authorized staff and refreshes the idle timestamp cookie", async () => {
      const freshTimestamp = Date.now().toString();
      const setHeaderSpy = vi.fn();
      const ctx: any = {
        req: {
          cookies: {
            [ACCESS_COOKIE]: resortAdminToken,
            [ADMIN_LAST_SEEN_COOKIE]: freshTimestamp,
          },
        },
        res: { setHeader: setHeaderSpy, getHeader: vi.fn().mockReturnValue([]) },
        resolvedUrl: "/admin",
      };

      const result = await requireAdminPage(ctx);
      expect(result).toHaveProperty("props");
      expect((result as any).props.adminUser).toMatchObject({
        id: RESORT_ADMIN_ID,
        role: "resort_admin",
      });
      expect(setHeaderSpy).toHaveBeenCalledWith("Set-Cookie", expect.any(Array));
    });
  });

  describe("GET /api/v1/admin/summary", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const call = mockApiCall({ method: "GET" });
      await adminSummaryHandler(call.req, call.res);
      expect(call.status()).toBe(401);
    });

    it("rejects regular guest accounts with 403", async () => {
      const call = mockApiCall({
        method: "GET",
        headers: { authorization: `Bearer ${guestToken}` },
      });
      await adminSummaryHandler(call.req, call.res);
      expect(call.status()).toBe(403);
    });

    it("returns non-financial KPIs for Content Manager (revenue strictly omitted)", async () => {
      // Seed a payment and a booking
      db.current.seed("bookings", [
        {
          id: "bk-1",
          reference: "GAR-TEST-0001",
          status: "confirmed",
          created_at: new Date().toISOString(),
        },
      ]);
      db.current.seed("payments", [
        {
          id: "pm-1",
          amount: 60000,
          status: "success",
          paid_at: new Date().toISOString(),
        },
      ]);

      const call = mockApiCall({
        method: "GET",
        headers: { authorization: `Bearer ${contentManagerToken}` },
      });
      await adminSummaryHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      const data = call.body().data;
      expect(data).toBeDefined();
      expect(data.bookings).toBeDefined();
      expect(data.inbox).toBeDefined();
      // Financial fields must be omitted for content_manager
      expect(data.revenue).toBeUndefined();
      expect(data.inbox.refundsToProcess).toBeUndefined();
      expect(data.notificationBell.refundsToProcess).toBeUndefined();
    });

    it("returns full financial metrics for Resort Admin", async () => {
      const nowIso = new Date().toISOString();
      db.current.seed("bookings", [
        {
          id: "bk-2",
          reference: "GAR-TEST-0002",
          status: "confirmed",
          created_at: nowIso,
        },
      ]);
      db.current.seed("payments", [
        {
          id: "pm-2",
          amount: 120000,
          status: "success",
          paid_at: nowIso,
        },
      ]);

      const call = mockApiCall({
        method: "GET",
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await adminSummaryHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      const data = call.body().data;
      expect(data.revenue).toBeDefined();
      expect(data.revenue.total).toBe(120000);
    });
  });

  describe("Analytics Role-Based Access Control", () => {
    it("forbids Content Manager from accessing bookings analytics (403)", async () => {
      const call = mockApiCall({
        method: "GET",
        headers: { authorization: `Bearer ${contentManagerToken}` },
      });
      await analyticsBookingsHandler(call.req, call.res);
      expect(call.status()).toBe(403);
    });

    it("forbids Content Manager from accessing revenue analytics (403)", async () => {
      const call = mockApiCall({
        method: "GET",
        headers: { authorization: `Bearer ${contentManagerToken}` },
      });
      await analyticsRevenueHandler(call.req, call.res);
      expect(call.status()).toBe(403);
    });

    it("forbids Content Manager from accessing occupancy analytics (403)", async () => {
      const call = mockApiCall({
        method: "GET",
        headers: { authorization: `Bearer ${contentManagerToken}` },
      });
      await analyticsOccupancyHandler(call.req, call.res);
      expect(call.status()).toBe(403);
    });

    it("allows Resort Admin to access bookings analytics", async () => {
      db.current.seed("bookings", [
        {
          id: "b-admin-1",
          reference: "GAR-ADM-0001",
          status: "confirmed",
          channel: "direct_web",
          nights: 2,
          created_at: new Date().toISOString(),
        },
      ]);

      const call = mockApiCall({
        method: "GET",
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await analyticsBookingsHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      const data = call.body().data;
      expect(data.counts.total).toBeGreaterThanOrEqual(1);
      expect(data.channelBreakdown).toBeDefined();
      expect(data.timeline).toBeInstanceOf(Array);
    });

    it("allows Resort Admin to access revenue analytics", async () => {
      db.current.seed("payments", [
        {
          id: "p-admin-1",
          amount: 80000,
          status: "success",
          gateway: "paystack",
          paid_at: new Date().toISOString(),
        },
      ]);

      const call = mockApiCall({
        method: "GET",
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await analyticsRevenueHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      const data = call.body().data;
      expect(data.revenue.total).toBe(80000);
      expect(data.gatewayBreakdown).toBeInstanceOf(Array);
      expect(data.timeline).toBeInstanceOf(Array);
    });

    it("allows Resort Admin to access occupancy analytics", async () => {
      const call = mockApiCall({
        method: "GET",
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await analyticsOccupancyHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      const data = call.body().data;
      expect(data.today).toBeDefined();
      expect(data.currentMonth).toBeInstanceOf(Array);
      expect(data.nextMonth).toBeInstanceOf(Array);
    });
  });

  describe("Operations: Offline Payment Confirmation", () => {
    it("rejects Content Manager attempting to confirm offline payment (403)", async () => {
      const call = mockApiCall({
        method: "POST",
        query: { ref: "GAR-OFF-0001" },
        body: {
          method: "cash",
          amount: 60000,
          reference: "REC-12345",
        },
        headers: { authorization: `Bearer ${contentManagerToken}` },
      });
      await offlinePaymentHandler(call.req, call.res);
      expect(call.status()).toBe(403);
    });

    it("records offline payment, confirms booking, and logs audit record", async () => {
      const futureHold = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      db.current.seed("bookings", [
        {
          id: "b-offline-1",
          reference: "GAR-OFF-0001",
          status: "pending",
          total: 60000,
          hold_expires_at: futureHold,
          created_at: new Date().toISOString(),
        },
      ]);

      const call = mockApiCall({
        method: "POST",
        query: { ref: "GAR-OFF-0001" },
        body: {
          method: "bank_transfer",
          amount: 60000,
          reference: "TRANS-REF-9988",
          note: "Verified via GTBank mobile transfer",
        },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await offlinePaymentHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      const response = call.body().data;
      expect(response.booking.status).toBe("confirmed");
      expect(response.payment.status).toBe("success");

      // Verify audit log entry was created
      const auditLogs = db.current.rows("audit_logs");
      expect(auditLogs.length).toBeGreaterThan(0);
      const auditRecord = auditLogs.find((a) => a.action === "RECORD_OFFLINE_PAYMENT");
      expect(auditRecord).toBeDefined();
      expect(auditRecord?.user_id).toBe(RESORT_ADMIN_ID);
    });

    it("fails when attempting to record offline payment on a non-pending booking", async () => {
      db.current.seed("bookings", [
        {
          id: "b-offline-2",
          reference: "GAR-OFF-0002",
          status: "confirmed",
          total: 60000,
          created_at: new Date().toISOString(),
        },
      ]);

      const call = mockApiCall({
        method: "POST",
        query: { ref: "GAR-OFF-0002" },
        body: {
          method: "cash",
          amount: 60000,
          reference: "REC-12346",
        },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await offlinePaymentHandler(call.req, call.res);

      expect(call.status()).toBe(400);
      expect(call.body().error.code).toBe("INVALID_BOOKING_STATUS");
    });
  });

  describe("Operations: Manual Refund Lifecycle", () => {
    it("marks pending refund as processed with destination account details", async () => {
      db.current.seed("bookings", [
        {
          id: "b-ref-1",
          reference: "GAR-REF-0001",
          status: "cancelled",
          guest_name: "John Doe",
          guest_email: "john@example.com",
        },
      ]);
      db.current.seed("payments", [
        {
          id: "p-ref-1",
          booking_id: "b-ref-1",
          amount: 50000,
          status: "refund_pending",
          refund_amount: 50000,
        },
      ]);

      const call = mockApiCall({
        method: "POST",
        query: { id: "p-ref-1" },
        body: {
          action: "mark_processed",
          reference: "GTB-REF-12345",
          destination: {
            bankName: "Access Bank",
            accountLast4: "5678",
          },
          note: "Processed manual bank reversal",
        },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await refundHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      const data = call.body().data;
      expect(data.payment.status).toBe("refunded");
      expect(data.payment.refund_processed_by).toBe(RESORT_ADMIN_ID);

      const auditLogs = db.current.rows("audit_logs");
      const refundAudit = auditLogs.find((a) => a.action === "RECORD_REFUND_PROCESSED");
      expect(refundAudit).toBeDefined();
      expect(refundAudit?.user_id).toBe(RESORT_ADMIN_ID);
    });

    it("rejects refund operation on a payment that is not in pending or failed status", async () => {
      db.current.seed("payments", [
        {
          id: "p-ref-2",
          amount: 50000,
          status: "success",
        },
      ]);

      const call = mockApiCall({
        method: "POST",
        query: { id: "p-ref-2" },
        body: {
          action: "mark_processed",
        },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await refundHandler(call.req, call.res);

      expect(call.status()).toBe(400);
      expect(call.body().error.code).toBe("INVALID_PAYMENT_STATUS");
    });
  });

  describe("Operations: Booking Status & Room Assignment Lifecycle", () => {
    it("transitions confirmed booking to checked_in when assigning a physical room", async () => {
      const lineItemId = crypto.randomUUID();
      const roomId = crypto.randomUUID();

      db.current.seed("bookings", [
        {
          id: "b-chk-1",
          reference: "GAR-CHK-0001",
          status: "confirmed",
          total: 60000,
          created_at: new Date().toISOString(),
        },
      ]);
      db.current.seed("booking_line_items", [
        {
          id: lineItemId,
          booking_id: "b-chk-1",
          room_type_id: "rt-std",
          quantity: 1,
        },
      ]);

      // Seed room with UUID
      db.current.seed("rooms", [
        {
          id: roomId,
          room_type_id: "rt-std",
          room_number: "105",
          status: "available",
        },
      ]);

      const call = mockApiCall({
        method: "PATCH",
        query: { ref: "GAR-CHK-0001" },
        body: {
          status: "checked_in",
          assignments: [
            {
              bookingLineItemId: lineItemId,
              roomId: roomId,
            },
          ],
          note: "Guest presented ID and checked in at front desk",
        },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });

      await bookingStatusHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      const data = call.body().data;
      expect(data.booking.status).toBe("checked_in");

      // Verify status history row was created
      const historyRows = db.current.rows("booking_status_history");
      expect(historyRows.length).toBeGreaterThan(0);
      expect(historyRows[0].to_status).toBe("checked_in");
    });
  });

  describe("Operations: Unit Maintenance Controls", () => {
    it("places an available unit into maintenance", async () => {
      const call = mockApiCall({
        method: "PATCH",
        query: { id: "rt-std", unitId: "rm-101" },
        body: { status: "maintenance" },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await unitStatusHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      const unit = call.body().data.unit;
      expect(unit.status).toBe("maintenance");

      const auditLogs = db.current.rows("audit_logs");
      const unitAudit = auditLogs.find((a) => a.action === "UPDATE_ROOM_UNIT_STATUS");
      expect(unitAudit).toBeDefined();
    });

    it("prevents placing an occupied unit into maintenance", async () => {
      db.current.seed("rooms", [
        {
          id: "rm-occupied",
          room_type_id: "rt-std",
          room_number: "108",
          status: "occupied",
        },
      ]);

      const call = mockApiCall({
        method: "PATCH",
        query: { id: "rt-std", unitId: "rm-occupied" },
        body: { status: "maintenance" },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await unitStatusHandler(call.req, call.res);

      expect(call.status()).toBe(400);
      expect(call.body().error.code).toBe("UNIT_OCCUPIED");
    });
  });
});
