import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/pages/api/v1/_shared/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { generateBookingPdfBuffer } from "@/services/pdf/booking-pdf";
import { fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const { ref } = req.query;
  if (!ref || typeof ref !== "string") {
    return fail(res, "MISSING_REF", "Booking reference is required", 400);
  }

  // 1. Authenticate user
  const user = await getAuthUser(req);
  if (!user) {
    return fail(res, "UNAUTHORIZED", "Authentication required to download booking PDF", 401);
  }

  const supabase = getSupabaseAdminClient();
  const isAdmin = ["resort_admin", "super_admin", "content_manager"].includes(user.role);

  // 2. Fetch booking
  let query = supabase
    .from("bookings")
    .select("*")
    .eq("reference", ref.toUpperCase().trim());

  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data: booking, error } = await query.maybeSingle();

  if (error || !booking) {
    return fail(res, "NOT_FOUND", "Booking reservation not found or access denied", 404);
  }

  // 3. Fetch line items and payments
  const { data: lineItems } = await supabase
    .from("booking_line_items")
    .select("*")
    .eq("booking_id", booking.id);

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", booking.id);

  // 4. Generate PDF buffer
  try {
    const payment = payments?.find((p) => p.status === "success");

    const pdfBuffer = await generateBookingPdfBuffer({
      reference: booking.reference,
      status: booking.status.toUpperCase(),
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      guestPhone: booking.guest_phone,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      nights: booking.nights,
      rooms: (lineItems || []).map((bli) => ({
        name: "Suite",
        quantity: bli.quantity,
        unitPrice: bli.unit_price,
        lineTotal: bli.line_total,
      })),
      subtotal: booking.subtotal,
      dealDiscount: booking.deal_discount,
      tax: booking.tax,
      total: booking.total,
      createdAt: booking.created_at,
      paymentGateway: payment?.gateway ? String(payment.gateway).toUpperCase() : undefined,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="GraceArenaResorts-${booking.reference}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    logger.error("Error generating booking PDF document", { err });
    return fail(res, "PDF_GENERATION_FAILED", "Failed to generate PDF document", 500);
  }
}
