# Grace Arena Resorts SRS v1.2 Implementation Runbook

## Title

Grace Arena Resorts SRS v1.2 Full-Stack Implementation Runbook

## Goal

Implement the authoritative requirements in `docs/GAR-SRS.md` based on `plans/gar-srs-implementation/plan-v1.2-corrected.md` across **three shippable delivery milestones** and commit-sized, testable steps for Next.js 16 Pages Router and TypeScript. This runbook provides deterministic execution steps, concrete CLI commands, explicit file paths, and hard verification gates.

## Delivery Branches & Milestones

- `feature/gar-m1-marketing-site` — **Milestone 1: Marketing Site** (Steps 1, 5, 6, 7)
- `feature/gar-m2-booking-engine` — **Milestone 2: Booking Engine** (Steps 2, 3, 4, 8, 9, 10, 11)
- `feature/gar-m3-admin-ops` — **Milestone 3: Admin & Operations** (Steps 12A, 12B, 13, 14)
- `feature/gar-admin-crud-phase-2` — **Follow-up PR** (Step 15: Admin CRUD Breadth)

Each step is developed with its own commit and verification gate, merging to `main` via PRs per milestone or per step. Early steps not exposing user-facing features merge directly; incomplete user journeys use feature flags or unlinked routes until milestone completion.

---

## Delivery Milestones Overview

### Milestone 1: Marketing Site (Target: 4–6 weeks · 16–24 dev-days) — **COMPLETED**

**Delivers:** Public pages with content, room browsing, WhatsApp CTAs. No booking yet.

| Step   | Scope                                                                                              | Estimated Effort   | Status        |
| ------ | -------------------------------------------------------------------------------------------------- | ------------------ | ------------- |
| Step 1 | Foundation, env contract, shared libs, i18n, email, currency                                       | 2–3 days           | [x] Done      |
| Step 5 | Global shell, consent, accessibility, page transitions                                             | 3–4 days           | [x] Done      |
| Step 6 | Public content pages (Home, About, Facilities, Restaurants, Gems, Events, Deals, Contact, Privacy) | 8–12 days          | [x] Done      |
| Step 7 | Rooms catalog, Under Construction, Notify Me (read-only)                                           | 3–5 days           | [x] Done      |
|        | **M1 subtotal**                                                                                    | **16–24 dev-days** | **Completed** |

**Exit Criteria:**

- [x] All public pages render with real content and media
- [x] Room browsing works with resort toggle and tier filtering
- [x] WhatsApp CTAs functional across all pages
- [x] Cookie consent (NDPR), accessibility baseline, and SEO foundations in place
- [x] Deployed to production domain via Vercel (Ready for deployment)

### Milestone 2: Booking Engine (Target: 6–10 weeks after M1 · 31–42 dev-days) — **COMPLETED**

**Delivers:** Full guest booking flow with payment, accounts, and room management.

| Step    | Scope                                                                           | Estimated Effort   | Status        |
| ------- | ------------------------------------------------------------------------------- | ------------------ | ------------- |
| Step 2  | Supabase schema, migrations, seeds, RLS, storage, pg_cron                       | 3–5 days           | [x] Done      |
| Step 3  | API middleware stack, auth context, security                                    | 2–3 days           | [x] Done      |
| Step 4  | Auth pages and endpoints (register, login, verify, reset, change password)      | 4–5 days           | [x] Done      |
| Step 8  | Booking engine backend (availability, pricing, lifecycle, admin booking API)    | 8–10 days          | [x] Done      |
| Step 9  | Payment integration, Paystack webhook security, refunds, downtime fallback      | 4–6 days           | [x] Done      |
| Step 10 | Booking wizard frontend (4-step, responsive summary, confirmation)              | 6–8 days           | [x] Done      |
| Step 11 | Guest account and booking management (bookings list, cancel, receipts, profile) | 4–5 days           | [x] Done      |
|         | **M2 subtotal**                                                                 | **31–42 dev-days** | **Completed** |

**Exit Criteria:**

- [x] Guests can register, log in, browse rooms, and complete a booking with Paystack payment
- [x] Booking confirmation PDF generated and emailed
- [x] Guest account shows booking history with cancellation and refund flows
- [x] All auth flows working (register, verify, login, reset, change password)
- [x] Payment webhook security verified in Paystack sandbox

### Milestone 3: Admin & Operations (Target: 4–6 weeks after M2 · 19–25 dev-days)

**Delivers:** Admin bookings operations (including offline payments and manual refunds), room status, dashboard, operational tooling, quality gates.

> **M3 audit (2026-10-16):** Step 12 re-scoped and split into 12A/12B after an audit against SRS v1.3 and the shipped M2 code; see `plan-v1.2-corrected.md` v1.4.

| Step     | Scope                                                                                                                     | Estimated Effort   |
| -------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Step 12A | Admin shell, RBAC guards, bookings operations (check-in units, offline payments, manual refunds), room status + Notify-Me | 7–9 days           |
| Step 12B | Admin dashboard and analytics                                                                                             | 4–5 days           |
| Step 13  | Observability, SEO finalization, background job scheduling, auth/reliability hardening                                    | 4–5 days           |
| Step 14  | Quality gate, CI/CD, load test, documentation                                                                             | 4–6 days           |
|          | **M3 subtotal**                                                                                                           | **19–25 dev-days** |

**Exit Criteria:**

- Admin access enforced per the SRS 4.1 role matrix (Content Manager: read-only bookings, no financial analytics); admin accounts bootstrapped
- Admin bookings management: filters/search, detail with full status history, check-in with unit assignment, check-out, no-show, admin-initiated (walk-in / WhatsApp concierge) bookings
- Offline payments (bank transfer / cash / POS) recorded by admins; admin cancellation with the policy refund calculator; Paystack refunds automated, manual refunds tracked Pending → Processed → Failed
- Room unit status and room-type status management; Notify-Me emails sent on `under_construction` → `available`
- Admin dashboard with SRS 3.14.2 KPIs, bookings/revenue chart, occupancy heatmap, activity feed
- Background jobs scheduled and verified (pending booking expiry, failed email retry, deal deactivation, access-token purge)
- Sentry integrated with PII/token scrubbing; uptime monitoring live; backups and point-in-time recovery confirmed
- CI pipeline passing (lint, format, typecheck, coverage ≥ 70%, build, e2e smoke, axe, Lighthouse CI)
- Core Web Vitals targets met (LCP, CLS, TTFB in the lab; INP from field data); 500-user load test run with API p95 < 300 ms
- Manual accessibility audit completed

### Total Estimated Effort: 66–91 dev-days

---

## Pre-Flight Checklist (Complete Before Step 1)

| Service                 | Action Needed                                                                               | Owner            | Due By           |
| ----------------------- | ------------------------------------------------------------------------------------------- | ---------------- | ---------------- |
| **Supabase**            | Create project, get anon key + service role key, enable pg_cron + pgcrypto extensions       | Engineering      | Before Step 1    |
| **Vercel**              | Connect repository, configure environment variables, enable preview deployments             | Engineering      | Before Step 1    |
| **SendGrid**            | Create account, verify sender domain and email, get API key                                 | Engineering      | Before Step 4    |
| **Google reCAPTCHA v3** | Register site, get site key + secret key                                                    | Engineering      | Before Step 3    |
| **Google Maps**         | Create API key, enable Maps Embed API + Places API                                          | Engineering      | Before Step 6    |
| **Paystack**            | Apply for merchant account, obtain test public + secret keys                                | Business/Finance | Before Step 9    |
| **Google Analytics 4**  | Create property, get measurement ID, set up GTM container                                   | Marketing        | Before Step 5    |
| **Sentry**              | Create project, get DSN                                                                     | Engineering      | Before Step 13   |
| **Domain + SSL**        | Purchase domain, point DNS to Vercel, provision SSL                                         | Business/IT      | Before M1 launch |
| **Supabase Evaluation** | Confirm RLS learning curve manageable, test connection pooling, verify edge function limits | Engineering      | Before Step 2    |

---

## Content Workstream & Seeding Strategy (Parallel to Code)

### Content Deliverables (Required for M1 Launch)

- [ ] Professional resort photography — rooms, facilities, campuses, dining, exterior (Marketing / Photography team)
- [ ] Hero video production — 30–60 second resort overview, muted autoplay (Marketing / Video team)
- [ ] Copy for all 10 public pages — brand-approved, faith-aligned (Product / Copywriter)
- [ ] Menu data for all 4 restaurants with names, descriptions, prices in NGN (Resort Operations)
- [ ] Facility descriptions, operating hours, and location-within-resort info (Resort Operations)
- [ ] "Our Story" / About content — founding story, mission, vision, values (Product / Founders)
- [ ] Privacy Policy legal text — NDPR/NDPA compliant (Compliance Owner / Legal)
- [ ] Social media handles and links (Marketing)
- [ ] Contact information — phone, email, physical address, hours (Resort Operations)
- [ ] Google Maps coordinates and branded map pin (Engineering / Marketing)

### Content Seeding Strategy ("Data Days")

- **Before M1 Launch (Data Day 1):** Room inventory verified, media uploaded to `media-public`, menus entered, facility hours confirmed, system settings configured.
- **Before M2 Launch (Data Day 2):** Seasonal pricing entered, active deals created, tax rate confirmed (7.5%), check-in/out times verified (14:00/11:00), pending booking expiry set (30 mins), admin staff accounts created, Paystack live keys configured, SendGrid production sender verified.
- **Before M3 Launch (Data Day 3):** Sentry DSN configured, GA4 measurement ID verified, alerting thresholds set, background job schedules confirmed (`CRON_SECRET` set; `retry-failed-emails` present in `cron.job`), uptime monitor and backups/PITR confirmed, offline-payment SOP agreed (resort bank account for WhatsApp concierge, who may record payments/refunds, daily reconciliation), admin accounts created via `scripts/create-admin-user.ts`.

---

## Staging & Preview Strategy

- **Every PR** generates an automatic Vercel preview deployment URL for stakeholder review.
- **`main` branch** auto-deploys to a staging URL (`staging.gracearenaresorts.com` or Vercel default).
- **Production domain** is pointed to `main` only when a milestone's exit criteria are fully satisfied.

---

## Prerequisites & Tooling

- [x] Node.js 20.x installed
- [x] npm 10+ installed
- [x] Supabase CLI available through npx
- [x] GitHub Actions enabled for repository
- [x] Target branch checked out (`feature/gar-m1-marketing-site` for Milestone 1)

### Prerequisite Commands

```powershell
node -v
npm -v
npm ci
npx supabase --version
```

---

## 1. Repository Foundation, Standards, and Environment Contract — [COMPLETED]

**Milestone:** M1 (Completed) · **Estimated Effort:** 2–3 days · **Branch:** `feature/gar-m1-marketing-site` · **Status:** Merged to `develop`

### Step Checklist

- [x] Install all runtime/test/build dependencies required by the corrected plan
- [x] Create typed environment parser with strict startup validation
- [x] Create shared logger with redaction for sensitive fields
- [x] Create API error model and response envelope helpers
- [x] Add i18n infrastructure (`src/lib/i18n/index.ts`, `src/lib/i18n/en.json`)
- [x] Add NGN currency formatter (`src/lib/formatters/currency.ts`) per SRS 5.6
- [x] Add SendGrid service + template renderer + failed-email queue adapter (`src/services/email/sendgrid.ts`, `src/services/email/templates.ts`)
- [x] Add Prettier config and format check script
- [x] Update README with environment contract and commands

### Explicit File Paths

- [x] package.json
- [x] .env.example
- [x] .prettierrc
- [x] .prettierignore
- [x] src/config/env.ts
- [x] src/lib/logger.ts
- [x] src/lib/errors.ts
- [x] src/lib/http/response.ts
- [x] src/lib/http/validation.ts
- [x] src/types/api.ts
- [x] src/lib/i18n/index.ts
- [x] src/lib/i18n/en.json
- [x] src/lib/formatters/currency.ts
- [x] src/services/email/sendgrid.ts
- [x] src/services/email/templates.ts
- [x] README.md

### Commands

```powershell
npm install @supabase/supabase-js @supabase/ssr react-hook-form zod @hookform/resolvers dayjs @sendgrid/mail @react-pdf/renderer recharts @vercel/kv cookie nanoid axios
npm install -D prettier eslint-config-prettier vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw supertest playwright @playwright/test @axe-core/playwright dotenv-cli
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.test="vitest run --coverage"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.test:e2e="playwright test"
npm pkg set scripts.format="prettier --write ."
npm pkg set scripts.format:check="prettier --check ."
npm pkg set scripts.ci="npm run lint; npm run format:check; npm run typecheck; npm run test; npm run build"
```

### Critical Code Block: env parser

```ts
// src/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_WEBHOOK_SECRET: z.string().min(1),

  SENDGRID_API_KEY: z.string().min(1),
  SENDGRID_FROM_EMAIL: z.string().email(),

  RECAPTCHA_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().min(1),

  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().regex(/^\d{10,15}$/),

  VERCEL_KV_REST_API_URL: z.string().url().optional(),
  VERCEL_KV_REST_API_TOKEN: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
```

### Critical Code Block: API response envelope

```ts
// src/lib/http/response.ts
import type { NextApiResponse } from "next";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: { requestId?: string; page?: number; limit?: number; total?: number };
};

export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(res: NextApiResponse<ApiEnvelope<T>>, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function fail(
  res: NextApiResponse<ApiEnvelope<never>>,
  code: string,
  message: string,
  status = 400,
  details?: unknown
) {
  return res.status(status).json({ success: false, error: { code, message, details } });
}
```

### Verification Checklist

- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] `npm run format:check` passes
- [x] Unit tests exist for env parser and response envelope
- [x] Boot fails fast when required env variables are missing
- [x] Logger redacts keys containing token, secret, password, key
- [x] Currency formatter produces correct `₦` formatting for edge cases (zero, decimals, large numbers)

### STOP & COMMIT

```powershell
git add package.json .env.example .prettierrc .prettierignore README.md src/config/env.ts src/lib src/types src/services/email
git commit -m "chore: foundation, env contract, shared libs, i18n, email service, formatters"
```

---

## 2. Supabase Schema, Migrations, Seed Data, and RLS Baseline — [COMPLETED]

**Milestone:** M2 (Completed) · **Estimated Effort:** 3–5 days · **Branch:** `feature/gar-m2-booking-engine` · **Status:** Merged to `develop`

### Step Checklist

- [x] Initialize Supabase project config
- [x] Implement schema migrations 0001–0006 exactly per SRS and corrected plan:
  - `0001_init_schema.sql` (all core entities, enums, indexes, constraints, `FailedEmail` table)
  - `0002_rls_policies.sql` (RLS policies by role matrix)
  - `0003_functions_triggers.sql` (availability, pricing, booking reference generator)
  - `0004_seed_reference_data.sql` (campuses, rooms, menus, facilities, baseline settings)
  - `0005_storage_buckets.sql` (`media-public` and `confirmations` buckets + policies)
  - `0006_pg_cron_setup.sql` (pg_cron extension + schedules)
- [x] Implement dual amenity model:
  1. `RoomType.amenities` JSON array for in-room/conditional display
  2. `Amenity` entity + `RoomTypeAmenity` junction table for resort-level amenities on Home
- [x] Ensure resort campuses are data-driven records in `Resort` entity (not hard-coded)
- [x] Enable pg_cron and register foundational schedules (booking expiry, email retry, deal deactivation)
- [x] Generate `src/types/db.ts` from database schema
- [x] Create deterministic seed data for demo/QA

### Explicit File Paths

- [x] supabase/config.toml
- [x] supabase/migrations/0001_init_schema.sql
- [x] supabase/migrations/0002_rls_policies.sql
- [x] supabase/migrations/0003_functions_triggers.sql
- [x] supabase/migrations/0004_seed_reference_data.sql
- [x] supabase/migrations/0005_storage_buckets.sql
- [x] supabase/migrations/0006_pg_cron_setup.sql
- [x] supabase/seed.sql
- [x] src/types/db.ts

### Commands

```powershell
npx supabase init
npx supabase start
npx supabase migration new 0001_init_schema
npx supabase migration new 0002_rls_policies
npx supabase migration new 0003_functions_triggers
npx supabase migration new 0004_seed_reference_data
npx supabase migration new 0005_storage_buckets
npx supabase migration new 0006_pg_cron_setup
npx supabase db reset
npx supabase gen types typescript --local > src/types/db.ts
```

### Verification Checklist

- [x] `npx supabase db reset` completes cleanly
- [x] All required tables, enums, indexes, constraints exist
- [x] RLS denies guest read/write on admin-only datasets
- [x] Dual amenity model verified: RoomType.amenities JSON and Amenity junction both queryable
- [x] Buckets `media-public` and `confirmations` exist with correct policies
- [x] pg_cron extension enabled with required schedules

### STOP & COMMIT

```powershell
git add supabase src/types/db.ts
git commit -m "feat: schema, migrations, seeds, RLS, storage buckets, pg_cron setup"
```

---

## 3. API Core, Auth Session Handling, Rate Limiting, and Middleware — [COMPLETED]

**Milestone:** M2 (Completed) · **Estimated Effort:** 2–3 days · **Branch:** `feature/gar-m2-booking-engine` · **Status:** Merged to `develop`

### Step Checklist

- [x] Build composable API handler pipeline with method guards and schema validation
- [x] Add auth session extraction and role claim parsing for Supabase auth
- [x] Add Vercel KV rate limiting adapter with in-memory local development fallback
- [x] Add reCAPTCHA verifier with minimum score 0.5 threshold
- [x] Add CSRF and security header middleware (HSTS, CSP, SameSite cookies)
- [x] Add pagination helper with `?page=1&limit=20` and `X-Total-Count`, `X-Total-Pages` headers

### Explicit File Paths

- [x] src/pages/api/v1/_shared/handler.ts
- [x] src/pages/api/v1/_shared/auth.ts
- [x] src/pages/api/v1/_shared/rate-limit.ts
- [x] src/pages/api/v1/_shared/recaptcha.ts
- [x] src/pages/api/v1/_shared/pagination.ts
- [x] src/pages/api/v1/_shared/audit-log.ts
- [x] src/lib/supabase/server.ts
- [x] src/lib/supabase/client.ts
- [x] src/lib/security/csrf.ts
- [x] src/lib/security/headers.ts

### Critical Code Block: middleware wrappers

```ts
// src/pages/api/v1/_shared/handler.ts
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { fail } from "@/lib/http/response";

export type ApiCtx = {
  requestId: string;
  user?: { id: string; role: "guest" | "content_manager" | "resort_admin" | "super_admin" };
};

type Middleware = (req: NextApiRequest, res: NextApiResponse, ctx: ApiCtx) => Promise<void>;

export function withApi(handler: NextApiHandler, middleware: Middleware[] = []): NextApiHandler {
  return async (req, res) => {
    const ctx: ApiCtx = { requestId: crypto.randomUUID() };
    try {
      for (const fn of middleware) {
        await fn(req, res, ctx);
        if (res.writableEnded) return;
      }
      await handler(req, res);
    } catch (error) {
      return fail(res, "INTERNAL_ERROR", "Unexpected server error", 500, {
        requestId: ctx.requestId,
      });
    }
  };
}
```

### Commands

```powershell
npm run lint
npm run typecheck
npm run test
```

### Verification Checklist

- [x] Wrapper enforces method guards and schema validation
- [x] Role guard blocks unauthorized roles
- [x] Rate limiter throttles auth/contact/events/newsletter/notify endpoints
- [x] CSRF middleware rejects invalid mutating requests
- [x] Security headers include HSTS and CSP
- [x] Pagination headers present on paginated list endpoints

### STOP & COMMIT

```powershell
git add src/pages/api/v1/_shared src/lib/supabase src/lib/security
git commit -m "feat: API middleware stack, auth context, security primitives"
```

---

## 4. Authentication and User Profile Vertical Slice — [COMPLETED]

**Milestone:** M2 (Completed) · **Estimated Effort:** 4–5 days · **Branch:** `feature/gar-m2-booking-engine` · **Status:** Merged to `develop`

### Step Checklist

- [x] Build auth pages (`/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`)
- [x] Implement email verification interstitial page (`/verify-email`) with resend link
- [x] Implement login `?redirect={url}` query parameter support
- [x] Implement all auth API endpoints including authenticated password change (`PUT /api/v1/auth/me/password`)
- [x] Enforce password policy: minimum 8 chars, 1 uppercase, 1 lowercase, 1 digit
- [x] Implement login lockout: reCAPTCHA after 3 failures, account lock for 15 minutes after 5 failures
- [x] Add resend verification rate limit (max 1 per 60 seconds per email)
- [x] Enforce NDPR consent checkbox on registration linking to `/privacy`
- [x] Configure Supabase Auth bcrypt cost factor ≥ 12
- [x] Exclude social login from v1.0 (email/password only)

### Explicit File Paths

- [x] src/pages/register.tsx
- [x] src/pages/login.tsx
- [x] src/pages/forgot-password.tsx
- [x] src/pages/reset-password.tsx
- [x] src/pages/verify-email.tsx
- [x] src/pages/api/v1/auth/register.ts
- [x] src/pages/api/v1/auth/login.ts
- [x] src/pages/api/v1/auth/refresh.ts
- [x] src/pages/api/v1/auth/logout.ts
- [x] src/pages/api/v1/auth/forgot-password.ts
- [x] src/pages/api/v1/auth/reset-password.ts
- [x] src/pages/api/v1/auth/me.ts
- [x] src/pages/api/v1/auth/me/password.ts
- [x] src/pages/api/v1/auth/resend-verification.ts
- [x] src/features/auth/schemas.ts
- [x] src/features/auth/components/*

### Critical Code Block: auth schema

```ts
// src/features/auth/schemas.ts
import { z } from "zod";

export const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must include at least one uppercase letter")
  .regex(/[a-z]/, "Must include at least one lowercase letter")
  .regex(/[0-9]/, "Must include at least one number");

export const registerSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().regex(/^\+234\d{10}$/),
    password: passwordPolicy,
    confirmPassword: z.string(),
    consentAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must accept the privacy policy" }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordPolicy,
    confirmNewPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });
```

### Commands

```powershell
npm run test -- --runInBand
npm run lint
npm run typecheck
```

### Verification Checklist

- [x] Register flow creates account and sends verification email via SendGrid
- [x] `/verify-email` page displays expected interstitial and resend action
- [x] Login supports `?redirect=` and returns user to target route
- [x] Account locks after 5 failed attempts for 15 minutes; reCAPTCHA enforced after 3
- [x] `PUT /api/v1/auth/me/password` validates current password and updates hash
- [x] Resend verification rate limit enforced (1 per 60s)

### STOP & COMMIT

```powershell
git add src/pages/register.tsx src/pages/login.tsx src/pages/forgot-password.tsx src/pages/reset-password.tsx src/pages/verify-email.tsx src/pages/api/v1/auth src/features/auth
git commit -m "feat: auth pages, auth endpoints, change-password endpoint"
```

---

## 5. Global Site Shell, Accessibility Baseline, Consent, and Shared UX States — [COMPLETED]

**Milestone:** M1 (Completed) · **Estimated Effort:** 3–4 days · **Branch:** `feature/gar-m1-marketing-site` · **Status:** Merged to `develop`

### Step Checklist

- [x] Build global shell (sticky nav, footer, WhatsApp FAB, page transition indicator)
- [x] Implement cookie consent banner per SRS Section 3:
  - Fixed bottom bar, 3 categories: Essential (always-on), Analytics (opt-in), Marketing (opt-in)
  - First-party cookie `gar_cookie_consent` with 12-month expiry
  - "Manage Preferences" modal with category toggles
  - "Cookie Settings" link in footer to re-open preferences
- [x] Implement conditional analytics loading (GA4/GTM only if analytics consent granted)
- [x] Add skip link, keyboard focus styles, and semantic landmark structure (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- [x] Implement page transition loading indicator during Next.js route changes
- [x] Implement WhatsApp FAB with context-aware pre-filled messages
- [x] Implement network offline detection banner
- [x] Add reusable loading/error/empty state components with WhatsApp fallback link

### Explicit File Paths

- [x] src/components/layout/Navbar.tsx
- [x] src/components/layout/Footer.tsx
- [x] src/components/layout/PageWrapper.tsx
- [x] src/components/layout/HeadComponent.tsx
- [x] src/components/common/SkipToContent.tsx
- [x] src/components/common/WhatsAppFab.tsx
- [x] src/components/common/CookieConsentBanner.tsx
- [x] src/components/common/CookiePreferencesModal.tsx
- [x] src/components/common/GlobalNetworkStatus.tsx
- [x] src/components/common/PageTransitionIndicator.tsx
- [x] src/components/states/LoadingState.tsx
- [x] src/components/states/ErrorState.tsx
- [x] src/components/states/EmptyState.tsx
- [x] src/styles/globals.css
- [x] src/lib/seo/meta.ts

### Critical Code Block: cookie consent data shape

```ts
// src/components/common/cookie-consent.types.ts
export type ConsentCategory = "essential" | "analytics" | "marketing";

export type CookieConsentState = {
  version: 1;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  consentedAt: string; // ISO-8601
};

export const COOKIE_CONSENT_KEY = "gar_cookie_consent";
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 12 months
```

### Commands

```powershell
npm run dev
npm run lint
npm run test
```

### Verification Checklist

- [x] Consent cookie `gar_cookie_consent` persists for 12 months with per-category state
- [x] Essential cookies are always enabled and cannot be unchecked
- [x] Analytics scripts do not load when analytics consent is false
- [x] Footer link re-opens preferences modal
- [x] Offline banner appears when network drops
- [x] WhatsApp FAB generates context-aware messages based on current page
- [x] Page transition indicator animates during Next.js router events

### STOP & COMMIT

```powershell
git add src/components/layout src/components/common src/components/states src/styles/globals.css src/lib/seo/meta.ts
git commit -m "feat: global shell, consent, accessibility baseline, page transitions"
```

---

## 6. Public Content Pages Vertical Slice — [COMPLETED]

**Milestone:** M1 (Completed) · **Estimated Effort:** 8–12 days · **Branch:** `feature/gar-m1-marketing-site` · **Status:** Merged to `develop`

### Step Checklist

- [x] Implement all public pages per SRS Section 3: Home, About, Facilities, Restaurants, Gems, Events, Deals, Contact, Privacy
- [x] **Home Page:** Hero video with mobile poster fallback, 4 Off-Beat Gems cards with 5s auto-rotate, Resort Categories cards, Amenities Snapshot (`GET /api/v1/amenities`), Facilities Carousel, Photo Gallery (`GET /api/v1/media?category=gallery&page=home`), MapSection with Google Maps embed
- [x] Implement accessible Lightbox component (`src/components/common/Lightbox.tsx`) with arrow navigation, Escape to close, focus trap, and screen reader alt announcements
- [x] Implement MapSection (`src/components/common/MapSection.tsx`) with fallback to static image + directions link
- [x] Implement public detail endpoints:
  - `GET /api/v1/facilities/[id].ts`
  - `GET /api/v1/restaurants/[id].ts`
  - `GET /api/v1/deals/[id].ts`
  - `GET /api/v1/amenities/index.ts` (resort-level amenities from Amenity entity)
  - `GET /api/v1/media/index.ts` (public read access filtered by category/page)
- [x] Implement newsletter double opt-in (`/api/v1/newsletter/subscribe` + `/api/v1/newsletter/confirm`) and unsubscribe (`/api/v1/newsletter/unsubscribe`)
- [x] Implement contact form (rate limited 3/hr/IP) and event inquiries form (rate limited 5/hr/IP) with reCAPTCHA
- [x] Implement JSON-LD structured data for every page type (`Hotel`, `Organization`, `TouristAttraction`, `Restaurant`, `Event`, `Offer`, `ContactPage`, `LocalBusiness`)

### Explicit File Paths

- [x] src/pages/index.tsx
- [x] src/pages/about.tsx
- [x] src/pages/facilities.tsx
- [x] src/pages/restaurants.tsx
- [x] src/pages/gems.tsx
- [x] src/pages/events.tsx
- [x] src/pages/deals.tsx
- [x] src/pages/contact.tsx
- [x] src/pages/privacy.tsx
- [x] src/pages/api/v1/content/[page].ts
- [x] src/pages/api/v1/facilities/index.ts
- [x] src/pages/api/v1/facilities/[id].ts
- [x] src/pages/api/v1/restaurants/index.ts
- [x] src/pages/api/v1/restaurants/[id].ts
- [x] src/pages/api/v1/restaurants/[id]/menu.ts
- [x] src/pages/api/v1/gems/index.ts
- [x] src/pages/api/v1/events/index.ts
- [x] src/pages/api/v1/events/inquiries.ts
- [x] src/pages/api/v1/deals/index.ts
- [x] src/pages/api/v1/deals/[id].ts
- [x] src/pages/api/v1/contact/index.ts
- [x] src/pages/api/v1/newsletter/subscribe.ts
- [x] src/pages/api/v1/newsletter/confirm.ts
- [x] src/pages/api/v1/newsletter/unsubscribe.ts
- [x] src/pages/api/v1/amenities/index.ts
- [x] src/pages/api/v1/media/index.ts
- [x] src/components/common/Lightbox.tsx
- [x] src/components/common/MapSection.tsx
- [x] src/components/home/HeroVideo.tsx
- [x] src/features/content/*

### Commands

```powershell
npm run lint
npm run typecheck
npm run test
npm run dev
```

### Verification Checklist

- [x] Hero video falls back to poster image on mobile (<768px) and `prefers-reduced-motion`
- [x] Lightbox keyboard navigation (Left/Right/Esc) and focus trap work correctly
- [x] Google Maps fallback image and link render when embed fails
- [x] Newsletter flow: subscribe -> confirmation email -> token confirmation -> unsubscribe works end-to-end
- [x] Form rate limits enforced: contact 3/hr/IP, inquiries 5/hr/IP
- [x] JSON-LD valid and present on every public page

### STOP & COMMIT

```powershell
git add src/pages src/components/common/Lightbox.tsx src/components/common/MapSection.tsx src/components/home/HeroVideo.tsx src/features/content
git commit -m "feat: public pages, APIs, amenities/media, newsletter double opt-in, lightbox"
```

---

## 7. Rooms and Suites Catalog with Under-Construction and Notify Me — [COMPLETED]

**Milestone:** M1 (Completed) · **Estimated Effort:** 3–5 days · **Branch:** `feature/gar-m1-marketing-site` · **Status:** Merged to `develop` — **Completes Milestone 1**

### Step Checklist

- [x] Implement room listing with resort toggle (Elysian vs Village) and tier filtering
- [x] Implement `GET /api/v1/buildings` public endpoint to list buildings with campus association
- [x] Enforce under-construction behavior for Presidential and Royal room types:
  - Greyed/outlined card styling with "Under Construction" badge
  - "Price TBD" instead of numeric rate
  - "Notify Me" button instead of "Book This Room"
- [x] Implement notify-me capture endpoint (`POST /api/v1/notify-me`) with duplicate suppression (same email + roomTypeId returns 200 without creating a second record)
- [x] Render Prayer Hut and shared amenities with conditional tooltips ("Subject to availability")
- [x] Render room detail amenities categorized into "In-Room Amenities" and "Resort Amenities" from `RoomType.amenities` JSON
- [x] Exclude under-construction room types from `makesOffer` structured data
- [x] Responsive room cards: 1 column mobile, 2 columns tablet, 3 columns desktop; resort tabs full width on mobile

### Explicit File Paths

- [x] src/pages/rooms.tsx
- [x] src/pages/api/v1/rooms/index.ts
- [x] src/pages/api/v1/rooms/[id].ts
- [x] src/pages/api/v1/buildings/index.ts
- [x] src/pages/api/v1/notify-me.ts
- [x] src/features/rooms/*

### Commands

```powershell
npm run lint
npm run typecheck
npm run test
```

### Verification Checklist

- [x] Presidential and Royal huts display Under Construction badge, Price TBD, and Notify Me CTA
- [x] Notify Me duplicate submissions return 200 without creating duplicate rows
- [x] RoomType amenity JSON parses into In-Room vs Resort Amenities sections
- [x] Under-construction rooms excluded from JSON-LD `makesOffer`
- [x] Buildings endpoint returns campus associations
- [x] M1 Exit Criteria verified: all public pages, room browsing, WhatsApp CTAs, consent, SEO baseline operational

### STOP & COMMIT

```powershell
git add src/pages/rooms.tsx src/pages/api/v1/rooms src/pages/api/v1/buildings src/pages/api/v1/notify-me.ts src/features/rooms
git commit -m "feat: rooms catalog, buildings endpoint, notify-me"
```

---

## 8. Booking Engine Backend (Availability, Pricing, Lifecycle) — [COMPLETED]

**Milestone:** M2 (Completed) · **Estimated Effort:** 8–10 days · **Branch:** `feature/gar-m2-booking-engine` · **Status:** Merged to `develop`

### Step Checklist

- [x] Implement availability checks and calendar availability endpoint (`/api/v1/availability/calendar`)
- [x] Implement full pricing engine per SRS 4.3:
  - Check SeasonalPrice records per night (latest takes precedence if overlapping), fallback to basePrice
  - Formula: `SUM(applicable_nightly_rate × quantity)` = subtotal
  - Tax = `subtotal × tax_rate` (default 7.5% VAT)
  - Percentage deal discount: applied ONLY to subtotal of applicable room types
  - Fixed deal discount: subtracted from full subtotal
  - Total = `subtotal − deal_discount + tax`
- [x] Implement booking reference generator: alphanumeric, 8 characters, prefixed with `GAR-`
- [x] Implement transactional concurrency controls (`SELECT ... FOR UPDATE` on room units)
- [x] Implement booking lifecycle state machine (Pending -> Confirmed -> Checked-In -> Checked-Out; Pending -> Cancelled; Confirmed -> Cancelled; Confirmed -> No-Show)
- [x] Implement no-show policy guard: admin can mark No-Show only starting 24h after scheduled check-in time (14:00 on check-in date); no refund for no-shows
- [x] Implement admin-initiated booking API path: creates Confirmed bookings with null `userId` and cash/POS payment metadata
- [x] Implement cancellation refund rules: >=72h full refund, 24–72h 50%, <24h no refund
- [x] Automatically trigger booking confirmation email with attached PDF on status change to Confirmed

### Explicit File Paths

- [x] src/pages/api/v1/availability/index.ts
- [x] src/pages/api/v1/availability/calendar.ts
- [x] src/pages/api/v1/bookings/index.ts
- [x] src/pages/api/v1/bookings/[ref].ts
- [x] src/pages/api/v1/bookings/[ref]/cancel.ts
- [x] src/pages/api/v1/bookings/[ref]/status.ts
- [x] src/pages/api/v1/bookings/[ref]/confirmation.ts
- [x] src/pages/api/v1/bookings/[ref]/pdf.ts
- [x] src/pages/api/v1/deals/validate/[code].ts
- [x] src/domain/booking/*
- [x] src/domain/booking/state-machine.ts
- [x] src/services/pricing/*

### Critical Code Block: booking state machine

```ts
// src/domain/booking/state-machine.ts
export type BookingStatus =
  "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";

const transitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid booking transition: ${from} -> ${to}`);
  }
}

export function canMarkNoShow(now: Date, checkInAt: Date): boolean {
  const threshold = new Date(checkInAt.getTime() + 24 * 60 * 60 * 1000);
  return now >= threshold;
}
```

### Commands

```powershell
npm run test
npm run lint
npm run typecheck
```

### Verification Checklist

- [x] Pricing formula produces correct deterministic totals for seasonal and multi-room bookings
- [x] Deal percentage discount applies only to applicable room subset
- [x] Deal fixed discount subtracts from full subtotal
- [x] Concurrent bookings for the last available unit do not double-book
- [x] No-show transition rejected before 24h post check-in time
- [x] Admin booking endpoint accepts cash/POS and sets status=confirmed directly
- [x] Confirmation email sent with generated PDF attachment

### STOP & COMMIT

```powershell
git add src/pages/api/v1/availability src/pages/api/v1/bookings src/pages/api/v1/deals/validate src/domain/booking src/services/pricing
git commit -m "feat: booking APIs, pricing engine, state machine, no-show, admin booking API"
```

---

## 9. Payment Integration and Webhook Security — [COMPLETED]

**Milestone:** M2 (Completed) · **Estimated Effort:** 4–6 days · **Branch:** `feature/gar-m2-booking-engine` · **Status:** Merged to `develop`

### Step Checklist

- [x] Implement Paystack payment initiation and verification
- [x] Implement Paystack webhook endpoint with raw-body HMAC-SHA512 verification (`bodyParser: false`)
- [x] Add idempotency and replay protection for webhook processing
- [x] Implement Paystack Refunds API integration (`src/services/payments/refund.ts`) supporting full and partial refunds
- [x] Handle refund webhook completion events and send refund notification emails (initiation + completion)
- [x] Handle expired pending booking race condition: if payment succeeds for an expired booking, auto-trigger full refund and notify guest
- [x] Implement gateway downtime graceful degradation: display WhatsApp fallback message and extend booking hold window to 2 hours (instead of 30 mins)

### Explicit File Paths

- [x] src/pages/api/v1/payments/initiate.ts
- [x] src/pages/api/v1/payments/verify.ts
- [x] src/pages/api/v1/payments/webhook.ts
- [x] src/pages/api/v1/payments/[id].ts
- [x] src/services/payments/paystack.ts
- [x] src/services/payments/signature.ts
- [x] src/services/payments/refund.ts
- [x] src/domain/payment/*

### Critical Code Block: webhook raw-body config

```ts
// src/pages/api/v1/payments/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import getRawBody from "raw-body";
import { env } from "@/config/env";

export const config = {
  api: { bodyParser: false },
};

function isValidSignature(raw: Buffer, signature: string | string[] | undefined): boolean {
  const computed = crypto
    .createHmac("sha512", env.PAYSTACK_WEBHOOK_SECRET)
    .update(raw)
    .digest("hex");

  return (
    typeof signature === "string" &&
    crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const raw = await getRawBody(req);
  if (!isValidSignature(raw, req.headers["x-paystack-signature"])) {
    return res
      .status(401)
      .json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Unauthorized" } });
  }

  const event = JSON.parse(raw.toString("utf8"));
  // enforce idempotency by event.id before processing
  return res.status(200).json({ success: true });
}
```

### Commands

```powershell
npm install raw-body
npm run test
npm run lint
npm run typecheck
```

### Verification Checklist

- [x] Webhook rejects tampered signatures with 401 Unauthorized
- [x] `bodyParser: false` set on webhook route
- [x] Expired pending booking with late payment triggers automatic refund via Paystack Refunds API
- [x] Refund webhook updates Payment status to `refunded` or `partially_refunded`
- [x] Gateway downtime activates WhatsApp booking CTA and extends inventory hold to 2 hours

### STOP & COMMIT

```powershell
git add src/pages/api/v1/payments src/services/payments src/domain/payment
git commit -m "feat: payment integration, secure webhook, refunds, race handling, downtime fallback"
```

---

## 10. Booking Wizard Frontend and Confirmation Experience — [COMPLETED]

**Milestone:** M2 (Completed) · **Estimated Effort:** 6–8 days · **Branch:** `feature/gar-m2-booking-engine` · **Status:** Merged to `develop`

### Step Checklist

- [x] Implement 4-step booking wizard (`src/pages/booking.tsx`):
  - Step 1: Dates (past blocked, 1–30 nights) and guests (adults 1–10, children 0–10)
  - Step 2: Room selection with campus/tier filter, per-night seasonal rates, multi-room support (under-construction rooms excluded)
  - Step 3: Guest details form with +234 phone validation, special requests (max 500 chars)
  - Step 4: Summary with per-section Edit links and Paystack inline checkout
- [x] Implement query preselection: `?room={id}` preselects room in Step 2; `?deal={code}` auto-applies discount, filters rooms, displays banner
- [x] Implement responsive booking summary: sticky sidebar on desktop, bottom sheet on mobile
- [x] Implement confirmation screen with booking reference, PDF download, resend email, WhatsApp CTA, and account link
- [x] Implement payment gateway downtime fallback UI ("Online payment temporarily unavailable. Please contact us on WhatsApp")

### Explicit File Paths

- [x] src/pages/booking.tsx
- [x] src/features/booking/context/BookingWizardContext.tsx
- [x] src/features/booking/components/*
- [x] src/features/booking/schemas.ts
- [x] src/features/booking/hooks/*

### Commands

```powershell
npm run dev
npm run lint
npm run test
```

### Verification Checklist

- [x] Step indicator shows "Step X of 4" across mobile and desktop
- [x] Query preselection works for `?room=` and `?deal=`
- [x] Nigerian phone number validation (+234 format) strictly enforced
- [x] Under-construction rooms are never selectable in wizard
- [x] Confirmation screen renders reference number, PDF download, and WhatsApp CTA
- [x] Gateway outage correctly displays fallback messaging

### STOP & COMMIT

```powershell
git add src/pages/booking.tsx src/features/booking
git commit -m "feat: booking wizard UI, confirmation UX, payment fallback handling"
```

---

## 11. Guest Account and Booking Management — [COMPLETED]

**Milestone:** M2 (Completed) · **Estimated Effort:** 4–5 days · **Branch:** `feature/gar-m2-booking-engine` · **Status:** Merged to `develop` — **Completes Milestone 2**

### Step Checklist

- [x] Build authenticated guest account pages (`/account`, `/account/bookings`, `/account/profile`) with unauthenticated redirect to `/login?redirect=/account`
- [x] Implement booking list with color-coded status badges: Confirmed (green), Pending (yellow), Cancelled (red), Checked-In (blue), Checked-Out (grey)
- [x] Implement actions per booking state:
  - Pending: "Complete Payment", "Cancel Booking"
  - Confirmed: "Cancel Booking", "Download Confirmation (PDF)", "Resend Confirmation Email", "Contact Us on WhatsApp"
  - Cancelled: "Refund Status" (shows amount and 5–10 day timeline)
  - Checked-Out: "Download Receipt (PDF)" (shows payment method & settlement details)
- [x] Implement cancellation modal with server-side refund calculation preview
- [x] Implement Profile Settings: edit name and phone, read-only email with change notice, and Change Password section calling `PUT /api/v1/auth/me/password`

### Explicit File Paths

- [x] src/pages/account/index.tsx
- [x] src/pages/account/bookings.tsx
- [x] src/pages/account/profile.tsx
- [x] src/features/account/*
- [x] src/pages/api/v1/bookings/index.ts
- [x] src/pages/api/v1/auth/me.ts
- [x] src/pages/api/v1/auth/me/password.ts

### Commands

```powershell
npm run test
npm run lint
npm run typecheck
```

### Verification Checklist

- [x] Unauthenticated requests redirect to `/login?redirect=/account`
- [x] Status badges match required color specifications
- [x] Cancellation modal shows preview of refund amount (100% / 50% / 0%) before confirmation
- [x] Profile change password validates current password and updates via API
- [x] RLS prevents users from viewing other guests' bookings
- [x] M2 Exit Criteria verified: full booking lifecycle, Paystack sandbox payment, PDF confirmation, guest account management working

### STOP & COMMIT

```powershell
git add src/pages/account src/features/account src/pages/api/v1/bookings/index.ts src/pages/api/v1/auth/me.ts src/pages/api/v1/auth/me/password.ts
git commit -m "feat: guest account, booking management, profile and password change UI"
```

---

## 12A. Admin Shell, RBAC Guards, Bookings Operations, Offline Payments & Refunds, Room Status

**Milestone:** M3 · **Estimated Effort:** 7–9 days · **Branch:** `feature/gar-m3-admin-ops` · **PR:** Step 12A PR merged to `main`

> **Simplified Admin Rationale (PM Recommendation):** The SRS specifies a full CMS with 14 sidebar modules, Recharts dashboards, occupancy heatmaps, and broad CRUD. For v1.0, the admin panel will have 2–3 users. Step 12 is split so operations ship first:
>
> 1. **12A (this step):** protected admin shell, RBAC guards, admin bootstrap, **Bookings Management** (filters, detail, check-in with unit assignment, check-out, no-show, admin-initiated bookings, **offline payments and manual refunds**), and **Room Status Management** with the Notify-Me trigger
> 2. **12B:** dashboard KPIs, charts, heatmap, activity feed
>
> All other broad CRUD modules remain deferred to Step 15. Staff can use the Supabase Dashboard for quick raw edits.

> **Product Decision (2026-10-16): Offline payments and manual refunds.** Guests who book through the WhatsApp concierge may pay by **bank transfer**. Admins record offline payments (bank transfer / cash / POS) to confirm bookings, and cancel such bookings with a refund paid **outside Paystack** that is tracked to completion. Specified in **SRS v1.4** (§3.14.4, §4.3, §6, §7, §8.1).

### Step Checklist

**Schema: `supabase/migrations/0009_admin_operations.sql`**

- [ ] `bookings`: add `cancellation_reason` (`guest_request` | `admin_cancelled` | `payment_timeout` | `payment_after_expiry`), `cancelled_at`, `cancelled_by`, `status_changed_by`. Backfill `[System: Cancelled due to payment timeout]` rows to `payment_timeout`. Update `expire_stale_pending_bookings()` to set the reason instead of appending to `special_requests`
- [ ] `booking_status_history` table plus an `AFTER INSERT OR UPDATE OF status` trigger on `bookings` (actor = `status_changed_by`, null = System). Captures API, webhook, and pg_cron transitions; `audit_logs` today is written only by cancel, claim, and status
- [ ] `booking_room_assignments` (`booking_id`, `booking_line_item_id`, `room_id`, `assigned_by`, `assigned_at`, `released_at`) with a partial unique index on `room_id WHERE released_at IS NULL`
- [ ] `payments`: add status `refund_failed`; constrain `gateway IN ('paystack','cash','pos','bank_transfer')`; add `refund_method` (`paystack` | `bank_transfer` | `cash` | `pos_reversal`), `refund_reference`, `refund_processed_by`, `refund_note`. Store only bank name and last 4 digits in `metadata.refundDestination`, never full account numbers
- [ ] RPCs: `check_in_booking(booking_id, assignments jsonb, actor)` and `check_out_booking(booking_id, actor)` (atomic status, assignment, and unit-status changes); `record_offline_payment(...)` (insert payment + pending → confirmed, guarded on `status = 'pending'`)
- [ ] Confirm `check_room_availability` subtracts `maintenance` units, as `get_stay_availability` already does (SRS 4.2)
- [ ] Regenerate `src/types/db.ts`

**Access control (Next 16)**

- [ ] `src/lib/auth/admin-guard.ts`: `requireAdminPage(roles)` used in `getServerSideProps` of **every** `/admin` page. Unauthenticated or unauthorized users go to `/login?redirect=/admin`
- [ ] `src/proxy.ts`: optimistic redirect for `/admin/:path*` when no session cookie exists. Next 16 renamed Middleware to Proxy; `pages/admin/_middleware.ts` is not supported, and Proxy is not the authorization layer
- [ ] Every admin API keeps `withApi({ requiredRoles })`. Booking mutations, offline payments, refunds, and room endpoints require `resort_admin` or `super_admin`
- [ ] Role matrix (SRS 4.1 / 2.3):
  - Content Manager: Dashboard (non-financial), Bookings read-only (no action buttons), content modules "Coming Soon"; Rooms, Users, and Settings hidden
  - Resort Admin: all except Users and Settings
  - Super Admin: all
- [ ] Admin idle timeout (plan addition, not SRS): `IdleTimeout.tsx` logs out after 30 minutes without activity (`/login?...&reason=idle`); the guard rejects a stale HttpOnly `gar_admin_last_seen` cookie
- [ ] `scripts/create-admin-user.ts` (service role): create the auth user, set the role, send a password-set link. Used for Data Day 2 until Step 15 user management

**Admin shell**

- [ ] `AdminLayout`, `AdminSidebar`, `AdminTopbar`, `AdminBreadcrumb`; desktop-first, functional at ≥ 768px; no public navbar or footer
- [ ] Sidebar lists all 14 SRS 3.14.1 modules, filtered by role; unbuilt modules are greyed out with a "Coming Soon" tooltip
- [ ] Topbar: user name, role badge, "View Site" (new tab), logout, notification bell (counts wired in 12B)

**Bookings Management**

- [ ] Extend `GET /api/v1/bookings` admin filters: `checkInFrom`, `checkInTo`, `resort`, `channel`, `paymentStatus`, and `q` (reference / guest name / email). Today it supports only `status`, `reference`, and `guestEmail`
- [ ] `/admin/bookings`:
  - Table: reference, guest, channel, check-in, check-out, rooms, total, booking status, payment/refund status, created date
  - Quick filter **"Refunds to process"**: `refund_pending` with a manual method, or `refund_failed`
- [ ] `/admin/bookings/[ref]`:
  - Guest info, linked account or "Guest checkout", channel and source, privacy-consent timestamp
  - Rooms, pricing breakdown, deal, special requests
  - **Payment panel**: gateway, reference, amount, paid at, refund amount/status/method/reference
  - Assigned units
  - **Status timeline** from `booking_status_history`, plus admin notes from `audit_logs`
- [ ] `PUT /bookings/{ref}/status`: allow only `checked_in`, `checked_out`, and `no_show`. **Reject `cancelled` and `pending → confirmed`**; today both are accepted, which bypasses the refund flow and payment verification
  - Checked-In requires one available unit per booked room (count = line-item quantity) and calls `check_in_booking`; the units become `occupied`
  - Checked-Out calls `check_out_booking`; the assignments are released and the units become `available`
  - No-Show keeps the 24-hour guard
- [ ] **Record Offline Payment**: `POST /api/v1/bookings/{ref}/offline-payment` with `{ method: 'bank_transfer' | 'cash' | 'pos', amount, reference, paidAt, note }`
  - Amount must equal the booking total; bank-transfer reference required and unique
  - If the booking is still `pending`, it becomes `confirmed` and the confirmation email with PDF is sent; if the hold has expired, return 409
  - Audit-logged
- [ ] **Admin-initiated booking** `/admin/bookings/new`:
  - Public booking fields plus source (WhatsApp / phone / front desk), payment method (`cash` | `pos` | `bank_transfer`), and payment reference (required for bank transfer)
  - Creates a Confirmed booking with `channel = 'walk_in'` and `user_id = null`
  - Extend the `paymentMethod` enum in `bookings/index.ts` with `bank_transfer`, and use the real reference when one is supplied
- [ ] **Admin cancellation** (`/bookings/{ref}/cancel`, modal with the GET refund preview):
  - Resort Admin+ may override the refund amount (0 to the amount paid) with a mandatory reason; audit-logged; `cancellation_reason = 'admin_cancelled'`
  - Paystack payments: Paystack Refunds API as today. If Paystack rejects, offer **"Refund manually instead"** rather than blocking the cancellation
  - Offline payments (`bank_transfer` / `cash` / `pos`): **no Paystack call**. The booking is cancelled; the payment becomes `refund_pending` with `refund_method` and `refund_amount`; the guest receives `booking_refund_initiated` (offline variant: "refund will be sent by bank transfer")
  - Guest self-cancellations of offline-paid bookings (manage link or account) take the same manual path and appear in the queue
- [ ] **Record refund outcome**: `POST /api/v1/payments/{id}/refund` with `{ action: 'mark_processed' | 'mark_failed' | 'retry_paystack', reference, refundedAt, destination: { bankName, accountLast4 }, note }`
  - `mark_processed` → `refunded` / `partially_refunded`, `refunded_at`, `refund_reference`, `refund_processed_by`; sends `booking_refund_completed`
  - `mark_failed` → `refund_failed`
  - UI lifecycle: Pending → Processed → Failed (SRS 3.14.4)
- [ ] `payments/webhook.ts`: `refund.failed` sets the payment to `refund_failed`. Today it only logs, leaving `refund_pending` forever
- [ ] Audit-log every admin action: status changes, offline payments, cancellations and overrides, refund outcomes, unit and room-type status changes, admin bookings (SRS 5.3)

**Room Status Management**

- [ ] `/admin/rooms` (Resort Admin+): room types table filterable by resort, tier, and status
- [ ] `PUT /api/v1/rooms/{id}`, accepting only `status` (`under_construction` ↔ `available`) in M3. `rooms/[id].ts` is GET-only today
- [ ] `GET /api/v1/rooms/{id}/units` and `PUT /api/v1/rooms/{id}/units/{unitId}`. Admins set `available` or `maintenance`; `occupied` is set only by check-in and check-out; `maintenance` is blocked while a unit is assigned
- [ ] **Notify-Me** (`src/services/notify-me/send-room-available.ts`): on `under_construction` → `available`, run a batch send after the response to registrations with `is_notified = false`
  - New template `room_now_available` in `src/services/email/templates.ts`, per SRS 4.5 (subject, room name, tier, ₦ price per night, hero image, description, "Book Now" → `/booking?room={roomTypeId}`)
  - On success: `is_notified = true`, `notified_at = NOW()`
  - Failures go to `failed_emails` with a `retry_handler` (Step 13 retry job: 3 retries, exponential backoff)
  - Never re-sends to rows already notified

### Explicit File Paths

- [ ] supabase/migrations/0009_admin_operations.sql
- [ ] src/types/db.ts (regenerated)
- [ ] src/proxy.ts
- [ ] src/lib/auth/admin-guard.ts
- [ ] src/components/admin/AdminLayout.tsx
- [ ] src/components/admin/AdminSidebar.tsx
- [ ] src/components/admin/AdminTopbar.tsx
- [ ] src/components/admin/AdminBreadcrumb.tsx
- [ ] src/components/admin/IdleTimeout.tsx
- [ ] src/pages/admin/index.tsx
- [ ] src/pages/admin/bookings/index.tsx
- [ ] src/pages/admin/bookings/[ref].tsx
- [ ] src/pages/admin/bookings/new.tsx
- [ ] src/pages/admin/rooms/index.tsx
- [ ] src/pages/api/v1/bookings/index.ts
- [ ] src/pages/api/v1/bookings/[ref]/status.ts
- [ ] src/pages/api/v1/bookings/[ref]/cancel.ts
- [ ] src/pages/api/v1/bookings/[ref]/offline-payment.ts
- [ ] src/pages/api/v1/payments/[id]/refund.ts
- [ ] src/pages/api/v1/payments/webhook.ts
- [ ] src/pages/api/v1/rooms/[id].ts
- [ ] src/pages/api/v1/rooms/[id]/units/index.ts
- [ ] src/pages/api/v1/rooms/[id]/units/[unitId].ts
- [ ] src/services/notify-me/send-room-available.ts
- [ ] src/services/email/templates.ts
- [ ] scripts/create-admin-user.ts

### Commands

```powershell
npx supabase db reset
npx supabase gen types typescript --local > src/types/db.ts
npm run dev
npm run lint
npm run typecheck
npm run test
```

### Verification Checklist

- [ ] Admin shell renders desktop-first without public navbar/footer; usable at 768px
- [ ] Unauthenticated → `/login?redirect=/admin`; guest-role user → redirected; Content Manager sees read-only bookings with no action buttons, and every booking mutation returns 403
- [ ] Bookings table filters by status, channel, payment status, date range, and resort, and searches by reference, name, and email
- [ ] Check-In requires unit assignment and marks units occupied; Check-Out releases them; No-Show respects the 24-hour rule
- [ ] `PUT /status` with `cancelled` or `pending → confirmed` is rejected
- [ ] Bank-transfer offline payment confirms a pending booking and emails the confirmation; an expired hold returns 409; a duplicate reference is rejected
- [ ] Admin booking with `bank_transfer` creates a Confirmed `walk_in` booking with the real transfer reference
- [ ] Admin cancellation of a bank-transfer booking makes **no Paystack call**, sets `refund_pending`, and appears under "Refunds to process"; marking it processed sets `refunded` / `partially_refunded` and emails the guest; marking it failed sets `refund_failed`
- [ ] Refund override requires a reason and is audit-logged
- [ ] Paystack `refund.failed` webhook → `refund_failed`; "Refund manually instead" works after a Paystack rejection
- [ ] Status timeline shows webhook and cron transitions ("System") as well as admin actions
- [ ] Room unit status persists; `occupied` cannot be set manually
- [ ] RoomType `under_construction` → `available` sends Notify-Me emails exactly once; failures land in `failed_emails`
- [ ] Admin session expires after 30 minutes of inactivity

### STOP & COMMIT

```powershell
git add supabase/migrations/0009_admin_operations.sql src/types/db.ts src/proxy.ts src/lib/auth src/pages/admin src/components/admin src/pages/api/v1/bookings src/pages/api/v1/payments src/pages/api/v1/rooms src/services/notify-me src/services/email/templates.ts scripts/create-admin-user.ts
git commit -m "feat: admin shell, RBAC guards, bookings operations, offline payments and manual refunds, room status"
```

---

## 12B. Admin Dashboard and Analytics

**Milestone:** M3 · **Estimated Effort:** 4–5 days · **Branch:** `feature/gar-m3-admin-ops` · **PR:** Step 12B PR merged to `main`

### Step Checklist

- [ ] Analytics endpoints (`/api/v1/analytics/bookings`, `/revenue`, `/occupancy`) are **Resort Admin+** (SRS §7)
- [ ] `GET /api/v1/admin/summary` (all staff roles; plan addition): non-financial KPIs, unread counts, activity feed, bell counts. The Content Manager dashboard uses only this endpoint and never receives revenue fields
- [ ] Metric cards (SRS 3.14.2): bookings (today / week / month), revenue (today / week / month; Resort Admin+), occupancy (today), pending bookings, unread contact submissions (`new`), unread event inquiries (`new`)
- [ ] Recharts bookings chart: count and revenue over the last 30 days
- [ ] Occupancy heatmap: current and next month
- [ ] SRS 4.6 metrics: average stay duration, deal redemptions, revenue by room type, contact submissions by status/subject, newsletter total and growth. **Page Views (GA) deferred to Step 15** (GA4 Data API)
- [ ] Metric definitions:
  - Revenue = successful payments by `paid_at` (all gateways, including `bank_transfer`, `cash`, `pos`) minus processed refunds by `refunded_at`, with a breakdown by gateway
  - Bookings counted by `created_at`, excluding `payment_timeout` cancellations (shown as "expired holds")
  - Occupancy = confirmed + checked-in units / bookable units per night, excluding `under_construction` room types and `maintenance` units
  - All buckets in WAT
- [ ] Activity feed: last 10 events from `booking_status_history`, admin `audit_logs`, contact submissions, event inquiries
- [ ] Notification bell: new bookings, new contact submissions, new event inquiries, refunds to process
- [ ] Quick actions: "Create Booking" → `/admin/bookings/new`; "Add Deal" and "Upload Media" disabled ("Coming Soon", Step 15)
- [ ] Optional (not SRS): average daily rate and revenue by campus, only if time permits
- [ ] Analytics queries implemented as SQL views/RPCs; p95 < 300 ms at seed volume

### Explicit File Paths

- [ ] src/pages/admin/index.tsx
- [ ] src/components/admin/dashboard/MetricCard.tsx
- [ ] src/components/admin/dashboard/BookingsRevenueChart.tsx
- [ ] src/components/admin/dashboard/OccupancyHeatmap.tsx
- [ ] src/components/admin/dashboard/ActivityFeed.tsx
- [ ] src/components/admin/dashboard/QuickActions.tsx
- [ ] src/pages/api/v1/analytics/bookings.ts
- [ ] src/pages/api/v1/analytics/revenue.ts
- [ ] src/pages/api/v1/analytics/occupancy.ts
- [ ] src/pages/api/v1/admin/summary.ts

### Commands

```powershell
npm install recharts
npm run dev
npm run lint
npm run test
```

### Verification Checklist

- [ ] Content Manager gets 403 on all analytics endpoints and sees no revenue cards; `/admin/summary` returns no financial fields for that role
- [ ] Resort Admin and Super Admin see revenue cards, the 30-day chart, and the heatmap
- [ ] Revenue includes offline payments and nets out processed refunds
- [ ] Expired holds are excluded from booking and cancellation counts
- [ ] Occupancy excludes under-construction room types and maintenance units
- [ ] Activity feed and bell show bookings, contact submissions, inquiries, and refunds to process

### STOP & COMMIT

```powershell
git add src/pages/admin/index.tsx src/components/admin/dashboard src/pages/api/v1/analytics src/pages/api/v1/admin/summary.ts
git commit -m "feat: admin dashboard KPIs, analytics endpoints, activity feed"
```

---

## 13. Observability, SEO Finalization, Background Job Scheduling, and Operational Hardening

**Milestone:** M3 · **Estimated Effort:** 4–5 days · **Branch:** `feature/gar-m3-admin-ops` · **PR:** Step 13 PR merged to `main`

> **Actual job state (M3 audit):** `expire_stale_pending_bookings` (every 5 min) and `deactivate_expired_deals` (daily) are SQL functions scheduled by pg_cron in 0006/0007. **Failed email retry is not scheduled anywhere:** 0006 only unschedules `retry-failed-emails`, and the logic lives in `src/pages/api/v1/internal/jobs/retry-failed-emails.ts`, which needs `CRON_SECRET` and an external caller. There are no Supabase Edge Functions. Notify-Me is event-driven (Step 12A).

### Step Checklist

- [ ] Dynamic `sitemap.xml`: public pages only; excludes `/booking`, auth pages, `/account`, `/manage-booking`, `/admin`
- [ ] `robots.txt`: disallow `/admin`, `/api`, `/account`, `/booking`, `/manage-booking`
- [ ] `noindex` on auth, account, and manage-booking pages (none found on `/account` or `/manage-booking`)
- [ ] Complete JSON-LD across page types (SRS 4.6); add `og:url` alongside the canonical URL
- [ ] Sentry client and server via `instrumentation.ts` (read `node_modules/next/dist/docs/02-pages/02-guides/instrumentation.md` first)
  - `beforeSend` / `beforeBreadcrumb` scrub email, phone, names, auth headers, and the `t` query parameter (booking access token)
  - No session replay
- [ ] Sentry alert rules (thresholds documented in the runbook): error-rate spike, API p95 > 300 ms, webhook failures, job failures, new `refund_failed`
- [ ] GA4: strip `t` from `page_location` before `page_view`
- [ ] **Schedule failed-email retry every 10 minutes** in `0010_job_schedules.sql`:
  - pg_cron + pg_net POST to `/api/v1/internal/jobs/retry-failed-emails` with `Authorization: Bearer <CRON_SECRET from Supabase Vault>`
  - Alternative: `vercel.json` cron, which needs Vercel Pro because Hobby crons run at most daily
  - Set `CRON_SECRET` in Vercel
- [ ] Persistent email failure (3 attempts exhausted) → staff alert email + Sentry event (SRS 8.4)
- [ ] Daily purge of expired `booking_access` tokens (30 days after check-out; SRS v1.3)
- [ ] Verify `expire_stale_pending_bookings`: per-booking hold, including the 2-hour gateway-downtime window (SRS 8.1), and `cancellation_reason = 'payment_timeout'` after 0009
- [ ] Verify `deactivate_expired_deals` sets `is_active = false` for deals past `end_date`
- [ ] Set `jwt_expiry = 900` in `supabase/config.toml` (SRS 4.1: 15 minutes; currently 3600); re-test refresh, "Remember me", and the admin idle timeout
- [ ] `GET /api/v1/health` and an uptime monitor on `/` and `/api/v1/health` (SRS 5.4)
- [ ] Confirm Supabase daily backups (30-day retention) and point-in-time recovery are enabled (SRS 5.4)
- [ ] `npm audit`, gitleaks secret scan, headers check (CSP, HSTS, Referrer-Policy)
- [ ] `docs/operations/runbook.md`: alert thresholds, job monitoring, rollback, common failure modes, **offline-payment and manual-refund SOP** (who may record, required references, daily bank reconciliation)

### Explicit File Paths

- [ ] src/pages/sitemap.xml.ts
- [ ] src/pages/robots.txt.ts
- [ ] src/lib/seo/structured-data/* (or additions to existing `src/lib/seo/meta.ts`)
- [ ] instrumentation.ts (+ Sentry client config)
- [ ] src/lib/monitoring/sentry.ts
- [ ] src/pages/api/v1/health.ts
- [ ] supabase/migrations/0010_job_schedules.sql
- [ ] supabase/config.toml
- [ ] docs/operations/runbook.md

### Commands

```powershell
npm install @sentry/nextjs
npm run lint
npm run test
npm run dev
npx supabase db reset
# Inspect pg_cron schedule and runs:
# SELECT jobname, schedule FROM cron.job;
# SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
```

### Verification Checklist

- [ ] `sitemap.xml` lists all public routes and excludes private ones (`/admin`, `/account`, `/booking`, `/manage-booking`, auth pages)
- [ ] `robots.txt` disallows `/admin`, `/api`, `/account`, `/booking`, `/manage-booking`
- [ ] `cron.job` contains `expire-pending-bookings`, `deactivate-expired-deals`, `retry-failed-emails`, `purge-booking-access-tokens`
- [ ] Retry route rejects a missing or invalid secret; a queued failed email is retried with backoff up to 3 attempts; exhaustion alerts staff
- [ ] Expired pending bookings release inventory and record `payment_timeout`
- [ ] Expired deals automatically set `is_active = false`
- [ ] Sentry captures client and server errors with tracing; events contain no email, phone, or `t` token
- [ ] Access tokens expire after 15 minutes and refresh works
- [ ] Uptime monitor is green; backups and point-in-time recovery confirmed

### STOP & COMMIT

```powershell
git add src/pages/sitemap.xml.ts src/pages/robots.txt.ts src/lib/seo src/lib/monitoring instrumentation.ts src/pages/api/v1/health.ts supabase/migrations/0010_job_schedules.sql supabase/config.toml docs/operations/runbook.md
git commit -m "feat: observability, SEO completion, job scheduling, auth and reliability hardening"
```

---

## 14. End-to-End Quality Gate, Documentation, and Release Readiness

**Milestone:** M3 · **Estimated Effort:** 4–6 days · **Branch:** `feature/gar-m3-admin-ops` · **PR:** Step 14 PR merged to `main` — **Completes Milestone 3 & Core Scope**

### Step Checklist

- [ ] Install `@playwright/test`, `@axe-core/playwright`, `@lhci/cli`; add the `test:e2e`, `test:a11y`, and `lhci` scripts (none exist today)
- [ ] GitHub Actions CI on PRs to `main`/`develop` and pushes to `develop`/`main`: lint, Prettier check, typecheck, `test:coverage`, build, e2e smoke, axe, Lighthouse CI. Nightly full regression
- [ ] Coverage thresholds in `vitest.config.ts`: ≥ 70% for `src/pages/api/**`, `src/domain/**`, `src/services/**` (SRS 5.5). CI runs `test:coverage` so the thresholds are enforced
- [ ] OpenAPI generated from the Zod schemas and served at `/api/docs` in development only (SRS 2.7.4 / 5.5)
- [ ] Document test strategy (`docs/testing/strategy.md`) and release checklist (`docs/release/checklist.md`)
- [ ] Manual accessibility audit checklist (`docs/accessibility/manual-audit-checklist.md`), covering NVDA/VoiceOver, contrast, and focus management, **and complete the audit** before launch
- [ ] **Run** a k6 load test at 500 concurrent virtual users on staging; record API p95 (< 300 ms)
- [ ] Core Web Vitals (SRS 5.1):
  - Lighthouse CI asserts LCP < 2.5 s (4G), CLS < 0.1, TTFB < 600 ms
  - FID was retired by Chrome in 2024 and cannot be measured in the lab: monitor INP < 200 ms from field data (`web-vitals` / Vercel Speed Insights) and assert TBT < 200 ms in the lab (SRS v1.4 §5.1)
- [ ] i18n readiness audit, including the new admin strings
- [ ] Privilege-escalation and IDOR regression tests for every M3 admin endpoint
- [ ] Release checklist covers:
  - reCAPTCHA v3 on booking creation (SRS v1.3, before production launch)
  - branch protection on `main`
  - `CRON_SECRET`, Sentry DSN, GA4
  - Paystack live keys
  - admin accounts bootstrapped
  - offline-payment SOP signed off
  - SRS deferrals (Step 15, GA page views, SMS)

### Explicit File Paths

- [ ] vitest.config.ts
- [ ] playwright.config.ts
- [ ] src/**/\_\_tests\_\_/** (existing co-located unit/integration convention)
- [ ] e2e/**/*.spec.ts
- [ ] e2e/accessibility/**/*.spec.ts
- [ ] lighthouserc.json
- [ ] load/k6-booking.js
- [ ] .github/workflows/ci.yml
- [ ] docs/testing/strategy.md
- [ ] docs/api/openapi (generated)
- [ ] docs/release/checklist.md
- [ ] docs/accessibility/manual-audit-checklist.md

### Critical Code Block: CI workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]
  schedule:
    - cron: "0 2 * * *" # nightly full regression

jobs:
  build-test:
    runs-on: ubuntu-latest
    timeout-minutes: 40
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format Check
        run: npm run format:check

      - name: Typecheck
        run: npm run typecheck

      - name: Unit + Integration (coverage thresholds enforced)
        run: npm run test:coverage

      - name: Build
        run: npm run build

      - uses: supabase/setup-cli@v1

      - name: Start local Supabase
        run: npx supabase start

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: E2E smoke
        if: github.event_name != 'schedule'
        run: npm run test:e2e -- --grep @smoke

      - name: E2E full regression (nightly)
        if: github.event_name == 'schedule'
        run: npm run test:e2e

      - name: Accessibility (axe-core)
        run: npm run test:a11y

      - name: Lighthouse CI
        run: npm run lhci
```

### Commands

```powershell
npm install -D @playwright/test @axe-core/playwright @lhci/cli
npm run ci
npm run test:e2e -- --grep @smoke
npm run test:a11y
npm run lhci
k6 run load/k6-booking.js
```

### Verification Checklist

- [ ] CI passes on `develop` and `main`, and the nightly run is green
- [ ] Coverage ≥ 70% on backend business logic, enforced by CI
- [ ] Critical guest journeys and admin journeys (booking management, offline payment, manual refund) pass in Playwright
- [ ] Automated axe-core checks pass on public and admin pages
- [ ] Lighthouse CI meets LCP, CLS, and TTFB; field INP is monitored
- [ ] k6 at 500 virtual users meets API p95 < 300 ms
- [ ] Manual accessibility audit completed and findings resolved or logged
- [ ] M3 exit criteria satisfied; core implementation ready for production deployment

### STOP & COMMIT

```powershell
git add vitest.config.ts playwright.config.ts e2e load lighthouserc.json .github/workflows/ci.yml package.json package-lock.json docs/testing docs/api docs/release docs/accessibility
git commit -m "chore: test matrix, CI gates, load test, docs, performance and accessibility gates"
```

---

## 15. Follow-up PR Plan - Admin CRUD Breadth (Deferred to Phase 2)

### Status

- [ ] Deferred intentionally to keep core delivery milestones reviewable and minimize risk
- [ ] Already delivered in M3 (Step 12A): Bookings Management, admin-initiated booking UI, offline payments and manual refunds, room-type status toggle, unit status, Notify-Me batch emails
- [ ] Full CRUD breadth for CMS content, room types, seasonal pricing, media uploads, super-admin modules, and the GA4 Page Views dashboard metric will be implemented on branch `feature/gar-admin-crud-phase-2`

### Explicit Deferred File Paths

- [ ] src/pages/admin/rooms/new.tsx, [id]/*.tsx (seasonal pricing, full room type CRUD)
- [ ] src/pages/admin/content/*.tsx
- [ ] src/pages/admin/restaurants/*.tsx
- [ ] src/pages/admin/facilities/*.tsx
- [ ] src/pages/admin/gems/*.tsx
- [ ] src/pages/admin/events/*.tsx
- [ ] src/pages/admin/deals/*.tsx
- [ ] src/pages/admin/contact/*.tsx
- [ ] src/pages/admin/newsletter/*.tsx
- [ ] src/pages/admin/media/*.tsx
- [ ] src/pages/admin/users/*.tsx (replaces `scripts/create-admin-user.ts`)
- [ ] src/pages/admin/settings/*.tsx
- [ ] src/pages/api/v1/admin/settings.ts
- [ ] src/pages/api/v1/admin/users/*.ts
- [ ] src/pages/api/v1/media/*.ts (admin write & upload operations with MIME/size validation)
- [ ] src/pages/api/v1/events/inquiries/*.ts

### Commands

```powershell
git checkout -b feature/gar-admin-crud-phase-2
```

### Verification Checklist

- [ ] Release checklist and PR documentation explicitly record Step 15 deferred scope
- [ ] No incomplete CRUD modules merged into core delivery milestones
- [ ] Resort staff instructed on using Supabase Dashboard for temporary direct content edits if needed

### STOP & COMMIT

```powershell
git add docs/release/checklist.md plans/gar-srs-implementation/implementation.md
git commit -m "docs: mark admin CRUD breadth as deferred to phase-2 branch"
```

---

## Step Sequencing & Commit Log Summary

1. `chore: foundation, dependencies, env contract, shared libs, i18n, email service, formatters` (M1 · Step 1) — **[COMPLETED]**
2. `feat: global shell, consent, accessibility baseline, page transitions` (M1 · Step 5) — **[COMPLETED]**
3. `feat: public content pages, supporting APIs, amenities endpoint, media endpoint, newsletter double opt-in, lightbox` (M1 · Step 6) — **[COMPLETED]**
4. `feat: rooms catalog, buildings endpoint, notify-me` (M1 · Step 7 — **M1 Complete**) — **[COMPLETED]**
5. `feat: database schema, migrations, seeds, RLS, storage buckets, pg_cron setup` (M2 · Step 2)
6. `feat: API middleware stack, auth context, security primitives` (M2 · Step 3)
7. `feat: auth pages, auth endpoints, change-password endpoint` (M2 · Step 4)
8. `feat: booking domain APIs, pricing logic with deal partial-applicability, no-show, admin booking API` (M2 · Step 8)
9. `feat: payment integration, secure webhook, refund API, gateway degradation, race handling` (M2 · Step 9)
10. `feat: booking wizard frontend, confirmation UX, payment fallback UI` (M2 · Step 10)
11. `feat: guest account, booking management, change password UI` (M2 · Step 11 — **M2 Complete**)
12. `feat: admin shell, RBAC guards, bookings operations, offline payments and manual refunds, room status` (M3 · Step 12A)
13. `feat: admin dashboard KPIs, analytics endpoints, activity feed` (M3 · Step 12B)
14. `feat: observability, SEO completion, job scheduling, auth and reliability hardening` (M3 · Step 13)
15. `chore: test matrix, CI gates, load test, docs, performance and accessibility gates` (M3 · Step 14 — **M3 Complete**)
16. `docs: follow-up PR plan for full admin CRUD breadth` (Phase 2 · Step 15)
