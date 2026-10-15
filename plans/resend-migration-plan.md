# Resend Migration Plan: Replacing SendGrid

This document outlines the step-by-step technical plan to transition **Grace Arena Resorts** from **SendGrid** to **Resend**.

---

## 1. Executive Summary & Audit

Due to exhausted SendGrid credits, outbound email delivery is currently failing and accumulating in the `failed_emails` retry queue.

This plan details the migration to Resend using provider-explicit environment variables (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`), incorporating Resend's testing address (`onboarding@resend.dev`) during the initial phase, and adding explicit `reply_to` support so that customer replies reach the resort's operational inbox.

```mermaid
flowchart LR
    subgraph Current Architecture
        A[API Routes & Services] -->|import| B[src/services/email/sendgrid.ts]
        B -->|SDK| C[@sendgrid/mail]
        B -->|Failure| D[(failed_emails)]
    end

    subgraph Proposed Architecture
        E[API Routes & Services] -->|import| F[src/services/email/index.ts]
        F -->|Client| G[src/services/email/resend.ts]
        G -->|SDK with reply_to| H[resend]
        G -->|Failure| D
    end
```

### Impacted Areas in Codebase

| Component           | File Path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Current SendGrid Usage                              |
| :------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| **Dependencies**    | [`package.json`](../package.json)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `@sendgrid/mail`                                    |
| **Config / Schema** | [`src/config/env.ts`](../src/config/env.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`           |
| **Env Files**       | [`.env.example`](../.env.example), `.env.local`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | SendGrid environment variables                      |
| **Service Layer**   | [`src/services/email/sendgrid.ts`](../src/services/email/sendgrid.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `sgMail.send()`, error handling, retry enqueueing   |
| **Retry Worker**    | [`src/services/email/retry.ts`](../src/services/email/retry.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Imports `sendEmail` & types                         |
| **Staff Alerts**    | [`src/services/email/staff-alert.ts`](../src/services/email/staff-alert.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Imports `sendEmail`, uses `env.SENDGRID_FROM_EMAIL` |
| **Auth & Bookings** | [`src/services/auth/verification.ts`](../src/services/auth/verification.ts), [`src/services/booking/notifications.ts`](../src/services/booking/notifications.ts), [`src/services/newsletter/confirmation.ts`](../src/services/newsletter/confirmation.ts), [`src/services/payments/settlement.ts`](../src/services/payments/settlement.ts)                                                                                                                                                                                           | Imports `sendEmail`                                 |
| **API Endpoints**   | [`src/pages/api/v1/contact/index.ts`](../src/pages/api/v1/contact/index.ts), [`src/pages/api/v1/events/inquiries.ts`](../src/pages/api/v1/events/inquiries.ts), [`src/pages/api/v1/auth/forgot-password.ts`](../src/pages/api/v1/auth/forgot-password.ts), [`src/pages/api/v1/bookings/[ref]/cancel.ts`](../src/pages/api/v1/bookings/[ref]/cancel.ts), [`src/pages/api/v1/bookings/manage-link.ts`](../src/pages/api/v1/bookings/manage-link.ts), [`src/pages/api/v1/payments/webhook.ts`](../src/pages/api/v1/payments/webhook.ts) | Imports `sendEmail`                                 |
| **Test Mocks**      | [`vitest.setup.ts`](../vitest.setup.ts), [`src/__tests__/regressions/email-reliability.test.ts`](../src/__tests__/regressions/email-reliability.test.ts), [`src/config/__tests__/env.test.ts`](../src/config/__tests__/env.test.ts)                                                                                                                                                                                                                                                                                                  | `@sendgrid/mail` mock & env variables               |
| **Supabase Config** | [`supabase/config.toml`](../supabase/config.toml)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Commented SMTP settings for SendGrid                |

---

## 2. Phase-by-Phase Execution Plan

### Phase 1: Environment Variables & Configuration

Use provider-explicit environment variables, initial testing sender, and optional reply-to configuration.

1. **Schema Update in `src/config/env.ts`**:
   ```typescript
   // Resend Email Service
   RESEND_API_KEY: z.string().min(1),
   RESEND_FROM_EMAIL: z.string().email().default("onboarding@resend.dev"),
   RESEND_REPLY_TO: blankAsUnset(z.string().email()),
   ```
2. **Environment Files Update**:
   - `.env.example`:
     ```bash
     # Resend Email Service
     RESEND_API_KEY=re_your_resend_api_key_here
     # Use onboarding@resend.dev during development before custom domain DNS verification
     RESEND_FROM_EMAIL=onboarding@resend.dev
     # Inbound reply destination (e.g. operational mailbox)
     RESEND_REPLY_TO=reservations@gracearenaresorts.com
     ```
   - Update developer `.env.local` and deployment environment variables.

---

### Phase 2: Dependency Changes

Replace the SendGrid package with the official Resend SDK:

```bash
npm uninstall @sendgrid/mail
npm install resend
```

---

### Phase 3: Email Service Layer (`src/services/email/resend.ts` & `src/services/email/index.ts`)

1. **Option Interface Enhancements**:
   Extend `SendEmailOptions` to support custom per-email `replyTo`:

   ```typescript
   export interface SendEmailOptions {
     to: string;
     templateId: EmailTemplateId;
     templateData: Record<string, unknown>;
     replyTo?: string; // Optional per-email reply-to override
     attachments?: Array<{
       content: string; // base64
       filename: string;
       type: string;
       disposition?: "attachment" | "inline";
     }>;
     retry?: EmailRetry;
     queueOnFailure?: boolean;
   }
   ```

2. **Resend API Integration**:
   - Initialize client: `const resend = new Resend(env.RESEND_API_KEY);`
   - Map payload:
     ```typescript
     const { data, error } = await resend.emails.send({
       from: env.RESEND_FROM_EMAIL,
       to: options.to,
       reply_to: options.replyTo || env.RESEND_REPLY_TO || undefined,
       subject: rendered.subject,
       text: rendered.text,
       html: rendered.html,
       attachments: options.attachments?.map((att) => ({
         filename: att.filename,
         content: Buffer.from(att.content, "base64"),
       })),
     });
     ```

3. **Status & Error Handling**:
   - Resend returns `{ data, error }` instead of throwing on HTTP errors.
   - Map quota / authentication / rate limit issues (`statusCode === 401 || statusCode === 403 || statusCode === 429 || statusCode >= 500`) to `providerUnavailable: true`.
   - Preserve `enqueueFailedEmail` on failure so no messages are lost.
   - Preserve dev logger printing action links for local manual flows.

4. **Service Clean Architecture**:
   - Create `src/services/email/index.ts` exporting `sendEmail`, `SendEmailOptions`, `EmailSendResult`, and `EmailRetry`.
   - Keep a deprecated forwarding re-export in `src/services/email/sendgrid.ts` during transitional testing.

---

### Phase 4: Consumer Updates

Update imports across the 12 service and API route files:

- Change `import { sendEmail } from "@/services/email/sendgrid"` to `import { sendEmail } from "@/services/email"`.
- Update `src/services/email/staff-alert.ts` to use `env.RESEND_REPLY_TO || env.RESEND_FROM_EMAIL`.

---

### Phase 5: Test Suite Modernization

1. **`vitest.setup.ts`**:
   - Define `process.env.RESEND_API_KEY = "re_mock_key_for_testing"`.
   - Define `process.env.RESEND_FROM_EMAIL = "onboarding@resend.dev"`.
   - Define `process.env.RESEND_REPLY_TO = "reservations@gracearenaresorts.com"`.
2. **`src/config/__tests__/env.test.ts`**:
   - Update assertions for `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
3. **`src/__tests__/regressions/email-reliability.test.ts`**:
   - Replace `@sendgrid/mail` mock with a mock of `resend`:
     ```typescript
     const resendSend = vi.hoisted(() => vi.fn());
     vi.mock("resend", () => ({
       Resend: vi.fn().mockImplementation(() => ({
         emails: { send: resendSend },
       })),
     }));
     ```
   - Test out-of-quota error handling, queueing in `failed_emails`, and exponential backoff retry execution.
4. **API and Flow Tests**:
   - Update mocks in `src/__tests__/api/api-endpoints.test.ts`, `src/__tests__/regressions/auth-flow.test.ts`, etc.

---

### Phase 6: Post-Migration Queue Draining & Verification

1. **Drain SendGrid Backlog**:
   - Trigger the internal retry job:
     ```bash
     curl -X POST http://localhost:3000/api/v1/internal/jobs/retry-failed-emails \
       -H "Authorization: Bearer <CRON_SECRET>"
     ```
   - Verify that all rows in `failed_emails` previously blocked by SendGrid credits are sent successfully through Resend.
2. **Verification Scenarios**:
   - Contact form inquiry (check delivery and `reply_to` header).
   - Event inquiry acknowledgment.
   - Newsletter subscription double opt-in.
   - Booking confirmation with PDF attachment.

---

## 3. Checklist for Implementation

- [ ] Add `plans/resend-migration-plan.md` to repository
- [ ] `npm uninstall @sendgrid/mail && npm install resend`
- [ ] Update `src/config/env.ts` with `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`
- [ ] Update `.env.example`
- [ ] Create `src/services/email/resend.ts` with `reply_to` and Buffer attachments support
- [ ] Create `src/services/email/index.ts` and compatibility alias in `src/services/email/sendgrid.ts`
- [ ] Update consumers across `src/pages/api/v1/**` and `src/services/**`
- [ ] Update `vitest.setup.ts`, `env.test.ts`, and `email-reliability.test.ts`
- [ ] Run full test suite (`npm test`) and typecheck (`npm run typecheck`)
- [ ] Drain SendGrid backlog via `/api/v1/internal/jobs/retry-failed-emails`
