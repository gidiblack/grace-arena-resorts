import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthUser } from "@/pages/api/v1/_shared/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { generateBookingPdfBuffer } from "@/services/pdf/booking-pdf";
import { buildBookingPdfInput } from "@/services/booking/booking-data";
import { authorizeBookingAccess } from "@/services/booking/access";
import { fail } from "@/lib/http/response";
import { logger } from "@/lib/logger";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return fail(res, "METHOD_NOT_ALLOWED", "Method not allowed", 405);
  }

  const ref = String(req.query.ref || "")
    .toUpperCase()
    .trim();
  if (!ref) {
    return fail(res, "MISSING_REF", "Booking reference is required", 400);
  }

  const supabase = getSupabaseAdminClient();
  const [user, { data: booking }] = await Promise.all([
    getAuthUser(req, res),
    supabase.from("bookings").select("*").eq("reference", ref).maybeSingle(),
  ]);

  const access = booking
    ? await authorizeBookingAccess(req, booking, user ?? undefined, [
        "resort_admin",
        "super_admin",
        "content_manager",
      ])
    : null;
  if (!booking || !access) {
    return fail(res, "NOT_FOUND", "Booking reservation not found or access denied", 404);
  }

  try {
    const pdfBuffer = await generateBookingPdfBuffer(await buildBookingPdfInput(supabase, booking));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="GraceArenaResorts-${booking.reference}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "private, no-store");

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    logger.error("Error generating booking PDF document", { err });
    return fail(res, "PDF_GENERATION_FAILED", "Failed to generate PDF document", 500);
  }
}
