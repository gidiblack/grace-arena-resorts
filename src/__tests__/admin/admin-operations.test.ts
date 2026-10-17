/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FakeSupabase } from "@/test-utils/fake-supabase";
import { mockApiCall } from "@/test-utils/api";
import { resetRateLimits } from "@/lib/security/rate-limit";
import {
  requireAdminPage,
  ADMIN_LAST_SEEN_COOKIE,
  ADMIN_IDLE_TIMEOUT_MS,
} from "@/lib/auth/admin-guard";
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
  initiatePaystackRefund: vi
    .fn()
    .mockResolvedValue({ success: true, refundId: "paystack_ref_123" }),
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

import cancelHandler from "@/pages/api/v1/bookings/[ref]/cancel";
import bookingsListHandler from "@/pages/api/v1/bookings/index";

/** Mirrors trg_booking_status_history: every status change writes one history row. */
function setBookingStatus(bookingId: string, status: string, actor: string | null) {
  const booking = db.current.rows("bookings").find((b) => b.id === bookingId)!;
  db.current.rows("booking_status_history").push({
    id: crypto.randomUUID(),
    booking_id: bookingId,
    from_status: booking.status,
    to_status: status,
    changed_by: actor,
  });
  booking.status = status;
  booking.status_changed_by = actor;
}

function rpcError(message: string, code = "P0001") {
  return { data: null, error: { code, message }, status: 400 };
}

/** In-memory equivalents of the 0009 RPCs (check-in, check-out, offline payment). */
function installAdminRpcs() {
  db.current.rpcHandlers["check_in_booking"] = ({ p_booking_id, p_assignments, p_actor }: any) => {
    const booking = db.current.rows("bookings").find((b) => b.id === p_booking_id);
    if (!booking) return rpcError("BOOKING_NOT_FOUND");
    if (booking.status !== "confirmed") return rpcError("INVALID_TRANSITION");
    for (const a of p_assignments) {
      const lineItem = db.current
        .rows("booking_line_items")
        .find((li) => li.id === a.booking_line_item_id && li.booking_id === p_booking_id);
      if (!lineItem) return rpcError("INVALID_LINE_ITEM");
      const room = db.current.rows("rooms").find((r) => r.id === a.room_id);
      if (!room) return rpcError("ROOM_NOT_FOUND");
      if (room.room_type_id !== lineItem.room_type_id) return rpcError("ROOM_TYPE_MISMATCH");
      if (room.status !== "available") return rpcError("ROOM_NOT_AVAILABLE");
    }
    for (const a of p_assignments) {
      db.current.rows("booking_room_assignments").push({
        id: crypto.randomUUID(),
        booking_id: p_booking_id,
        booking_line_item_id: a.booking_line_item_id,
        room_id: a.room_id,
        released_at: null,
      });
      db.current.rows("rooms").find((r) => r.id === a.room_id)!.status = "occupied";
    }
    setBookingStatus(p_booking_id, "checked_in", p_actor);
    return { data: null, error: null, status: 200 };
  };

  db.current.rpcHandlers["record_offline_payment"] = (args: any) => {
    const booking = db.current.rows("bookings").find((b) => b.id === args.p_booking_id);
    if (!booking) return rpcError("BOOKING_NOT_FOUND");
    if (booking.status !== "pending") return rpcError("INVALID_BOOKING_STATUS");
    if (new Date(booking.hold_expires_at) < new Date()) return rpcError("BOOKING_HOLD_EXPIRED");
    if (booking.total !== args.p_amount) return rpcError("AMOUNT_MISMATCH");
    const payment = {
      id: crypto.randomUUID(),
      booking_id: args.p_booking_id,
      gateway: args.p_method,
      gateway_reference: args.p_reference,
      amount: args.p_amount,
      status: "success",
      paid_at: args.p_paid_at,
    };
    db.current.rows("payments").push(payment);
    setBookingStatus(args.p_booking_id, "confirmed", args.p_actor);
    booking.hold_expires_at = null;
    return { data: { ...payment }, error: null, status: 200 };
  };
}

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

    installAdminRpcs();
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
      expect((result as any).redirect.destination).toContain("/account?notice=admin_access_denied");
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

  describe("Regression: failures are never reported as success", () => {
    function seedConfirmedBooking(quantity = 1) {
      const lineItemId = crypto.randomUUID();
      db.current.seed("bookings", [
        {
          id: "b-reg-1",
          reference: "GAR-REG-0001",
          status: "confirmed",
          total: 60000,
          check_in_date: "2026-12-08",
          created_at: new Date().toISOString(),
        },
      ]);
      db.current.seed("booking_line_items", [
        { id: lineItemId, booking_id: "b-reg-1", room_type_id: "rt-std", quantity },
      ]);
      return lineItemId;
    }

    function seedUnit(status = "available") {
      const id = crypto.randomUUID();
      db.current.seed("rooms", [
        { id, room_type_id: "rt-std", room_number: id.slice(0, 4), status },
      ]);
      return id;
    }

    async function checkIn(assignments: Array<{ bookingLineItemId: string; roomId: string }>) {
      const call = mockApiCall({
        method: "PUT",
        query: { ref: "GAR-REG-0001" },
        body: { status: "checked_in", assignments },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await bookingStatusHandler(call.req, call.res);
      return call;
    }

    it("rejects check-in to an occupied unit and leaves booking and unit untouched", async () => {
      const lineItemId = seedConfirmedBooking();
      const occupied = seedUnit("occupied");

      const call = await checkIn([{ bookingLineItemId: lineItemId, roomId: occupied }]);

      expect(call.status()).toBe(409);
      expect(call.body().error.code).toBe("ROOM_NOT_AVAILABLE");
      expect(db.current.rows("bookings")[0].status).toBe("confirmed");
      expect(db.current.rows("booking_room_assignments")).toHaveLength(0);
    });

    it("returns 500 without touching rooms when the check-in RPC is missing", async () => {
      db.current.rpcHandlers["check_in_booking"] = () =>
        rpcError("Could not find the function", "PGRST202");
      const lineItemId = seedConfirmedBooking();
      const unit = seedUnit();

      const call = await checkIn([{ bookingLineItemId: lineItemId, roomId: unit }]);

      expect(call.status()).toBe(500);
      expect(call.body().error.code).toBe("SCHEMA_OUT_OF_DATE");
      expect(db.current.rows("rooms").find((r) => r.id === unit)?.status).toBe("available");
      expect(db.current.rows("bookings")[0].status).toBe("confirmed");
    });

    it("requires one distinct unit per booked room (quantity 2)", async () => {
      const lineItemId = seedConfirmedBooking(2);
      const unit = seedUnit();

      const tooFew = await checkIn([{ bookingLineItemId: lineItemId, roomId: unit }]);
      expect(tooFew.status()).toBe(400);
      expect(tooFew.body().error.code).toBe("INVALID_ASSIGNMENTS");

      const duplicate = await checkIn([
        { bookingLineItemId: lineItemId, roomId: unit },
        { bookingLineItemId: lineItemId, roomId: unit },
      ]);
      expect(duplicate.status()).toBe(400);
      expect(duplicate.body().error.code).toBe("DUPLICATE_UNIT");

      const second = seedUnit();
      const ok = await checkIn([
        { bookingLineItemId: lineItemId, roomId: unit },
        { bookingLineItemId: lineItemId, roomId: second },
      ]);
      expect(ok.status()).toBe(200);
      expect(db.current.rows("booking_room_assignments")).toHaveLength(2);
    });

    it("leaves status history to the database trigger (no duplicate rows from the API)", async () => {
      db.current.seed("bookings", [
        {
          id: "b-ns-1",
          reference: "GAR-NS-0001",
          status: "confirmed",
          check_in_date: "2026-01-05",
          created_at: new Date().toISOString(),
        },
      ]);
      const call = mockApiCall({
        method: "PUT",
        query: { ref: "GAR-NS-0001" },
        body: { status: "no_show" },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await bookingStatusHandler(call.req, call.res);

      expect(call.status()).toBe(200);
      expect(db.current.rows("bookings")[0].status).toBe("no_show");
      expect(db.current.rows("booking_status_history")).toHaveLength(0);
    });

    it("records no payment when the offline payment RPC fails", async () => {
      db.current.seed("bookings", [
        {
          id: "b-op-1",
          reference: "GAR-OP-0001",
          status: "pending",
          total: 60000,
          hold_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ]);
      db.current.rpcHandlers["record_offline_payment"] = () =>
        rpcError("Could not find the function", "PGRST202");

      const call = mockApiCall({
        method: "POST",
        query: { ref: "GAR-OP-0001" },
        body: { method: "bank_transfer", amount: 60000, reference: "TRX-1" },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await offlinePaymentHandler(call.req, call.res);

      expect(call.status()).toBe(500);
      expect(db.current.rows("payments")).toHaveLength(0);
      expect(db.current.rows("bookings")[0].status).toBe("pending");
    });

    it("rejects an override reason that fails validation instead of ignoring the override", async () => {
      db.current.seed("bookings", [
        {
          id: "b-cx-1",
          reference: "GAR-CX-0001",
          status: "confirmed",
          total: 60000,
          check_in_date: "2027-03-01",
          guest_email: "guest@example.com",
        },
      ]);
      db.current.seed("payments", [
        { id: "p-cx-1", booking_id: "b-cx-1", gateway: "cash", amount: 60000, status: "success" },
      ]);

      const call = mockApiCall({
        method: "PUT",
        query: { ref: "GAR-CX-0001" },
        body: { refundAmountOverride: 1000, overrideReason: "ok" },
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await cancelHandler(call.req, call.res);

      expect(call.status()).toBe(400);
      expect(call.body().error.code).toBe("INVALID_REQUEST_BODY");
      expect(db.current.rows("bookings")[0].status).toBe("confirmed");
      expect(db.current.rows("payments")[0].status).toBe("success");
    });

    it("returns 403 (not 404) when a Content Manager tries to cancel", async () => {
      const call = mockApiCall({
        method: "PUT",
        query: { ref: "GAR-CX-0001" },
        body: {},
        headers: { authorization: `Bearer ${contentManagerToken}` },
      });
      await cancelHandler(call.req, call.res);
      expect(call.status()).toBe(403);
    });
  });

  describe("GET /api/v1/bookings/{ref}/history", () => {
    beforeEach(() => {
      db.current.seed("bookings", [{ id: "b-h-1", reference: "GAR-H-0001", status: "checked_in" }]);
      db.current.seed("payments", [{ id: "p-h-1", booking_id: "b-h-1", status: "success" }]);
      db.current.seed("booking_status_history", [
        {
          id: "h-1",
          booking_id: "b-h-1",
          from_status: null,
          to_status: "pending",
          changed_by: null,
          created_at: "2026-10-01T10:00:00Z",
        },
        {
          id: "h-2",
          booking_id: "b-h-1",
          from_status: "pending",
          to_status: "confirmed",
          changed_by: null,
          created_at: "2026-10-01T10:05:00Z",
        },
        {
          id: "h-3",
          booking_id: "b-h-1",
          from_status: "confirmed",
          to_status: "checked_in",
          changed_by: RESORT_ADMIN_ID,
          created_at: "2026-10-02T14:00:00Z",
        },
        {
          id: "h-x",
          booking_id: "other",
          from_status: null,
          to_status: "pending",
          changed_by: null,
          created_at: "2026-10-01T09:00:00Z",
        },
      ]);
      db.current.seed("audit_logs", [
        {
          id: "a-1",
          user_id: RESORT_ADMIN_ID,
          action: "UPDATE_STATUS_CHECKED_IN",
          entity: "booking",
          entity_id: "b-h-1",
          new_data: { note: "ID verified" },
          created_at: "2026-10-02T14:00:01Z",
        },
        {
          id: "a-2",
          user_id: RESORT_ADMIN_ID,
          action: "RECORD_REFUND_PROCESSED",
          entity: "payment",
          entity_id: "p-h-1",
          new_data: {},
          created_at: "2026-10-03T09:00:00Z",
        },
      ]);
      db.current.seed("booking_room_assignments", [
        {
          id: "as-1",
          booking_id: "b-h-1",
          booking_line_item_id: "li-1",
          room_id: "rm-101",
          assigned_at: "2026-10-02T14:00:00Z",
          released_at: null,
        },
        {
          id: "as-x",
          booking_id: "other",
          booking_line_item_id: "li-x",
          room_id: "rm-102",
          assigned_at: "2026-10-02T14:00:00Z",
          released_at: null,
        },
      ]);
    });

    async function history(token: string) {
      const call = mockApiCall({
        method: "GET",
        query: { ref: "GAR-H-0001" },
        headers: { authorization: `Bearer ${token}` },
      });
      const { default: historyHandler } = await import("@/pages/api/v1/bookings/[ref]/history");
      await historyHandler(call.req, call.res);
      return call;
    }

    it("merges status transitions (System for null actors) with admin actions in order", async () => {
      const call = await history(contentManagerToken);
      expect(call.status()).toBe(200);
      const { timeline } = call.body().data;
      expect(timeline.map((t: any) => t.id)).toEqual(["h-1", "h-2", "h-3", "a-1", "a-2"]);
      expect(timeline[1].actor).toBeNull();
      expect(timeline[2].actor).toEqual({ id: RESORT_ADMIN_ID, name: "resort admin user" });
      expect(timeline[3].note).toBe("ID verified");
    });

    it("returns only this booking's unit assignments", async () => {
      const call = await history(resortAdminToken);
      const { assignments } = call.body().data;
      expect(assignments.map((a: any) => a.id)).toEqual(["as-1"]);
    });

    it("is not available to guests", async () => {
      const call = await history(guestToken);
      expect(call.status()).toBe(403);
    });
  });

  describe("Revenue by room type", () => {
    it("allocates net paid amounts (after processed refunds) across line items", async () => {
      db.current.seed("booking_line_items", [
        { id: "li-a", booking_id: "b-r-1", room_type_id: "rt-std", line_total: 60000 },
        { id: "li-b", booking_id: "b-r-1", room_type_id: "rt-hut", line_total: 120000 },
        { id: "li-c", booking_id: "b-r-2", room_type_id: "rt-std", line_total: 60000 },
      ]);
      const { getRoomTypeRevenueBreakdown } =
        await import("@/services/analytics/analytics-service");
      const breakdown = await getRoomTypeRevenueBreakdown(db.current.client as any, [
        // 180,000 + 7.5% tax paid, nothing refunded
        { booking_id: "b-r-1", status: "success", amount: 193500, paid_at: "2026-10-01T10:00:00Z" },
        // 64,500 paid and fully refunded: contributes nothing
        {
          booking_id: "b-r-2",
          status: "refunded",
          amount: 64500,
          refund_amount: 64500,
          paid_at: "2026-10-01T10:00:00Z",
          refunded_at: "2026-10-02T10:00:00Z",
        },
      ]);
      const byType = Object.fromEntries(breakdown.map((r) => [r.roomTypeId, r.revenue]));
      expect(byType["rt-std"]).toBe(64500);
      expect(byType["rt-hut"]).toBe(129000);
      expect(breakdown.reduce((sum, r) => sum + r.revenue, 0)).toBe(193500);
    });
  });

  describe("Bookings list: search escaping and refund queue", () => {
    beforeEach(() => {
      db.current.seed("bookings", [
        {
          id: "b-l-1",
          reference: "GAR-L-0001",
          guest_name: "Doe, John",
          guest_email: "j@x.com",
          status: "cancelled",
          created_at: "2026-10-01T10:00:00Z",
        },
        {
          id: "b-l-2",
          reference: "GAR-L-0002",
          guest_name: "Ada Obi",
          guest_email: "a@x.com",
          status: "cancelled",
          created_at: "2026-10-02T10:00:00Z",
        },
        {
          id: "b-l-3",
          reference: "GAR-L-0003",
          guest_name: "Paystack Guest",
          guest_email: "p@x.com",
          status: "cancelled",
          created_at: "2026-10-03T10:00:00Z",
        },
      ]);
      db.current.seed("payments", [
        {
          id: "p-l-1",
          booking_id: "b-l-1",
          status: "refund_pending",
          refund_method: "bank_transfer",
        },
        { id: "p-l-2", booking_id: "b-l-2", status: "refund_failed", refund_method: "paystack" },
        { id: "p-l-3", booking_id: "b-l-3", status: "refund_pending", refund_method: "paystack" },
      ]);
    });

    async function list(query: Record<string, string>) {
      const call = mockApiCall({
        method: "GET",
        query,
        headers: { authorization: `Bearer ${resortAdminToken}` },
      });
      await bookingsListHandler(call.req, call.res);
      return call;
    }

    it("treats commas and parentheses in search as literal text", async () => {
      const comma = await list({ q: "Doe, J" });
      expect(comma.status()).toBe(200);
      expect(comma.body().data.map((b: any) => b.reference)).toEqual(["GAR-L-0001"]);

      const injection = await list({ q: "x,status.eq.cancelled)" });
      expect(injection.status()).toBe(200);
      expect(injection.body().data).toHaveLength(0);
    });

    it("refundQueue returns manual pending refunds and failed refunds only", async () => {
      const call = await list({ refundQueue: "true" });
      expect(call.status()).toBe(200);
      expect(
        call
          .body()
          .data.map((b: any) => b.reference)
          .sort()
      ).toEqual(["GAR-L-0001", "GAR-L-0002"]);
    });
  });
});
