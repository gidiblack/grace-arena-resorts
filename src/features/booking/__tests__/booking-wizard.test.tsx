import React from "react";
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithChakra } from "@/test-utils";
import { step1DatesGuestsSchema, step3GuestSchema } from "../schemas";
import BookingConfirmationView from "../components/BookingConfirmationView";

describe("Step 10: Booking Wizard & Confirmation Experience", () => {
  describe("Step 1: Dates & Guests Validation Schema", () => {
    it("accepts valid check-in date and stay duration", () => {
      const valid = step1DatesGuestsSchema.safeParse({
        checkInDate: "2026-06-15",
        nights: 3,
        adults: 2,
        children: 1,
      });

      expect(valid.success).toBe(true);
    });

    it("rejects stays longer than 30 nights or less than 1 night", () => {
      const tooShort = step1DatesGuestsSchema.safeParse({
        checkInDate: "2026-06-15",
        nights: 0,
        adults: 2,
      });
      expect(tooShort.success).toBe(false);

      const tooLong = step1DatesGuestsSchema.safeParse({
        checkInDate: "2026-06-15",
        nights: 31,
        adults: 2,
      });
      expect(tooLong.success).toBe(false);
    });

    it("enforces at least 1 adult guest", () => {
      const noAdults = step1DatesGuestsSchema.safeParse({
        checkInDate: "2026-06-15",
        nights: 2,
        adults: 0,
      });
      expect(noAdults.success).toBe(false);
    });
  });

  describe("Step 3: Nigerian Phone Number Validation", () => {
    it("accepts valid +234 Nigerian mobile numbers", () => {
      const valid = step3GuestSchema.safeParse({
        fullName: "Oluwaseun Bakare",
        email: "seun@example.com",
        phone: "+2348012345678",
        specialRequests: "Quiet top floor room",
      });

      expect(valid.success).toBe(true);
    });

    it("rejects non-Nigerian formatted numbers or local 080 prefixes", () => {
      const localPrefix = step3GuestSchema.safeParse({
        fullName: "Oluwaseun Bakare",
        email: "seun@example.com",
        phone: "08012345678",
      });
      expect(localPrefix.success).toBe(false);

      const tooShort = step3GuestSchema.safeParse({
        fullName: "Oluwaseun Bakare",
        email: "seun@example.com",
        phone: "+23480123456",
      });
      expect(tooShort.success).toBe(false);

      const foreignCountry = step3GuestSchema.safeParse({
        fullName: "Oluwaseun Bakare",
        email: "seun@example.com",
        phone: "+14155552671",
      });
      expect(foreignCountry.success).toBe(false);
    });

    it("rejects special requests exceeding 500 characters", () => {
      const longText = "A".repeat(501);
      const invalid = step3GuestSchema.safeParse({
        fullName: "Samuel Ade",
        email: "samuel@example.com",
        phone: "+2348012345678",
        specialRequests: longText,
      });

      expect(invalid.success).toBe(false);
    });
  });

  describe("BookingConfirmationView Component", () => {
    it("renders booking reference, PDF download link, and WhatsApp CTA", () => {
      renderWithChakra(
        <BookingConfirmationView
          reference="GAR-TEST999"
          guestName="Samuel Adeyemi"
          guestEmail="samuel@example.com"
          checkInDate="2026-06-15"
          checkOutDate="2026-06-18"
          nights={3}
          total={225750}
          status="confirmed"
          isSignedIn
        />
      );

      expect(screen.getByText("GAR-TEST999")).toBeInTheDocument();
      expect(screen.getByText(/Thank You, Samuel Adeyemi!/i)).toBeInTheDocument();
      expect(screen.getByText("Download Voucher (PDF)")).toBeInTheDocument();
      expect(screen.getByText("Contact on WhatsApp")).toBeInTheDocument();
      expect(screen.getByText("View All My Bookings →")).toBeInTheDocument();

      const pdfLink = screen.getByText("Download Voucher (PDF)").closest("a");
      expect(pdfLink).toHaveAttribute("href", "/api/v1/bookings/GAR-TEST999/pdf");
    });

    it("shows a guest the private manage link and an account offer instead of 'My Bookings'", () => {
      renderWithChakra(
        <BookingConfirmationView
          reference="GAR-GUEST001"
          guestName="Ada Obi"
          guestEmail="ada@example.com"
          checkInDate="2026-06-15"
          checkOutDate="2026-06-18"
          nights={3}
          total={100000}
          manageUrl="http://localhost:3000/manage-booking/GAR-GUEST001?t=secret-token"
        />
      );

      const manageLink = screen.getByText("Open Manage Booking").closest("a");
      expect(manageLink).toHaveAttribute(
        "href",
        "http://localhost:3000/manage-booking/GAR-GUEST001?t=secret-token"
      );
      const register = screen.getByText("Create an Account").closest("a");
      expect(register?.getAttribute("href")).toContain("email=ada%40example.com");
      expect(screen.queryByText("View All My Bookings →")).not.toBeInTheDocument();
    });

    it("handles resend email trigger", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchMock;

      renderWithChakra(
        <BookingConfirmationView
          reference="GAR-TEST999"
          guestName="Samuel Adeyemi"
          guestEmail="samuel@example.com"
          checkInDate="2026-06-15"
          checkOutDate="2026-06-18"
          nights={3}
          total={225750}
        />
      );

      const resendBtn = screen.getByText("Resend Email");
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/v1/bookings/GAR-TEST999/confirmation", {
          method: "POST",
        });
      });
    });
  });
});
