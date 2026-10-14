export type EmailTemplateId =
  | "email_verification"
  | "password_reset"
  | "booking_confirmation"
  | "newsletter_confirmation"
  | "inquiry_acknowledgment"
  | "room_notify_alert";

export interface EmailRenderedContent {
  subject: string;
  html: string;
  text: string;
}

export function renderEmailTemplate(
  templateId: EmailTemplateId,
  data: Record<string, unknown>
): EmailRenderedContent {
  switch (templateId) {
    case "newsletter_confirmation": {
      const confirmUrl = data.confirmUrl || "#";
      return {
        subject: "Confirm Your Newsletter Subscription — Grace Arena Resorts",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a202c;">
            <h2 style="color: #2b6cb0;">Welcome to Grace Arena Resorts</h2>
            <p>Thank you for subscribing to our newsletter. Please confirm your email address by clicking the link below:</p>
            <p style="margin: 24px 0;">
              <a href="${confirmUrl}" style="background-color: #2b6cb0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Confirm Subscription
              </a>
            </p>
            <p style="font-size: 14px; color: #718096;">If you did not request this subscription, you can safely ignore this email.</p>
          </div>
        `,
        text: `Welcome to Grace Arena Resorts. Please confirm your subscription by visiting: ${confirmUrl}`,
      };
    }

    case "inquiry_acknowledgment": {
      const name = data.name || "Guest";
      return {
        subject: "We Received Your Message — Grace Arena Resorts",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a202c;">
            <h2 style="color: #2b6cb0;">Hello ${name},</h2>
            <p>Thank you for reaching out to Grace Arena Resorts. Our hospitality team has received your message and will respond within 24 hours.</p>
            <p>If you require immediate assistance, feel free to contact our concierge via WhatsApp.</p>
            <p style="margin-top: 24px; font-size: 14px; color: #718096;">Warm regards,<br>The Grace Arena Team</p>
          </div>
        `,
        text: `Hello ${name}, thank you for contacting Grace Arena Resorts. We will get back to you shortly.`,
      };
    }

    case "room_notify_alert": {
      const roomName = data.roomName || "Your requested suite";
      return {
        subject: `Reservations Now Open for ${roomName} — Grace Arena Resorts`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a202c;">
            <h2 style="color: #2b6cb0;">${roomName} is Ready for Booking!</h2>
            <p>We are delighted to announce that construction has completed and reservations are officially open for ${roomName}.</p>
            <p style="margin: 24px 0;">
              <a href="${data.roomUrl || "#"}" style="background-color: #2b6cb0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                View Room & Reserve
              </a>
            </p>
          </div>
        `,
        text: `${roomName} is now ready for reservations! Visit our website to book.`,
      };
    }

    case "email_verification": {
      const verifyUrl = data.verifyUrl || "#";
      return {
        subject: "Verify Your Email — Grace Arena Resorts",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a202c;">
            <h2 style="color: #2b6cb0;">Verify Your Email Address</h2>
            <p>Welcome to Grace Arena Resorts! Please click the button below to verify your email address:</p>
            <p style="margin: 24px 0;">
              <a href="${verifyUrl}" style="background-color: #2b6cb0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Verify Email
              </a>
            </p>
          </div>
        `,
        text: `Verify your email at Grace Arena Resorts by visiting: ${verifyUrl}`,
      };
    }

    case "password_reset": {
      const resetUrl = data.resetUrl || "#";
      return {
        subject: "Password Reset Request — Grace Arena Resorts",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a202c;">
            <h2 style="color: #2b6cb0;">Reset Your Password</h2>
            <p>We received a request to reset your password. Click the link below to choose a new password:</p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}" style="background-color: #2b6cb0; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </p>
          </div>
        `,
        text: `Reset your Grace Arena Resorts password: ${resetUrl}`,
      };
    }

    case "booking_confirmation": {
      const ref = data.reference || "N/A";
      return {
        subject: `Booking Confirmed: ${ref} — Grace Arena Resorts`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a202c;">
            <h2 style="color: #2b6cb0;">Booking Confirmed!</h2>
            <p>Your reservation <strong>${ref}</strong> has been confirmed. Please see the attached confirmation receipt for details.</p>
          </div>
        `,
        text: `Your reservation ${ref} at Grace Arena Resorts has been confirmed.`,
      };
    }

    default:
      throw new Error(`Unsupported email template: ${templateId}`);
  }
}
