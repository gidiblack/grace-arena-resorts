import sgMail from "@sendgrid/mail";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { renderEmailTemplate, type EmailTemplateId } from "./templates";

let isInitialized = false;

function ensureInitialized() {
  if (!isInitialized && env.SENDGRID_API_KEY) {
    sgMail.setApiKey(env.SENDGRID_API_KEY);
    isInitialized = true;
  }
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
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const { to, templateId, templateData, attachments } = options;

  try {
    ensureInitialized();

    const rendered = renderEmailTemplate(templateId, templateData);

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
    const errObj = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to send email via SendGrid", errObj, {
      to,
      templateId,
    });

    // In M1, we log and return error; in M2 (Step 2) FailedEmail table is populated for pg_cron retry
    return {
      success: false,
      error: errObj.message || "Email dispatch failed",
    };
  }
}
