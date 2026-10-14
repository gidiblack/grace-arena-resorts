import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import BookingCard, { BookingRecord } from "../components/BookingCard";
import CancellationModal from "../components/CancellationModal";

describe("Step 11: Guest Account & Booking Management", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseBooking: BookingRecord = {
    id: "booking-uuid-1",
    reference: "GAR-CONFIRM1",
    status: "confirmed",
    check_in_date: "2026-07-10",
    check_out_date: "2026-07-12",
    nights: 2,
    adults: 2,
    children: 0,
    subtotal: 120000,
    deal_discount: 0,
    tax: 9000,
    total: 129000,
    guest_name: "Adeola Davies",
    guest_email: "adeola@example.com",
    guest_phone: "+2348098765432",
    special_requests: null,
    created_at: "2026-07-01T10:00:00.000Z",
    booking_line_items: [
      {
        id: "li-1",
        room_type_id: "elysian-fountain-standard",
        quantity: 1,
        unit_price: 60000,
        line_total: 120000,
      },
    ],
  };

  describe("BookingCard Status Badges & Action Buttons", () => {
    it("renders confirmed booking with green badge and confirmed actions", () => {
      renderWithChakra(<BookingCard booking={baseBooking} onRefresh={vi.fn()} />);

      expect(screen.getByText("GAR-CONFIRM1")).toBeInTheDocument();
      expect(screen.getByText("Confirmed")).toBeInTheDocument();
      expect(screen.getByText("Download Voucher (PDF)")).toBeInTheDocument();
      expect(screen.getByText("Resend Email")).toBeInTheDocument();
      expect(screen.getByText("Cancel Booking")).toBeInTheDocument();
      expect(screen.getByText("WhatsApp Concierge")).toBeInTheDocument();

      const pdfLink = screen.getByText("Download Voucher (PDF)").closest("a");
      expect(pdfLink).toHaveAttribute("href", "/api/v1/bookings/GAR-CONFIRM1/pdf");
    });

    it("renders pending booking with yellow badge and Complete Payment / Cancel Hold actions", () => {
      const pendingBooking: BookingRecord = {
        ...baseBooking,
        reference: "GAR-PENDING1",
        status: "pending",
      };

      renderWithChakra(<BookingCard booking={pendingBooking} onRefresh={vi.fn()} />);

      expect(screen.getByText("GAR-PENDING1")).toBeInTheDocument();
      expect(screen.getByText("Pending Payment")).toBeInTheDocument();
      expect(screen.getByText("Complete Payment")).toBeInTheDocument();
      expect(screen.getByText("Cancel Hold")).toBeInTheDocument();
    });

    it("renders cancelled booking with red badge and refund timeline information", () => {
      const cancelledBooking: BookingRecord = {
        ...baseBooking,
        reference: "GAR-CANCEL1",
        status: "cancelled",
        payments: [
          {
            id: "pay-1",
            amount: 129000,
            currency: "NGN",
            gateway: "paystack",
            status: "refunded",
            refund_amount: 129000,
          },
        ],
      };

      renderWithChakra(<BookingCard booking={cancelledBooking} onRefresh={vi.fn()} />);

      expect(screen.getByText("GAR-CANCEL1")).toBeInTheDocument();
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
      expect(screen.getByText(/3–5 business days timeline/i)).toBeInTheDocument();
    });

    it("renders checked-out booking with Download Receipt button", () => {
      const checkedOutBooking: BookingRecord = {
        ...baseBooking,
        reference: "GAR-PAST1",
        status: "checked_out",
      };

      renderWithChakra(<BookingCard booking={checkedOutBooking} onRefresh={vi.fn()} />);

      expect(screen.getByText("GAR-PAST1")).toBeInTheDocument();
      expect(screen.getByText("Checked Out")).toBeInTheDocument();
      expect(screen.getByText("Download Receipt (PDF)")).toBeInTheDocument();
    });
  });

  describe("CancellationModal Preview & Confirmation", () => {
    it("fetches refund preview and displays 100% full refund policy", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            bookingReference: "GAR-CONFIRM1",
            checkInDate: "2026-07-10",
            hoursUntilCheckIn: 120,
            policyTier: "full_refund",
            refundPercentage: 100,
            bookingTotal: 129000,
            estimatedRefundAmount: 129000,
            reason: "Full refund eligible (>= 72 hours before 14:00 check-in)",
          },
        }),
      });
      global.fetch = mockFetch;

      renderWithChakra(
        <CancellationModal
          isOpen={true}
          onClose={vi.fn()}
          bookingReference="GAR-CONFIRM1"
          onSuccess={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/100% Refund/i)).toBeInTheDocument();
        expect(screen.getByText("₦129,000")).toBeInTheDocument();
        expect(screen.getByText(/Full refund eligible/i)).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/v1/bookings/GAR-CONFIRM1/cancel");
    });

    it("confirms cancellation and triggers callback", async () => {
      const onSuccessMock = vi.fn();
      const onCloseMock = vi.fn();

      const mockFetch = vi.fn().mockImplementation((url, opts) => {
        if (opts?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                reference: "GAR-CONFIRM1",
                status: "cancelled",
                refundAmount: 129000,
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              bookingReference: "GAR-CONFIRM1",
              policyTier: "full_refund",
              refundPercentage: 100,
              estimatedRefundAmount: 129000,
              reason: "Full refund eligible",
            },
          }),
        });
      });

      global.fetch = mockFetch;

      renderWithChakra(
        <CancellationModal
          isOpen={true}
          onClose={onCloseMock}
          bookingReference="GAR-CONFIRM1"
          onSuccess={onSuccessMock}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Confirm Cancellation")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Confirm Cancellation"));

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalled();
        expect(onCloseMock).toHaveBeenCalled();
      });
    });
  });
});
