import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/pages/api/v1/_shared/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { generateBookingPdfBuffer } from "@/services/pdf/booking-pdf";
import { buildBookingPdfInput } from "@/services/booking/booking-data";
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
  const user = await getAuthUser(req, res);
  if (!user) {
    return fail(res, "UNAUTHORIZED", "Authentication required to download booking PDF", 401);
  }

  const supabase = getSupabaseAdminClient();
  const isAdmin = ["resort_admin", "super_admin", "content_manager"].includes(user.role);

  // 2. Fetch booking
  let query = supabase.from("bookings").select("*").eq("reference", ref.toUpperCase().trim());

  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data: booking, error } = await query.maybeSingle();

  if (error || !booking) {
    return fail(res, "NOT_FOUND", "Booking reservation not found or access denied", 404);
  }

  // 3. Generate PDF buffer (real room names, settled payment method)
  try {
    const pdfBuffer = await generateBookingPdfBuffer(await buildBookingPdfInput(supabase, booking));

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
