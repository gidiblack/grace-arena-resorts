import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { env } from "@/config/env";
import { sendEmail } from "./sendgrid";
import { logger } from "@/lib/logger";

/**
 * Notifies the resort's contact inbox (system setting `contact_email`) about a new public
 * submission. Never throws: the submission is already persisted.
 */
export async function notifyStaffOfSubmission(details: {
  kind: "contact" | "event inquiry";
  name: string;
  email: string;
  phone?: string | null;
  subject?: string;
  details: string;
}) {
  try {
    const { data } = await getSupabaseAdminClient()
      .from("system_settings")
      .select("value")
      .eq("key", "contact_email")
      .maybeSingle();

    await sendEmail({
      to: data?.value || env.SENDGRID_FROM_EMAIL,
      templateId: "staff_submission_alert",
      templateData: details,
    });
  } catch (error) {
    logger.error("Failed to notify staff of submission", {
      kind: details.kind,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
