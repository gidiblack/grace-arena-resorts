# Grace Arena Resorts SRS v1.2 Implementation Runbook

## Title

Grace Arena Resorts SRS v1.2 Full-Stack Implementation Runbook

## Goal

Implement the authoritative requirements in `docs/GAR-SRS.md` based on `plans/gar-srs-implementation/plan-v1.2-corrected.md` across **three shippable delivery milestones** and commit-sized, testable steps for Next.js 16 Pages Router and TypeScript. This runbook provides deterministic execution steps, concrete CLI commands, explicit file paths, and hard verification gates.

## Delivery Branches & Milestones

- `feature/gar-m1-marketing-site` — **Milestone 1: Marketing Site** (Steps 1, 5, 6, 7)
- `feature/gar-m2-booking-engine` — **Milestone 2: Booking Engine** (Steps 2, 3, 4, 8, 9, 10, 11)
- `feature/gar-m3-admin-ops` — **Milestone 3: Admin & Operations** (Steps 12, 13, 14)
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

### Milestone 2: Booking Engine (Target: 6–10 weeks after M1 · 31–42 dev-days)

**Delivers:** Full guest booking flow with payment, accounts, and room management.

| Step    | Scope                                                                           | Estimated Effort   |
| ------- | ------------------------------------------------------------------------------- | ------------------ |
| Step 2  | Supabase schema, migrations, seeds, RLS, storage, pg_cron                       | 3–5 days           |
| Step 3  | API middleware stack, auth context, security                                    | 2–3 days           |
| Step 4  | Auth pages and endpoints (register, login, verify, reset, change password)      | 4–5 days           |
| Step 8  | Booking engine backend (availability, pricing, lifecycle, admin booking API)    | 8–10 days          |
| Step 9  | Payment integration, Paystack webhook security, refunds, downtime fallback      | 4–6 days           |
| Step 10 | Booking wizard frontend (4-step, responsive summary, confirmation)              | 6–8 days           |
| Step 11 | Guest account and booking management (bookings list, cancel, receipts, profile) | 4–5 days           |
|         | **M2 subtotal**                                                                 | **31–42 dev-days** |

**Exit Criteria:**

- Guests can register, log in, browse rooms, and complete a booking with Paystack payment
- Booking confirmation PDF generated and emailed
- Guest account shows booking history with cancellation and refund flows
- All auth flows working (register, verify, login, reset, change password)
- Payment webhook security verified in Paystack sandbox

### Milestone 3: Admin & Operations (Target: 3–5 weeks after M2 · 11–17 dev-days)

**Delivers:** Admin dashboard, bookings management, operational tooling, quality gates.

| Step    | Scope                                                                           | Estimated Effort   |
| ------- | ------------------------------------------------------------------------------- | ------------------ |
| Step 12 | Admin portal foundation, RBAC, dashboard KPIs, bookings management, room status | 5–7 days           |
| Step 13 | Observability (Sentry), SEO finalization, background jobs, runbook              | 3–5 days           |
| Step 14 | Quality gate, CI/CD, documentation, CWV, manual a11y audit checklist            | 3–5 days           |
|         | **M3 subtotal**                                                                 | **11–17 dev-days** |

**Exit Criteria:**

- Admin dashboard with KPIs and bookings chart
- Admin bookings management with status transitions, cancellation, refund processing
- Background jobs running (pending booking expiry, failed email retry, deal deactivation)
- Sentry monitoring integrated
- CI pipeline passing (lint, format, typecheck, test, build, e2e smoke)
- Core Web Vitals targets met

### Total Estimated Effort: 58–83 dev-days

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
- **Before M3 Launch (Data Day 3):** Sentry DSN configured, GA4 measurement ID verified, alerting thresholds set, background job schedules confirmed.

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

## 2. Supabase Schema, Migrations, Seed Data, and RLS Baseline

**Milestone:** M2 · **Estimated Effort:** 3–5 days · **Branch:** `feature/gar-m2-booking-engine` · **PR:** Step 2 PR merged to `main`

### Step Checklist

- [ ] Initialize Supabase project config
- [ ] Implement schema migrations 0001–0006 exactly per SRS and corrected plan:
  - `0001_init_schema.sql` (all core entities, enums, indexes, constraints, `FailedEmail` table)
  - `0002_rls_policies.sql` (RLS policies by role matrix)
  - `0003_functions_triggers.sql` (availability, pricing, booking reference generator)
  - `0004_seed_reference_data.sql` (campuses, rooms, menus, facilities, baseline settings)
  - `0005_storage_buckets.sql` (`media-public` and `confirmations` buckets + policies)
  - `0006_pg_cron_setup.sql` (pg_cron extension + schedules)
- [ ] Implement dual amenity model:
  1. `RoomType.amenities` JSON array for in-room/conditional display
  2. `Amenity` entity + `RoomTypeAmenity` junction table for resort-level amenities on Home
- [ ] Ensure resort campuses are data-driven records in `Resort` entity (not hard-coded)
- [ ] Enable pg_cron and register foundational schedules (booking expiry, email retry, deal deactivation)
- [ ] Generate `src/types/db.ts` from database schema
- [ ] Create deterministic seed data for demo/QA

### Explicit File Paths

- [ ] supabase/config.toml
- [ ] supabase/migrations/0001_init_schema.sql
- [ ] supabase/migrations/0002_rls_policies.sql
- [ ] supabase/migrations/0003_functions_triggers.sql
- [ ] supabase/migrations/0004_seed_reference_data.sql
- [ ] supabase/migrations/0005_storage_buckets.sql
- [ ] supabase/migrations/0006_pg_cron_setup.sql
- [ ] supabase/seed.sql
- [ ] src/types/db.ts

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

- [ ] `npx supabase db reset` completes cleanly
- [ ] All required tables, enums, indexes, constraints exist
- [ ] RLS denies guest read/write on admin-only datasets
- [ ] Dual amenity model verified: RoomType.amenities JSON and Amenity junction both queryable
- [ ] Buckets `media-public` and `confirmations` exist with correct policies
- [ ] pg_cron extension enabled with required schedules

### STOP & COMMIT

```powershell
git add supabase src/types/db.ts
git commit -m "feat: schema, migrations, seeds, RLS, storage buckets, pg_cron setup"
```

---

## 3. API Core, Auth Session Handling, Rate Limiting, and Middleware

**Milestone:** M2 · **Estimated Effort:** 2–3 days · **Branch:** `feature/gar-m2-booking-engine` · **PR:** Step 3 PR merged to `main`

### Step Checklist

- [ ] Build composable API handler pipeline with method guards and schema validation
- [ ] Add auth session extraction and role claim parsing for Supabase auth
- [ ] Add Vercel KV rate limiting adapter with in-memory local development fallback
- [ ] Add reCAPTCHA verifier with minimum score 0.5 threshold
- [ ] Add CSRF and security header middleware (HSTS, CSP, SameSite cookies)
- [ ] Add pagination helper with `?page=1&limit=20` and `X-Total-Count`, `X-Total-Pages` headers

### Explicit File Paths

- [ ] src/pages/api/v1/_shared/handler.ts
- [ ] src/pages/api/v1/_shared/auth.ts
- [ ] src/pages/api/v1/_shared/rate-limit.ts
- [ ] src/pages/api/v1/_shared/recaptcha.ts
- [ ] src/pages/api/v1/_shared/pagination.ts
- [ ] src/pages/api/v1/_shared/audit-log.ts
- [ ] src/lib/supabase/server.ts
- [ ] src/lib/supabase/client.ts
- [ ] src/lib/security/csrf.ts
- [ ] src/lib/security/headers.ts

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

- [ ] Wrapper enforces method guards and schema validation
- [ ] Role guard blocks unauthorized roles
- [ ] Rate limiter throttles auth/contact/events/newsletter/notify endpoints
- [ ] CSRF middleware rejects invalid mutating requests
- [ ] Security headers include HSTS and CSP
- [ ] Pagination headers present on paginated list endpoints

### STOP & COMMIT

```powershell
git add src/pages/api/v1/_shared src/lib/supabase src/lib/security
git commit -m "feat: API middleware stack, auth context, security primitives"
```

---

## 4. Authentication and User Profile Vertical Slice

**Milestone:** M2 · **Estimated Effort:** 4–5 days · **Branch:** `feature/gar-m2-booking-engine` · **PR:** Step 4 PR merged to `main`

### Step Checklist

- [ ] Build auth pages (`/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`)
- [ ] Implement email verification interstitial page (`/verify-email`) with resend link
- [ ] Implement login `?redirect={url}` query parameter support
- [ ] Implement all auth API endpoints including authenticated password change (`PUT /api/v1/auth/me/password`)
- [ ] Enforce password policy: minimum 8 chars, 1 uppercase, 1 lowercase, 1 digit
- [ ] Implement login lockout: reCAPTCHA after 3 failures, account lock for 15 minutes after 5 failures
- [ ] Add resend verification rate limit (max 1 per 60 seconds per email)
- [ ] Enforce NDPR consent checkbox on registration linking to `/privacy`
- [ ] Configure Supabase Auth bcrypt cost factor ≥ 12
- [ ] Exclude social login from v1.0 (email/password only)

### Explicit File Paths

- [ ] src/pages/register.tsx
- [ ] src/pages/login.tsx
- [ ] src/pages/forgot-password.tsx
- [ ] src/pages/reset-password.tsx
- [ ] src/pages/verify-email.tsx
- [ ] src/pages/api/v1/auth/register.ts
- [ ] src/pages/api/v1/auth/login.ts
- [ ] src/pages/api/v1/auth/refresh.ts
- [ ] src/pages/api/v1/auth/logout.ts
- [ ] src/pages/api/v1/auth/forgot-password.ts
- [ ] src/pages/api/v1/auth/reset-password.ts
- [ ] src/pages/api/v1/auth/me.ts
- [ ] src/pages/api/v1/auth/me/password.ts
- [ ] src/pages/api/v1/auth/resend-verification.ts
- [ ] src/features/auth/schemas.ts
- [ ] src/features/auth/components/*

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

- [ ] Register flow creates account and sends verification email via SendGrid
- [ ] `/verify-email` page displays expected interstitial and resend action
- [ ] Login supports `?redirect=` and returns user to target route
- [ ] Account locks after 5 failed attempts for 15 minutes; reCAPTCHA enforced after 3
- [ ] `PUT /api/v1/auth/me/password` validates current password and updates hash
- [ ] Resend verification rate limit enforced (1 per 60s)

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

## 8. Booking Engine Backend (Availability, Pricing, Lifecycle)

**Milestone:** M2 · **Estimated Effort:** 8–10 days · **Branch:** `feature/gar-m2-booking-engine` · **PR:** Step 8 PR merged to `main`

### Step Checklist

- [ ] Implement availability checks and calendar availability endpoint (`/api/v1/availability/calendar`)
- [ ] Implement full pricing engine per SRS 4.3:
  - Check SeasonalPrice records per night (latest takes precedence if overlapping), fallback to basePrice
  - Formula: `SUM(applicable_nightly_rate × quantity)` = subtotal
  - Tax = `subtotal × tax_rate` (default 7.5% VAT)
  - Percentage deal discount: applied ONLY to subtotal of applicable room types
  - Fixed deal discount: subtracted from full subtotal
  - Total = `subtotal − deal_discount + tax`
- [ ] Implement booking reference generator: alphanumeric, 8 characters, prefixed with `GAR-`
- [ ] Implement transactional concurrency controls (`SELECT ... FOR UPDATE` on room units)
- [ ] Implement booking lifecycle state machine (Pending -> Confirmed -> Checked-In -> Checked-Out; Pending -> Cancelled; Confirmed -> Cancelled; Confirmed -> No-Show)
- [ ] Implement no-show policy guard: admin can mark No-Show only starting 24h after scheduled check-in time (14:00 on check-in date); no refund for no-shows
- [ ] Implement admin-initiated booking API path: creates Confirmed bookings with null `userId` and cash/POS payment metadata
- [ ] Implement cancellation refund rules: >=72h full refund, 24–72h 50%, <24h no refund
- [ ] Automatically trigger booking confirmation email with attached PDF on status change to Confirmed

### Explicit File Paths

- [ ] src/pages/api/v1/availability/index.ts
- [ ] src/pages/api/v1/availability/calendar.ts
- [ ] src/pages/api/v1/bookings/index.ts
- [ ] src/pages/api/v1/bookings/[ref].ts
- [ ] src/pages/api/v1/bookings/[ref]/cancel.ts
- [ ] src/pages/api/v1/bookings/[ref]/status.ts
- [ ] src/pages/api/v1/bookings/[ref]/confirmation.ts
- [ ] src/pages/api/v1/bookings/[ref]/pdf.ts
- [ ] src/pages/api/v1/deals/validate/[code].ts
- [ ] src/domain/booking/*
- [ ] src/domain/booking/state-machine.ts
- [ ] src/services/pricing/*

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

- [ ] Pricing formula produces correct deterministic totals for seasonal and multi-room bookings
- [ ] Deal percentage discount applies only to applicable room subset
- [ ] Deal fixed discount subtracts from full subtotal
- [ ] Concurrent bookings for the last available unit do not double-book
- [ ] No-show transition rejected before 24h post check-in time
- [ ] Admin booking endpoint accepts cash/POS and sets status=confirmed directly
- [ ] Confirmation email sent with generated PDF attachment

### STOP & COMMIT

```powershell
git add src/pages/api/v1/availability src/pages/api/v1/bookings src/pages/api/v1/deals/validate src/domain/booking src/services/pricing
git commit -m "feat: booking APIs, pricing engine, state machine, no-show, admin booking API"
```

---

## 9. Payment Integration and Webhook Security

**Milestone:** M2 · **Estimated Effort:** 4–6 days · **Branch:** `feature/gar-m2-booking-engine` · **PR:** Step 9 PR merged to `main`

### Step Checklist

- [ ] Implement Paystack payment initiation and verification
- [ ] Implement Paystack webhook endpoint with raw-body HMAC-SHA512 verification (`bodyParser: false`)
- [ ] Add idempotency and replay protection for webhook processing
- [ ] Implement Paystack Refunds API integration (`src/services/payments/refund.ts`) supporting full and partial refunds
- [ ] Handle refund webhook completion events and send refund notification emails (initiation + completion)
- [ ] Handle expired pending booking race condition: if payment succeeds for an expired booking, auto-trigger full refund and notify guest
- [ ] Implement gateway downtime graceful degradation: display WhatsApp fallback message and extend booking hold window to 2 hours (instead of 30 mins)

### Explicit File Paths

- [ ] src/pages/api/v1/payments/initiate.ts
- [ ] src/pages/api/v1/payments/verify.ts
- [ ] src/pages/api/v1/payments/webhook.ts
- [ ] src/pages/api/v1/payments/[id].ts
- [ ] src/services/payments/paystack.ts
- [ ] src/services/payments/signature.ts
- [ ] src/services/payments/refund.ts
- [ ] src/domain/payment/*

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

- [ ] Webhook rejects tampered signatures with 401 Unauthorized
- [ ] `bodyParser: false` set on webhook route
- [ ] Expired pending booking with late payment triggers automatic refund via Paystack Refunds API
- [ ] Refund webhook updates Payment status to `refunded` or `partially_refunded`
- [ ] Gateway downtime activates WhatsApp booking CTA and extends inventory hold to 2 hours

### STOP & COMMIT

```powershell
git add src/pages/api/v1/payments src/services/payments src/domain/payment
git commit -m "feat: payment integration, secure webhook, refunds, race handling, downtime fallback"
```

---

## 10. Booking Wizard Frontend and Confirmation Experience

**Milestone:** M2 · **Estimated Effort:** 6–8 days · **Branch:** `feature/gar-m2-booking-engine` · **PR:** Step 10 PR merged to `main`

### Step Checklist

- [ ] Implement 4-step booking wizard (`src/pages/booking.tsx`):
  - Step 1: Dates (past blocked, 1–30 nights) and guests (adults 1–10, children 0–10)
  - Step 2: Room selection with campus/tier filter, per-night seasonal rates, multi-room support (under-construction rooms excluded)
  - Step 3: Guest details form with +234 phone validation, special requests (max 500 chars)
  - Step 4: Summary with per-section Edit links and Paystack inline checkout
- [ ] Implement query preselection: `?room={id}` preselects room in Step 2; `?deal={code}` auto-applies discount, filters rooms, displays banner
- [ ] Implement responsive booking summary: sticky sidebar on desktop, bottom sheet on mobile
- [ ] Implement confirmation screen with booking reference, PDF download, resend email, WhatsApp CTA, and account link
- [ ] Implement payment gateway downtime fallback UI ("Online payment temporarily unavailable. Please contact us on WhatsApp")

### Explicit File Paths

- [ ] src/pages/booking.tsx
- [ ] src/features/booking/context/BookingWizardContext.tsx
- [ ] src/features/booking/components/*
- [ ] src/features/booking/schemas.ts
- [ ] src/features/booking/hooks/*

### Commands

```powershell
npm run dev
npm run lint
npm run test
```

### Verification Checklist

- [ ] Step indicator shows "Step X of 4" across mobile and desktop
- [ ] Query preselection works for `?room=` and `?deal=`
- [ ] Nigerian phone number validation (+234 format) strictly enforced
- [ ] Under-construction rooms are never selectable in wizard
- [ ] Confirmation screen renders reference number, PDF download, and WhatsApp CTA
- [ ] Gateway outage correctly displays fallback messaging

### STOP & COMMIT

```powershell
git add src/pages/booking.tsx src/features/booking
git commit -m "feat: booking wizard UI, confirmation UX, payment fallback handling"
```

---

## 11. Guest Account and Booking Management

**Milestone:** M2 · **Estimated Effort:** 4–5 days · **Branch:** `feature/gar-m2-booking-engine` · **PR:** Step 11 PR merged to `main` — **Completes Milestone 2**

### Step Checklist

- [ ] Build authenticated guest account pages (`/account`, `/account/bookings`, `/account/profile`) with unauthenticated redirect to `/login?redirect=/account`
- [ ] Implement booking list with color-coded status badges: Confirmed (green), Pending (yellow), Cancelled (red), Checked-In (blue), Checked-Out (grey)
- [ ] Implement actions per booking state:
  - Pending: "Complete Payment", "Cancel Booking"
  - Confirmed: "Cancel Booking", "Download Confirmation (PDF)", "Resend Confirmation Email", "Contact Us on WhatsApp"
  - Cancelled: "Refund Status" (shows amount and 5–10 day timeline)
  - Checked-Out: "Download Receipt (PDF)" (shows payment method & settlement details)
- [ ] Implement cancellation modal with server-side refund calculation preview
- [ ] Implement Profile Settings: edit name and phone, read-only email with change notice, and Change Password section calling `PUT /api/v1/auth/me/password`

### Explicit File Paths

- [ ] src/pages/account/index.tsx
- [ ] src/pages/account/bookings.tsx
- [ ] src/pages/account/profile.tsx
- [ ] src/features/account/*
- [ ] src/pages/api/v1/bookings/index.ts
- [ ] src/pages/api/v1/auth/me.ts
- [ ] src/pages/api/v1/auth/me/password.ts

### Commands

```powershell
npm run test
npm run lint
npm run typecheck
```

### Verification Checklist

- [ ] Unauthenticated requests redirect to `/login?redirect=/account`
- [ ] Status badges match required color specifications
- [ ] Cancellation modal shows preview of refund amount (100% / 50% / 0%) before confirmation
- [ ] Profile change password validates current password and updates via API
- [ ] RLS prevents users from viewing other guests' bookings
- [ ] M2 Exit Criteria verified: full booking lifecycle, Paystack sandbox payment, PDF confirmation, guest account management working

### STOP & COMMIT

```powershell
git add src/pages/account src/features/account src/pages/api/v1/bookings/index.ts src/pages/api/v1/auth/me.ts src/pages/api/v1/auth/me/password.ts
git commit -m "feat: guest account, booking management, profile and password change UI"
```

---

## 12. Admin Portal Foundation, RBAC, Dashboard, and Bookings Management

**Milestone:** M3 · **Estimated Effort:** 5–7 days · **Branch:** `feature/gar-m3-admin-ops` · **PR:** Step 12 PR merged to `main`

> **Simplified Admin Rationale (PM Recommendation):** The SRS specifies a full CMS with 14 sidebar modules, Recharts dashboards, occupancy heatmaps, and broad CRUD. For v1.0, the admin panel will have 2–3 users. To accelerate time-to-launch, Step 12 builds:
>
> 1. Protected admin shell, RBAC, and dashboard KPIs/charts
> 2. **Bookings Management (`/admin/bookings`)** — operationally critical module with paginated list, filters, booking detail (`/admin/bookings/{ref}`), check-in/out, no-show, cancel with refund calculator, and admin-initiated booking creation form (cash/POS)
> 3. **Room Status Management (`/admin/rooms`)** — ability to toggle unit status (available/occupied/maintenance)
>
> All other broad CRUD modules (content, restaurants, facilities, gems, events, deals, contact, newsletter, media, users, settings) remain deferred to Step 15. Staff can use Supabase Dashboard for quick raw edits.

### Step Checklist

- [ ] Build protected admin shell (`AdminLayout`, `AdminSidebar`, `AdminTopbar`, `AdminBreadcrumb`)
- [ ] Sidebar links all 14 modules per SRS 3.14.1; unbuilt modules show greyed out with "Coming Soon" tooltip
- [ ] AdminTopbar includes: admin user name, role badge, "View Site" link, logout button, notification bell placeholder
- [ ] Implement dashboard metrics cards: bookings count, revenue, occupancy rate, pending bookings, unread contact/inquiry counts
- [ ] Implement bookings chart (Recharts: booking count and revenue over last 30 days) and occupancy heatmap
- [ ] Implement recent activity feed (last 10 actions with timestamps)
- [ ] Implement Bookings Management (`/admin/bookings/index.tsx`, `/admin/bookings/[ref].tsx`):
  - Table: reference, guest, dates, rooms, total, status, created date
  - Actions: Mark Checked-In, Mark Checked-Out, Mark No-Show (guarded by 24h), Cancel Booking
  - Admin-initiated walk-in booking creation form
- [ ] Implement Room Status Management (`/admin/rooms/index.tsx`):
  - View room types and toggle individual room unit status (available / occupied / maintenance)
- [ ] Restrict financial analytics: Content Manager denied financial metrics; Resort Admin & Super Admin granted access
- [ ] Unauthenticated or unauthorized users redirect to `/login?redirect=/admin`

### Explicit File Paths

- [ ] src/pages/admin/index.tsx
- [ ] src/pages/admin/_middleware.ts (or page-level guard wrapper)
- [ ] src/components/admin/AdminLayout.tsx
- [ ] src/components/admin/AdminSidebar.tsx
- [ ] src/components/admin/AdminTopbar.tsx
- [ ] src/components/admin/AdminBreadcrumb.tsx
- [ ] src/pages/admin/bookings/index.tsx
- [ ] src/pages/admin/bookings/[ref].tsx
- [ ] src/pages/admin/rooms/index.tsx
- [ ] src/pages/api/v1/analytics/bookings.ts
- [ ] src/pages/api/v1/analytics/revenue.ts
- [ ] src/pages/api/v1/analytics/occupancy.ts

### Commands

```powershell
npm run dev
npm run lint
npm run test
```

### Verification Checklist

- [ ] Admin shell renders desktop-first without public navbar/footer
- [ ] Content Manager is blocked from financial analytics endpoints
- [ ] Resort Admin and Super Admin can view revenue and occupancy charts
- [ ] Bookings table filters by status, date range, resort, and searches by reference/name
- [ ] Admin can mark Checked-In, Checked-Out, and No-Show on `/admin/bookings/[ref]`
- [ ] Room unit status toggle persists in database
- [ ] Admin booking creation creates Confirmed booking without online payment

### STOP & COMMIT

```powershell
git add src/pages/admin src/components/admin src/pages/api/v1/analytics
git commit -m "feat: admin shell, RBAC guards, analytics dashboard, bookings management, room status"
```

---

## 13. Observability, SEO Finalization, Background Jobs, and Operational Hardening

**Milestone:** M3 · **Estimated Effort:** 3–5 days · **Branch:** `feature/gar-m3-admin-ops` · **PR:** Step 13 PR merged to `main`

### Step Checklist

- [ ] Generate dynamic `sitemap.xml` (includes public pages, excludes auth/booking/account) and `robots.txt`
- [ ] Complete structured-data schemas across all page types
- [ ] Initialize Sentry client and server error/performance monitoring hooks
- [ ] Implement and schedule background jobs via pg_cron:
  - `expire-pending-bookings` (every 5 mins): expire stale pending bookings, release room holds
  - `retry-failed-emails` (every 10 mins): retry sends from `failed_emails` with exponential backoff (max 3 retries)
  - `notify-room-available`: send batch emails to NotifyMe registrations when room status changes from `under_construction` to `available`
  - `deactivate-expired-deals` (daily): set `isActive=false` for deals past `endDate`
- [ ] Produce operational incident response runbook (`docs/operations/runbook.md`)

### Explicit File Paths

- [ ] src/pages/sitemap.xml.ts
- [ ] src/pages/robots.txt.ts
- [ ] src/lib/seo/structured-data/*
- [ ] src/lib/monitoring/sentry.ts
- [ ] supabase/functions/expire-pending-bookings/index.ts
- [ ] supabase/functions/retry-failed-emails/index.ts
- [ ] supabase/functions/notify-room-available/index.ts
- [ ] supabase/functions/deactivate-expired-deals/index.ts
- [ ] docs/operations/runbook.md

### Commands

```powershell
npx supabase functions serve expire-pending-bookings --no-verify-jwt
npx supabase functions serve retry-failed-emails --no-verify-jwt
npx supabase functions serve notify-room-available --no-verify-jwt
npx supabase functions serve deactivate-expired-deals --no-verify-jwt
npm run lint
npm run test
```

### Verification Checklist

- [ ] `sitemap.xml` lists all public routes and excludes private routes
- [ ] Expired pending bookings release unit inventory after 30 minutes
- [ ] Failed email retry handles transient SendGrid errors up to 3 attempts
- [ ] Expired deals automatically set `isActive=false`
- [ ] Notify-me emails fire when under-construction room becomes available

### STOP & COMMIT

```powershell
git add src/pages/sitemap.xml.ts src/pages/robots.txt.ts src/lib/seo src/lib/monitoring supabase/functions docs/operations/runbook.md
git commit -m "feat: observability, SEO completion, background jobs, operational runbook"
```

---

## 14. End-to-End Quality Gate, Documentation, and Release Readiness

**Milestone:** M3 · **Estimated Effort:** 3–5 days · **Branch:** `feature/gar-m3-admin-ops` · **PR:** Step 14 PR merged to `main` — **Completes Milestone 3 & Core Scope**

### Step Checklist

- [ ] Configure GitHub Actions CI pipeline covering lint, Prettier check, typecheck, unit/integration tests, e2e smoke tests, and build
- [ ] Enforce test coverage thresholds (≥ 70% on API routes per SRS 5.5)
- [ ] Produce OpenAPI contract specification (`docs/api/openapi.yaml`) aligned to implemented endpoints
- [ ] Document test strategy (`docs/testing/strategy.md`) and release checklist (`docs/release/checklist.md`)
- [ ] Create manual accessibility audit checklist (`docs/accessibility/manual-audit-checklist.md`) covering NVDA/VoiceOver screen readers, color contrast, and focus management
- [ ] Document load testing approach for 500+ concurrent users (k6/Artillery)
- [ ] Verify Core Web Vitals targets per SRS 5.1: LCP < 2.5s on 4G, FID < 100ms, CLS < 0.1, TTFB < 600ms, API p95 < 300ms
- [ ] Verify i18n readiness: audit that all user-facing strings use translation helpers and no hard-coded strings remain

### Explicit File Paths

- [ ] vitest.config.ts
- [ ] playwright.config.ts
- [ ] tests/unit/**/*.test.ts
- [ ] tests/integration/**/*.test.ts
- [ ] tests/e2e/**/*.spec.ts
- [ ] tests/accessibility/**/*.spec.ts
- [ ] tests/performance/**
- [ ] .github/workflows/ci.yml
- [ ] docs/testing/strategy.md
- [ ] docs/api/openapi.yaml
- [ ] docs/release/checklist.md
- [ ] docs/accessibility/manual-audit-checklist.md

### Critical Code Block: CI workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches:
      [main, feature/gar-m1-marketing-site, feature/gar-m2-booking-engine, feature/gar-m3-admin-ops]

jobs:
  build-test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
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

      - name: Unit + Integration
        run: npm run test

      - name: Build
        run: npm run build

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: E2E Smoke
        run: npm run test:e2e -- --grep @smoke
```

### Commands

```powershell
npm run ci
npm run test:e2e -- --grep @smoke
npm run build
```

### Verification Checklist

- [ ] CI pipeline passes on `main` and milestone branches
- [ ] Unit and integration test coverage meets ≥ 70% on API routes
- [ ] Critical guest and admin smoke journeys pass in Playwright
- [ ] Automated axe-core accessibility checks pass
- [ ] Core Web Vitals targets validated on public pages
- [ ] Manual accessibility checklist and load testing strategy documented
- [ ] M3 Exit Criteria satisfied; core implementation ready for production deployment

### STOP & COMMIT

```powershell
git add vitest.config.ts playwright.config.ts tests .github/workflows/ci.yml docs/testing/strategy.md docs/api/openapi.yaml docs/release/checklist.md docs/accessibility/manual-audit-checklist.md
git commit -m "chore: test matrix, CI baseline, docs, performance and accessibility gates"
```

---

## 15. Follow-up PR Plan - Admin CRUD Breadth (Deferred to Phase 2)

### Status

- [ ] Deferred intentionally to keep core delivery milestones reviewable and minimize risk
- [ ] Operational Bookings Management (`/admin/bookings`) and Room Unit Status (`/admin/rooms`) are already delivered in Step 12
- [ ] Full CRUD breadth for CMS content, seasonal pricing, media uploads, and super-admin modules will be implemented on branch `feature/gar-admin-crud-phase-2`

### Explicit Deferred File Paths

- [ ] src/pages/admin/rooms/new.tsx, [id].tsx (seasonal pricing, full room type CRUD)
- [ ] src/pages/admin/content/*.tsx
- [ ] src/pages/admin/restaurants/*.tsx
- [ ] src/pages/admin/facilities/*.tsx
- [ ] src/pages/admin/gems/*.tsx
- [ ] src/pages/admin/events/*.tsx
- [ ] src/pages/admin/deals/*.tsx
- [ ] src/pages/admin/contact/*.tsx
- [ ] src/pages/admin/newsletter/*.tsx
- [ ] src/pages/admin/media/*.tsx
- [ ] src/pages/admin/users/*.tsx
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
12. `feat: admin shell, RBAC, analytics dashboard, bookings management, room status` (M3 · Step 12)
13. `feat: observability, SEO completion, background jobs, operational runbook` (M3 · Step 13)
14. `chore: full test matrix, CWV targets, manual audit checklist, docs, release readiness` (M3 · Step 14 — **M3 Complete**)
15. `docs: follow-up PR plan for full admin CRUD breadth` (Phase 2 · Step 15)
