import { describe, it, expect, vi, beforeEach } from "vitest";
import { FakeSupabase } from "@/test-utils/fake-supabase";

// SendGrid rejects every send the way an out-of-credits account does
const sgSend = vi.hoisted(() => vi.fn());
vi.mock("@sendgrid/mail", () => ({
  default: { setApiKey: vi.fn(), send: sgSend },
}));

const db = vi.hoisted(() => ({ current: null as unknown as FakeSupabase }));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdminClient: () => db.current.client,
  createSupabaseAuthClient: () => db.current.authClient,
}));

import { sendEmail } from "@/services/email/sendgrid";
import { sendVerificationEmail } from "@/services/auth/verification";
import { retryFailedEmails } from "@/services/email/retry";

const creditsExceeded = Object.assign(new Error("Unauthorized"), {
  code: 401,
  response: { body: { errors: [{ message: "Maximum credits exceeded" }] } },
});

describe("Regression: email failures are queued and retried (T1, T2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.current = new FakeSupabase();
    sgSend.mockReset().mockRejectedValue(creditsExceeded);
  });

  it("reports provider outages and queues the email instead of claiming success", async () => {
    const result = await sendEmail({
      to: "guest@example.com",
      templateId: "inquiry_acknowledgment",
      templateData: { name: "Ada" },
    });

    expect(result).toMatchObject({
      success: false,
      queued: true,
      providerUnavailable: true,
      error: "Maximum credits exceeded",
    });
    const [row] = db.current.rows("failed_emails");
    expect(row).toMatchObject({
      recipient: "guest@example.com",
      template_id: "inquiry_acknowledgment",
      attempts: 1,
      template_data: { name: "Ada" },
    });
    expect(row.next_attempt_at).toBeTruthy();
  });

  it("never stores single-use links: secret emails are rebuilt by a handler on retry", async () => {
    db.current.seed("users", [{ id: "u1", email: "ada@example.com", full_name: "Ada" }]);
    await sendVerificationEmail({ userId: "u1", email: "ada@example.com", fullName: "Ada" });

    const [row] = db.current.rows("failed_emails");
    expect(row.template_data).toEqual({});
    expect(JSON.stringify(row)).not.toContain("token=");
    expect(row).toMatchObject({
      retry_handler: "email_verification",
      retry_params: { userId: "u1" },
    });

    // Provider recovers: the retry job rebuilds the email with a fresh link and marks it sent
    row.next_attempt_at = new Date(Date.now() - 1000).toISOString();
    sgSend.mockReset().mockResolvedValue([{ statusCode: 202, headers: {} }]);

    const summary = await retryFailedEmails();

    expect(summary).toMatchObject({ attempted: 1, sent: 1 });
    expect(db.current.rows("failed_emails")[0].sent_at).toBeTruthy();
    const sentHtml = sgSend.mock.calls[0][0].html as string;
    expect(sentHtml).toMatch(/verify-email\?token=/);
    // The retry itself must not enqueue a duplicate row
    expect(db.current.rows("failed_emails")).toHaveLength(1);
  });

  it("backs off exponentially and stops after 3 attempts", async () => {
    await sendEmail({
      to: "a@example.com",
      templateId: "inquiry_acknowledgment",
      templateData: {},
    });
    const row = db.current.rows("failed_emails")[0];

    row.next_attempt_at = new Date(Date.now() - 1000).toISOString();
    await retryFailedEmails();
    expect(row.attempts).toBe(2);
    const delayMs = new Date(row.next_attempt_at).getTime() - Date.now();
    expect(delayMs).toBeGreaterThan(9 * 60 * 1000); // 10 minutes after the 2nd attempt

    row.next_attempt_at = new Date(Date.now() - 1000).toISOString();
    const summary = await retryFailedEmails();
    expect(summary.exhausted).toBe(1);
    expect(row.attempts).toBe(3);
    expect(row.next_attempt_at).toBeNull();

    // Exhausted rows are not picked up again
    expect((await retryFailedEmails()).attempted).toBe(0);
  });
});
