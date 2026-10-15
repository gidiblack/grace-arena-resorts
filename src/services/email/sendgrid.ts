import sgMail from "@sendgrid/mail";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";
import { renderEmailTemplate, type EmailTemplateId } from "./templates";

let isInitialized = false;

function ensureInitialized() {
  if (!isInitialized && env.SENDGRID_API_KEY) {
    sgMail.setApiKey(env.SENDGRID_API_KEY);
    isInitialized = true;
  }
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

interface SendGridError {
  code?: number;
  message?: string;
  response?: { body?: { errors?: Array<{ message?: string }> } };
}

function describeError(error: unknown): { message: string; status?: number } {
  const err = error as SendGridError;
  const providerMessage = err?.response?.body?.errors?.[0]?.message;
  return {
    message: providerMessage || err?.message || String(error),
    status: typeof err?.code === "number" ? err.code : undefined,
  };
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
  const { to, templateId, templateData, attachments } = options;
  let subject: string = templateId;

  try {
    ensureInitialized();

    const rendered = renderEmailTemplate(templateId, templateData);
    subject = rendered.subject;

    const msg = {
      to,
      from: env.SENDGRID_FROM_EMAIL,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: attachments?.map((att) => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: att.disposition || "attachment",
      })),
    };

    const [response] = await sgMail.send(msg);

    logger.info("Email sent successfully", {
      to,
      templateId,
      statusCode: response.statusCode,
    });

    return {
      success: true,
      messageId: response.headers["x-message-id"] as string | undefined,
    };
  } catch (error: unknown) {
    const { message, status } = describeError(error);
    const providerUnavailable =
      status !== undefined && (status === 401 || status === 403 || status === 429 || status >= 500);

    logger.error("Failed to send email via SendGrid", {
      code: providerUnavailable ? "EMAIL_PROVIDER_UNAVAILABLE" : "EMAIL_SEND_FAILED",
      status,
      reason: message,
      to,
      templateId,
    });

    // Development aid: surface action links so flows can be tested without a working provider
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

    return { success: false, error: message, queued, providerUnavailable };
  }
}
