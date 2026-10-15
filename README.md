# Grace Arena Resorts (GAR)

A sanctuary of peace, luxury, and Christian hospitality located in Abuja, Nigeria.

## Architecture & Tech Stack

- **Framework:** Next.js 16 (Pages Router)
- **Language:** TypeScript (Strict mode)
- **UI & Styling:** Chakra UI v3 & Tailwind/CSS modules
- **State & Form Validation:** React Hook Form + Zod
- **Backend / Database:** Supabase (PostgreSQL, RLS, Storage, Auth)
- **Email Service:** SendGrid
- **Testing:** Vitest, Testing Library, Playwright

## Development Setup

### 1. Prerequisites

- Node.js 20+ (tested on Node 24)
- npm 10+

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

- `NEXT_PUBLIC_APP_URL`: App URL (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: Official WhatsApp contact number without `+` (e.g. `2348123456789`)
- `SENDGRID_API_KEY`: SendGrid API key
- `SENDGRID_FROM_EMAIL`: Verified sender email address

Also required for the booking engine (M2):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`, and `PAYSTACK_WEBHOOK_SECRET` (must equal the Paystack secret key: Paystack signs webhooks with it)

Optional:

- `CRON_SECRET` (16+ characters): enables the failed-email retry job (see below)
- `VERCEL_KV_REST_API_URL` / `VERCEL_KV_REST_API_TOKEN`: shared rate limiting across serverless instances
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: Google Analytics 4, loaded only after analytics consent
- `NEXT_PUBLIC_USE_MOCK_DATA=true`: serve bundled mock data without Supabase (UI previews/tests only)

> **Restart `npm run dev` after editing `.env.local`.** Settings are read once at startup; Next.js
> reloads the file but already-loaded modules (env parser, SendGrid client) keep the old values.

> **Testing without email:** outside production, when an email cannot be sent (e.g. the SendGrid
> account is out of credits), the action link (verify, reset, newsletter, manage booking) is printed
> to the dev server console as `[dev] Email not delivered; …`.

#### Failed email retries

Failed sends are queued in `failed_emails` and retried with backoff (3 attempts in total) by
`/api/v1/internal/jobs/retry-failed-emails`, authorized with `Authorization: Bearer $CRON_SECRET`.
Schedule it every 10 minutes with either:

- **Vercel Cron** (Pro plan for sub-daily schedules): add to `vercel.json`:
  `{"crons":[{"path":"/api/v1/internal/jobs/retry-failed-emails","schedule":"*/10 * * * *"}]}` (Vercel sends `CRON_SECRET` automatically), or
- **Supabase pg_cron + pg_net** (SQL editor, role `postgres`):

  ```sql
  SELECT cron.schedule('retry-failed-emails', '*/10 * * * *', $$
    SELECT net.http_post(
      url := 'https://<your-domain>/api/v1/internal/jobs/retry-failed-emails',
      headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
    );
  $$);
  ```

### 3. Available Commands

```bash
# Run local development server
npm run dev

# Run TypeScript type check
npm run typecheck

# Run unit and integration tests with coverage
npm run test

# Run tests in watch mode
npm run test:watch

# Format code with Prettier
npm run format

# Verify code formatting
npm run format:check

# Run full CI validation suite
npm run ci
```

## Delivery Milestones

- **Milestone 1:** Marketing Site (Foundations, Global Shell, Public Pages, Rooms Catalog)
- **Milestone 2:** Booking Engine & Accounts (Supabase Schema, Auth, Payment Integration, Booking Wizard)
- **Milestone 3:** Admin & Operations (Admin Portal, RBAC, Background Jobs, Observability)
