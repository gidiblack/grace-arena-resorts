# Grace Arena Resorts SRS v1.2 Implementation Runbook (Single PR)

## Title
Grace Arena Resorts SRS v1.2 Full Implementation (Core Scope)

## Goal
Implement the full core scope from plans/gar-srs-implementation/plan-v1.2-corrected.md in one branch and one PR on feature/gar-srs-v1-full-implementation, with deterministic execution steps, concrete commands, explicit files, and hard verification gates.

## Prerequisites
- [ ] Working branch is feature/gar-srs-v1-full-implementation
- [ ] Node.js 20.x installed
- [ ] npm 10+ installed
- [ ] Supabase CLI available through npx
- [ ] GitHub Actions enabled for repository
- [ ] Supabase project + credentials available
- [ ] Paystack test keys available
- [ ] SendGrid API key and sender identity available
- [ ] reCAPTCHA v3 keys available
- [ ] Google Maps embed key available
- [ ] Vercel KV provisioned (or local in-memory fallback configured)

### Prerequisite Commands
```powershell
git checkout feature/gar-srs-v1-full-implementation
node -v
npm -v
npm ci
npx supabase --version
```

---

## 1. Repository Foundation, Standards, and Environment Contract

### Step Checklist
- [ ] Install all runtime/test/build dependencies required by the corrected plan
- [ ] Create typed environment parser with strict startup validation
- [ ] Create shared logger with redaction
- [ ] Create API error model and response envelope helpers
- [ ] Add i18n loader and English translation file
- [ ] Add NGN currency formatter
- [ ] Add SendGrid service + template renderer + failed-email queue adapter
- [ ] Add Prettier config and format check script
- [ ] Update README with environment contract and commands

### Explicit File Paths
- [ ] package.json
- [ ] .env.example
- [ ] .prettierrc
- [ ] .prettierignore
- [ ] src/config/env.ts
- [ ] src/lib/logger.ts
- [ ] src/lib/errors.ts
- [ ] src/lib/http/response.ts
- [ ] src/lib/http/validation.ts
- [ ] src/types/api.ts
- [ ] src/lib/i18n/index.ts
- [ ] src/lib/i18n/en.json
- [ ] src/lib/formatters/currency.ts
- [ ] src/services/email/sendgrid.ts
- [ ] src/services/email/templates.ts
- [ ] README.md

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
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("\n");
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
- [ ] npm run lint passes
- [ ] npm run typecheck passes
- [ ] npm run format:check passes
- [ ] Unit tests exist for env parser and response envelope
- [ ] Boot fails with missing required env variables
- [ ] Logger redacts keys containing token, secret, password, key

### STOP & COMMIT
```powershell
git add package.json .env.example .prettierrc .prettierignore README.md src/config/env.ts src/lib src/types src/services/email src/lib/i18n src/lib/formatters
git commit -m "chore: foundation, env contract, shared libs, i18n, email service, formatters"
```

---

## 2. Supabase Schema, Migrations, Seed Data, and RLS Baseline

### Step Checklist
- [ ] Initialize Supabase project config
- [ ] Implement schema migrations 0001-0006 exactly as corrected plan
- [ ] Add dual amenity model and all required entities
- [ ] Implement RLS policies by role matrix
- [ ] Create storage buckets with policies
- [ ] Enable pg_cron and schedule foundational jobs
- [ ] Generate src/types/db.ts from database schema
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
- [ ] npx supabase db reset completes cleanly
- [ ] All required tables, enums, indexes, constraints exist
- [ ] RLS denies guest read/write on admin-only datasets
- [ ] Amenity JSON and Amenity junction both queryable
- [ ] Buckets media-public and confirmations exist with correct policies
- [ ] pg_cron extension enabled with required schedules

### STOP & COMMIT
```powershell
git add supabase src/types/db.ts
git commit -m "feat: schema, migrations, seeds, RLS, storage buckets, pg_cron setup"
```

---

## 3. API Core, Auth Session Handling, Rate Limiting, and Middleware

### Step Checklist
- [ ] Build composable API handler pipeline
- [ ] Add auth/session extraction and role checks
- [ ] Add Vercel KV rate limiting adapter + in-memory local fallback
- [ ] Add reCAPTCHA verifier with minimum score 0.5
- [ ] Add CSRF and security header middleware
- [ ] Add pagination helper with X-Total-Count and X-Total-Pages

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

type Middleware = (
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: ApiCtx
) => Promise<void>;

export function withApi(
  handler: NextApiHandler,
  middleware: Middleware[] = []
): NextApiHandler {
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
- [ ] Wrapper enforces method and schema validation
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

### Step Checklist
- [ ] Build auth pages (register/login/forgot/reset/verify-email)
- [ ] Implement all auth API endpoints including me/password
- [ ] Implement redirect query handling on login
- [ ] Enforce password policy and lockout/recaptcha thresholds
- [ ] Add resend verification rate limiting
- [ ] Enforce NDPR consent checkbox on registration

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

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().regex(/^\+234\d{10}$/),
  password: passwordPolicy,
  confirmPassword: z.string(),
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the privacy policy" }),
  }),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordPolicy,
  confirmNewPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmNewPassword, {
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
- [ ] Register flow creates account and sends verification email
- [ ] verify-email page displays expected interstitial and resend action
- [ ] Login supports ?redirect= and returns user to target route
- [ ] Account locks after 5 failed attempts for 15 minutes
- [ ] reCAPTCHA enforced after 3 failed attempts
- [ ] PUT /api/v1/auth/me/password works for authenticated users

### STOP & COMMIT
```powershell
git add src/pages/register.tsx src/pages/login.tsx src/pages/forgot-password.tsx src/pages/reset-password.tsx src/pages/verify-email.tsx src/pages/api/v1/auth src/features/auth
git commit -m "feat: auth pages, auth endpoints, change-password endpoint"
```

---

## 5. Global Site Shell, Accessibility Baseline, Consent, and Shared UX States

### Step Checklist
- [ ] Build global shell (sticky nav, footer, WhatsApp FAB, page transition)
- [ ] Implement cookie consent banner + preferences modal
- [ ] Gate analytics loading by consent
- [ ] Add skip link, keyboard focus rules, semantic landmarks
- [ ] Add reusable loading/error/empty states
- [ ] Add offline network status banner

### Explicit File Paths
- [ ] src/components/layout/Navbar.tsx
- [ ] src/components/layout/Footer.tsx
- [ ] src/components/layout/PageWrapper.tsx
- [ ] src/components/layout/HeadComponent.tsx
- [ ] src/components/common/SkipToContent.tsx
- [ ] src/components/common/WhatsAppFab.tsx
- [ ] src/components/common/CookieConsentBanner.tsx
- [ ] src/components/common/CookiePreferencesModal.tsx
- [ ] src/components/common/GlobalNetworkStatus.tsx
- [ ] src/components/common/PageTransitionIndicator.tsx
- [ ] src/components/states/LoadingState.tsx
- [ ] src/components/states/ErrorState.tsx
- [ ] src/components/states/EmptyState.tsx
- [ ] src/styles/globals.css
- [ ] src/lib/seo/meta.ts

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
- [ ] Consent cookie name is gar_cookie_consent with 12-month expiry
- [ ] Essential always enabled and non-toggleable
- [ ] Analytics scripts do not load when analytics=false
- [ ] Footer link re-opens preference modal
- [ ] Offline banner appears when network disconnects
- [ ] Page transition indicator appears during route changes

### STOP & COMMIT
```powershell
git add src/components/layout src/components/common src/components/states src/styles/globals.css src/lib/seo/meta.ts
git commit -m "feat: global shell, consent, accessibility baseline, page transitions"
```

---

## 6. Public Content Pages Vertical Slice

### Step Checklist
- [ ] Implement pages: Home/About/Facilities/Restaurants/Gems/Events/Deals/Contact/Privacy
- [ ] Implement supporting public APIs including detail endpoints
- [ ] Implement newsletter double opt-in + unsubscribe
- [ ] Implement media endpoint and lightbox behavior
- [ ] Implement map section with fallback
- [ ] Implement JSON-LD per page type and robust error/empty/loading states

### Explicit File Paths
- [ ] src/pages/index.tsx
- [ ] src/pages/about.tsx
- [ ] src/pages/facilities.tsx
- [ ] src/pages/restaurants.tsx
- [ ] src/pages/gems.tsx
- [ ] src/pages/events.tsx
- [ ] src/pages/deals.tsx
- [ ] src/pages/contact.tsx
- [ ] src/pages/privacy.tsx
- [ ] src/pages/api/v1/content/[page].ts
- [ ] src/pages/api/v1/facilities/index.ts
- [ ] src/pages/api/v1/facilities/[id].ts
- [ ] src/pages/api/v1/restaurants/index.ts
- [ ] src/pages/api/v1/restaurants/[id].ts
- [ ] src/pages/api/v1/restaurants/[id]/menu.ts
- [ ] src/pages/api/v1/gems/index.ts
- [ ] src/pages/api/v1/events/index.ts
- [ ] src/pages/api/v1/events/inquiries.ts
- [ ] src/pages/api/v1/deals/index.ts
- [ ] src/pages/api/v1/deals/[id].ts
- [ ] src/pages/api/v1/contact/index.ts
- [ ] src/pages/api/v1/newsletter/subscribe.ts
- [ ] src/pages/api/v1/newsletter/confirm.ts
- [ ] src/pages/api/v1/newsletter/unsubscribe.ts
- [ ] src/pages/api/v1/amenities/index.ts
- [ ] src/pages/api/v1/media/index.ts
- [ ] src/components/common/Lightbox.tsx
- [ ] src/components/common/MapSection.tsx
- [ ] src/components/home/HeroVideo.tsx
- [ ] src/features/content/*

### Commands
```powershell
npm run lint
npm run typecheck
npm run test
npm run dev
```

### Verification Checklist
- [ ] Home page renders hero video desktop and static fallback mobile/reduced-motion
- [ ] Lightbox supports Left/Right/Escape + focus trap
- [ ] MapSection falls back to static image/open-map link on embed failure
- [ ] Newsletter flow: subscribe -> confirm -> unsubscribe works end-to-end
- [ ] Rate limits enforced: contact 3/hour/IP, event inquiry 5/hour/IP
- [ ] JSON-LD present and valid for all required page types

### STOP & COMMIT
```powershell
git add src/pages src/components/common/Lightbox.tsx src/components/common/MapSection.tsx src/components/home/HeroVideo.tsx src/features/content
git commit -m "feat: public pages, APIs, amenities/media, newsletter double opt-in, lightbox"
```

---

## 7. Rooms and Suites Catalog with Under-Construction and Notify Me

### Step Checklist
- [ ] Implement room listing by resort and tier filters
- [ ] Implement room details interactions with amenity categorization
- [ ] Implement buildings endpoint
- [ ] Implement notify-me endpoint with duplicate suppression
- [ ] Enforce under-construction rendering and booking exclusion rules

### Explicit File Paths
- [ ] src/pages/rooms.tsx
- [ ] src/pages/api/v1/rooms/index.ts
- [ ] src/pages/api/v1/rooms/[id].ts
- [ ] src/pages/api/v1/buildings/index.ts
- [ ] src/pages/api/v1/notify-me.ts
- [ ] src/features/rooms/*

### Commands
```powershell
npm run lint
npm run typecheck
npm run test
```

### Verification Checklist
- [ ] Presidential and Royal show Under Construction badge, Price TBD, Notify Me button
- [ ] Notify Me duplicate same email+roomType returns 200 and no duplicate row
- [ ] RoomType amenity JSON renders In-Room vs Resort Amenities sections
- [ ] Under-construction room types excluded from structured data offers
- [ ] Buildings endpoint returns campus associations

### STOP & COMMIT
```powershell
git add src/pages/rooms.tsx src/pages/api/v1/rooms src/pages/api/v1/buildings src/pages/api/v1/notify-me.ts src/features/rooms
git commit -m "feat: rooms catalog, buildings endpoint, notify-me"
```

---

## 8. Booking Engine Backend (Availability, Pricing, Lifecycle)

### Step Checklist
- [ ] Implement availability, booking CRUD, status/cancel/confirmation/pdf endpoints
- [ ] Implement pricing engine for seasonal, deals, tax with exact formula rules
- [ ] Implement booking reference generation GAR-XXXXXXXX
- [ ] Implement transactional concurrency controls
- [ ] Implement lifecycle transitions including no-show guard
- [ ] Implement admin-initiated booking API (payment bypass)
- [ ] Trigger confirmation email + PDF on confirmation

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
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

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
- [ ] Pricing formula returns deterministic subtotal/discount/tax/total
- [ ] Percentage deal discounts apply only to applicable room subset
- [ ] Fixed deal discounts apply to full subtotal
- [ ] Two concurrent requests for last unit cannot both confirm
- [ ] No-show cannot be marked before 24h after check-in time
- [ ] Admin booking endpoint allows status=confirmed with cash/POS payment metadata

### STOP & COMMIT
```powershell
git add src/pages/api/v1/availability src/pages/api/v1/bookings src/pages/api/v1/deals/validate src/domain/booking src/services/pricing
git commit -m "feat: booking APIs, pricing engine, state machine, no-show, admin booking API"
```

---

## 9. Payment Integration and Webhook Security

### Step Checklist
- [ ] Implement Paystack initiate and verify flows
- [ ] Implement secure webhook with raw-body HMAC verification
- [ ] Implement idempotency and replay protection
- [ ] Implement refund service and refund webhook handling
- [ ] Implement expired-pending payment race handling with auto-refund
- [ ] Implement payment-downtime fallback handling and 2-hour hold override

### Explicit File Paths
- [ ] src/pages/api/v1/payments/initiate.ts
- [ ] src/pages/api/v1/payments/verify.ts
- [ ] src/pages/api/v1/payments/[id].ts
- [ ] src/services/payments/paystack.ts
- [ ] src/services/payments/signature.ts
- [ ] src/services/payments/refund.ts
- [ ] src/domain/payment/*

### Critical Code Block: webhook raw-body config example
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

  return typeof signature === "string" && crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const raw = await getRawBody(req);
  if (!isValidSignature(raw, req.headers["x-paystack-signature"])) {
    return res.status(401).json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Unauthorized" } });
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
- [ ] Webhook rejects tampered payloads and invalid signatures
- [ ] bodyParser is disabled on webhook route
- [ ] Verify endpoint auto-refunds if booking already expired
- [ ] Refund initiated and completion webhook updates payment statuses
- [ ] Gateway downtime returns WhatsApp fallback message and extends hold window to 2 hours
- [ ] Replay protection prevents duplicate event processing

### STOP & COMMIT
```powershell
git add src/pages/api/v1/payments src/services/payments src/domain/payment
git commit -m "feat: payment integration, secure webhook, refunds, race handling, downtime fallback"
```

---

## 10. Booking Wizard Frontend and Confirmation Experience

### Step Checklist
- [ ] Build 4-step wizard with date/guest, room select, guest form, review+payment
- [ ] Implement room and deal query preselection behavior
- [ ] Implement responsive summary (desktop sidebar, mobile bottom sheet)
- [ ] Integrate Paystack checkout and failure/success/timeout UX
- [ ] Implement confirmation page with PDF/email/account actions
- [ ] Implement payment-unavailable fallback CTA to WhatsApp

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
- [ ] Step indicator displays Step X of 4 correctly on mobile/desktop
- [ ] ?room= preselects room; ?deal= auto-applies and filters room options
- [ ] Guest phone validates +234 format
- [ ] Under-construction room types are not displayed in booking wizard
- [ ] Confirmation view includes reference, summary, PDF download, resend email
- [ ] Payment downtime message and WhatsApp fallback render when gateway unavailable

### STOP & COMMIT
```powershell
git add src/pages/booking.tsx src/features/booking
git commit -m "feat: booking wizard UI, confirmation UX, payment fallback handling"
```

---

## 11. Guest Account and Booking Management

### Step Checklist
- [ ] Build authenticated account pages and routing guard
- [ ] Implement booking list/detail/actions by status
- [ ] Implement cancellation modal with refund preview
- [ ] Implement receipt PDF path for checked-out cash/POS bookings
- [ ] Implement profile editing and change-password form integration

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
- [ ] Unauthenticated access redirects to /login?redirect=/account
- [ ] Status badges map exactly to required colors/states
- [ ] Action visibility per status is correct
- [ ] Cancellation modal shows server-computed refund amount and policy text
- [ ] Profile page change password uses PUT /api/v1/auth/me/password successfully
- [ ] Users cannot access other users' bookings

### STOP & COMMIT
```powershell
git add src/pages/account src/features/account src/pages/api/v1/bookings/index.ts src/pages/api/v1/auth/me.ts src/pages/api/v1/auth/me/password.ts
git commit -m "feat: guest account, booking management, profile and password change UI"
```

---

## 12. Admin Portal Foundation, RBAC, and Dashboard

### Step Checklist
- [ ] Build protected admin shell layout and route guards
- [ ] Build sidebar/topbar/breadcrumb components
- [ ] Implement role-aware analytics APIs
- [ ] Implement dashboard KPIs, charts, occupancy heatmap, recent activity
- [ ] Enforce redirects for unauthorized and unauthenticated users

### Explicit File Paths
- [ ] src/pages/admin/index.tsx
- [ ] src/pages/admin/_middleware.ts (or page-level guard files under Pages Router)
- [ ] src/components/admin/AdminLayout.tsx
- [ ] src/components/admin/AdminSidebar.tsx
- [ ] src/components/admin/AdminTopbar.tsx
- [ ] src/components/admin/AdminBreadcrumb.tsx
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
- [ ] Admin shell excludes public navbar/footer
- [ ] Content Manager denied financial analytics endpoints
- [ ] Resort Admin and Super Admin can access financial analytics
- [ ] Unauthorized users redirect to /login?redirect=/admin
- [ ] Dashboard cards/charts load with seeded data

### STOP & COMMIT
```powershell
git add src/pages/admin src/components/admin src/pages/api/v1/analytics
git commit -m "feat: admin shell, RBAC guards, analytics dashboard, breadcrumbs"
```

---

## 13. Observability, SEO Finalization, Background Jobs, and Hardening

### Step Checklist
- [ ] Finalize sitemap and robots with explicit inclusion/exclusion
- [ ] Complete structured-data coverage by page type
- [ ] Integrate Sentry initialization hooks
- [ ] Implement edge/background jobs: expire pending, retry emails, notify room available, deactivate expired deals
- [ ] Produce operations runbook

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
- [ ] sitemap includes public pages and excludes booking/auth/account
- [ ] robots.txt rules match SEO intent
- [ ] Failed email retries max 3 attempts with exponential backoff
- [ ] Pending bookings expire every 5 minutes and release inventory
- [ ] Deal auto-deactivation runs daily and flips isActive=false after endDate
- [ ] notify-room-available sends once and stamps notifiedAt/isNotified

### STOP & COMMIT
```powershell
git add src/pages/sitemap.xml.ts src/pages/robots.txt.ts src/lib/seo src/lib/monitoring supabase/functions docs/operations/runbook.md
git commit -m "feat: observability, SEO completion, background jobs, operational runbook"
```

---

## 14. End-to-End Quality Gate, Documentation, and PR Assembly

### Step Checklist
- [ ] Configure complete CI checks
- [ ] Add unit/integration/e2e/accessibility/performance test scaffolding
- [ ] Add OpenAPI spec draft matching implemented endpoints
- [ ] Add test strategy, release checklist, manual accessibility checklist
- [ ] Add Core Web Vitals and load-testing strategy checks
- [ ] Run final SRS gap audit and list only Step 15 as deferred

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

### Critical Code Block: CI workflow baseline
```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [feature/gar-srs-v1-full-implementation]

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
- [ ] CI pipeline passes on branch feature/gar-srs-v1-full-implementation
- [ ] API route coverage meets minimum 70%
- [ ] Critical guest/admin smoke flows pass in Playwright
- [ ] Accessibility checks pass in automated suite
- [ ] Performance checks include LCP/FID/CLS/TTFB/API p95 targets
- [ ] docs/release/checklist.md includes explicit Step 15 deferral note

### STOP & COMMIT
```powershell
git add vitest.config.ts playwright.config.ts tests .github/workflows/ci.yml docs/testing/strategy.md docs/api/openapi.yaml docs/release/checklist.md docs/accessibility/manual-audit-checklist.md
git commit -m "chore: test matrix, CI baseline, docs, performance and accessibility gates"
```

---

## 15. Follow-up PR Plan - Admin CRUD Breadth (Deferred)

### Status
- [ ] Deferred intentionally in this PR
- [ ] No implementation code for this step is merged into feature/gar-srs-v1-full-implementation
- [ ] Defer to branch feature/gar-admin-crud-phase-2

### Explicit Deferred File Paths
- [ ] src/pages/admin/rooms/*.tsx
- [ ] src/pages/admin/bookings/*.tsx
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
- [ ] src/pages/api/v1/media/*.ts (admin write operations)
- [ ] src/pages/api/v1/events/inquiries/*.ts

### Commands
```powershell
git checkout -b feature/gar-admin-crud-phase-2
```

### Verification Checklist
- [ ] PR description for feature/gar-srs-v1-full-implementation explicitly states Step 15 deferred
- [ ] Release checklist includes deferred module inventory
- [ ] No partial CRUD modules are merged in current PR

### STOP & COMMIT
```powershell
git add docs/release/checklist.md plans/gar-srs-implementation/implementation.md
git commit -m "docs: mark admin CRUD breadth as deferred to phase-2 branch"
```

---

## Final One-PR Commit Sequence (Must Match Corrected Plan)

1. chore: foundation, dependencies, env contract, shared libs, i18n, email service, formatters  
2. feat: database schema, migrations, seeds, RLS, storage buckets, pg_cron setup  
3. feat: API middleware stack, auth context, security primitives  
4. feat: auth pages, auth endpoints, change-password endpoint  
5. feat: global shell, consent, accessibility baseline, page transitions  
6. feat: public pages, APIs, amenities/media, newsletter double opt-in, lightbox  
7. feat: rooms catalog, buildings endpoint, notify-me  
8. feat: booking APIs, pricing engine, state machine, no-show, admin booking API  
9. feat: payment integration, secure webhook, refunds, race handling, downtime fallback  
10. feat: booking wizard UI, confirmation UX, payment fallback handling  
11. feat: guest account, booking management, profile and password change UI  
12. feat: admin shell, RBAC guards, analytics dashboard, breadcrumbs  
13. feat: observability, SEO completion, background jobs, operational runbook  
14. chore: test matrix, CI baseline, docs, performance and accessibility gates  
15. docs: deferred follow-up plan for full admin CRUD breadth (explicitly deferred)