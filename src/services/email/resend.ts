import { Resend } from "resend";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import { renderEmailTemplate, type EmailTemplateId } from "./templates";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/** Templates whose data carries single-use links: never stored, regenerated on retry instead */
const SECRET_TEMPLATES = new Set<EmailTemplateId>([
  "email_verification",
  "password_reset",
  "newsletter_confirmation",
  "booking_manage_link",
]);

export interface EmailRetry {
  /** Registered handler in services/email/retry.ts that rebuilds the email (fresh links, attachments) */
  handler: string;
  params: Record<string, Json>;
}

export interface SendEmailOptions {
  to: string;
  templateId: EmailTemplateId;
  templateData: Record<string, unknown>;
  /** Optional reply-to address; falls back to RESEND_REPLY_TO if configured */
  replyTo?: string;
  attachments?: Array<{
    content: string; // base64
    filename: string;
    type: string;
    disposition?: "attachment" | "inline";
  }>;
  /** How to rebuild this email if it has to be retried later */
  retry?: EmailRetry;
  /** Set false when called by the retry job itself */
  queueOnFailure?: boolean;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** True when the failure was stored in failed_emails for a later retry */
  queued?: boolean;
  /** True for account/credential/provider outages (401/403/429/5xx), as opposed to a bad recipient */
  providerUnavailable?: boolean;
}

/**
 * Stores a failed email for the retry job. Single-use links are never persisted: emails with
 * a retry handler are rebuilt from non-secret params; secret emails without one are recorded
 * for visibility only (attempts maxed so they are not resent with stale links).
 */
async function enqueueFailedEmail(
  options: SendEmailOptions,
  subject: string,
  errorMessage: string
) {
  const isSecret = SECRET_TEMPLATES.has(options.templateId);
  const retryable = Boolean(options.retry) || !isSecret;

  try {
    const { error } = await getSupabaseAdminClient()
      .from("failed_emails")
      .insert({
        recipient: options.to,
        subject,
        template_id: options.templateId,
        template_data: isSecret || options.attachments ? {} : (options.templateData as Json),
        retry_handler: options.retry?.handler ?? null,
        retry_params: options.retry?.params ?? {},
        attempts: retryable ? 1 : 3,
        last_attempt_at: new Date().toISOString(),
        next_attempt_at: retryable ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : null,
        error: errorMessage.slice(0, 500),
      });
    return !error;
  } catch {
    return false;
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const { to, templateId, templateData, attachments, replyTo } = options;
  let subject: string = templateId;

  try {
    const rendered = renderEmailTemplate(templateId, templateData);
    subject = rendered.subject;

    const resend = getResendClient();
    const resolvedReplyTo = replyTo || env.RESEND_REPLY_TO || undefined;

    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      replyTo: resolvedReplyTo,
      attachments: attachments?.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, "base64"),
        contentType: att.type,
      })),
    });

    if (error) {
      const status = typeof error.statusCode === "number" ? error.statusCode : undefined;
      const isProviderUnavailable =
        status === 401 ||
        status === 403 ||
        status === 429 ||
        (status !== undefined && status >= 500) ||
        error.name === "rate_limit_exceeded" ||
        error.name === "invalid_api_key" ||
        error.name === "missing_api_key" ||
        error.name === "internal_server_error";

      logger.error("Failed to send email via Resend", {
        code: isProviderUnavailable ? "EMAIL_PROVIDER_UNAVAILABLE" : "EMAIL_SEND_FAILED",
        status,
        reason: error.message,
        to,
        templateId,
      });

      if (env.NODE_ENV !== "production") {
        const links = Object.entries(templateData).filter(([key]) => /url$/i.test(key));
        for (const [key, value] of links) {
          logger.warn(`[dev] Email not delivered; ${templateId}.${key}: ${String(value)}`);
        }
      }

      const queued =
        options.queueOnFailure === false
          ? false
          : await enqueueFailedEmail(options, subject, error.message);

      return {
        success: false,
        error: error.message,
        queued,
        providerUnavailable: isProviderUnavailable,
      };
    }

    logger.info("Email sent successfully via Resend", {
      to,
      templateId,
      messageId: data?.id,
    });

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      typeof err === "object" &&
      err !== null &&
      "statusCode" in err &&
      typeof (err as { statusCode: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : typeof err === "object" &&
            err !== null &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : undefined;

    const isProviderUnavailable =
      status === 401 ||
      status === 403 ||
      status === 429 ||
      (status !== undefined && status >= 500) ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate limit");

    logger.error("Failed to send email via Resend (exception)", {
      code: isProviderUnavailable ? "EMAIL_PROVIDER_UNAVAILABLE" : "EMAIL_SEND_FAILED",
      status,
      reason: message,
      to,
      templateId,
    });

    if (env.NODE_ENV !== "production") {
      const links = Object.entries(templateData).filter(([key]) => /url$/i.test(key));
      for (const [key, value] of links) {
        logger.warn(`[dev] Email not delivered; ${templateId}.${key}: ${String(value)}`);
      }
    }

    const queued =
      options.queueOnFailure === false
        ? false
        : await enqueueFailedEmail(options, subject, message);

    return { success: false, error: message, queued, providerUnavailable: isProviderUnavailable };
  }
}
