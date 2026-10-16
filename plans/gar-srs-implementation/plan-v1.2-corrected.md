---
goal: Grace Arena Resorts SRS v1.2 Implementation Plan
version: 1.4
date_created: 2026-03-29
last_updated: 2026-10-16
owner: Engineering Team
status: Planned
tags: [feature, architecture, migration, qa, security, milestones]
---

# Title

Grace Arena Resorts SRS v1.2 Full-Stack Implementation Plan

# Branches

- `feature/gar-m1-marketing-site` — Milestone 1
- `feature/gar-m2-booking-engine` — Milestone 2
- `feature/gar-m3-admin-ops` — Milestone 3
- `feature/gar-admin-crud-phase-2` — Follow-up (Step 15)

# Description

This plan converts the authoritative requirements in docs/GAR-SRS.md into **three delivery milestones**, each with its own branch and PR(s), using commit-sized, testable steps for a Next.js 16 Pages Router and TypeScript codebase. The current repository is an early scaffold with Chakra UI setup, a single home page, and one sample API route. The plan starts with foundational architecture and delivery tooling, then progresses through public pages, booking engine, account flows, admin foundation, and final quality gates. The full admin CRUD breadth is intentionally moved to a follow-up PR to reduce review risk.

Each step is delivered as its own PR merged to `main` (not accumulated in a single monolithic branch). Early steps that don't expose user-facing features merge directly; later steps with incomplete user journeys use unreachable routes or feature flags until the milestone is complete.

# Goal

Deliver an SRS-aligned v1.0 implementation baseline that includes:

- Public marketing site pages and SEO foundations
- Room browsing and under-construction notify flow
- Authenticated booking engine with payment and PDF confirmation
- Guest account management
- Admin foundation for operational management (shell, RBAC, bookings management)
- Security, accessibility, performance, and test coverage gates required by the SRS

# Delivery Milestones

> **Rationale:** The resort needs a web presence as soon as possible. Delivering value incrementally lets the resort start directing traffic to the site while the booking engine is being built. Milestones define shippable checkpoints that provide standalone user value.

## Milestone 1: Marketing Site (Target: 4–6 weeks) — **COMPLETED**

**Delivers:** Public pages with content, room browsing, WhatsApp CTAs. No booking yet.

| Step   | Scope                                                                                              | Estimated Effort   | Status        |
| ------ | -------------------------------------------------------------------------------------------------- | ------------------ | ------------- |
| Step 1 | Foundation, env contract, shared libs                                                              | 2–3 days           | [x] Done      |
| Step 5 | Global shell, consent, accessibility                                                               | 3–4 days           | [x] Done      |
| Step 6 | Public content pages (Home, About, Facilities, Restaurants, Gems, Events, Deals, Contact, Privacy) | 8–12 days          | [x] Done      |
| Step 7 | Rooms catalog, Notify Me (read-only, no booking)                                                   | 3–5 days           | [x] Done      |
|        | **M1 subtotal**                                                                                    | **16–24 dev-days** | **Completed** |

**Exit Criteria:**

- [x] All public pages render with real content and media
- [x] Room browsing works with resort toggle and tier filtering
- [x] WhatsApp CTAs functional across all pages
- [x] Cookie consent, accessibility baseline, and SEO foundations in place
- [x] Deployed to production domain via Vercel (Ready for deployment)

## Milestone 2: Booking Engine (Target: 6–10 weeks after M1)

**Delivers:** Full guest booking flow with payment, accounts, and room management.

| Step    | Scope                                                     | Estimated Effort   |
| ------- | --------------------------------------------------------- | ------------------ |
| Step 2  | Supabase schema, migrations, seeds, RLS                   | 3–5 days           |
| Step 3  | API middleware stack, auth context, security              | 2–3 days           |
| Step 4  | Auth pages and endpoints                                  | 4–5 days           |
| Step 8  | Booking engine backend (availability, pricing, lifecycle) | 8–10 days          |
| Step 9  | Payment integration, webhook security                     | 4–6 days           |
| Step 10 | Booking wizard frontend                                   | 6–8 days           |
| Step 11 | Guest account and booking management                      | 4–5 days           |
|         | **M2 subtotal**                                           | **31–42 dev-days** |

**Exit Criteria:**

- Guests can register, log in, browse rooms, and complete a booking with Paystack payment
- Booking confirmation PDF generated and emailed
- Guest account shows booking history with cancellation and refund flows
- All auth flows working (register, verify, login, reset, change password)
- Payment webhook security verified in Paystack sandbox

## Milestone 3: Admin & Operations (Target: 3–5 weeks after M2)

**Delivers:** Admin bookings operations (including offline payments and manual refunds), room status, dashboard, operational tooling, quality gates.

> **M3 audit (2026-10-16):** Step 12 was re-scoped and split into 12A/12B after an audit against SRS v1.3 and the shipped M2 code. Estimates were raised to match the full scope.

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

## Total Estimated Effort: 66–91 dev-days

---

# Pre-Flight Checklist (Complete Before Step 1)

> **Rationale:** Third-party service provisioning delays can block end-to-end validation. All external accounts and credentials must be secured before development begins.

| Service                 | Action Needed                                                                                                                                    | Owner            | Due By           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ---------------- |
| **Supabase**            | Create project, get anon key + service role key, enable pg_cron + pgcrypto extensions                                                            | Engineering      | Before Step 1    |
| **Vercel**              | Connect repository, configure environment variables, enable preview deployments                                                                  | Engineering      | Before Step 1    |
| **SendGrid**            | Create account, verify sender domain and email, get API key                                                                                      | Engineering      | Before Step 4    |
| **Google reCAPTCHA v3** | Register site, get site key + secret key                                                                                                         | Engineering      | Before Step 3    |
| **Google Maps**         | Create API key, enable Maps Embed API + Places API                                                                                               | Engineering      | Before Step 6    |
| **Paystack**            | Apply for merchant account, obtain test public + secret keys                                                                                     | Business/Finance | Before Step 9    |
| **Google Analytics 4**  | Create property, get measurement ID, set up GTM container                                                                                        | Marketing        | Before Step 5    |
| **Sentry**              | Create project, get DSN                                                                                                                          | Engineering      | Before Step 13   |
| **Domain + SSL**        | Purchase domain, point DNS to Vercel, provision SSL                                                                                              | Business/IT      | Before M1 launch |
| **Supabase Evaluation** | Confirm RLS learning curve manageable for team, test connection pooling behavior, verify edge function limits are sufficient for background jobs | Engineering      | Before Step 2    |

---

# Content Workstream (Parallel to Code — Owned by Product/Marketing)

> **Rationale:** Hotel websites live or die on photography, video, and copy. Code delivery without production content results in a placeholder site that damages the brand. This workstream **must run in parallel** with engineering, not sequentially after it.

## Content Deliverables (Required for M1 Launch)

| Deliverable                                                                             | Owner                        | Due By                   | Status         |
| --------------------------------------------------------------------------------------- | ---------------------------- | ------------------------ | -------------- |
| Professional resort photography — rooms, facilities, campuses, dining, exterior         | Marketing / Photography team | 2 weeks before M1 launch | ❌ Not started |
| Hero video production — 30–60 second resort overview, muted autoplay                    | Marketing / Video team       | 2 weeks before M1 launch | ❌ Not started |
| Copy for all 10 public pages — brand-approved, faith-aligned, reviewed for accuracy     | Product / Copywriter         | 3 weeks before M1 launch | ❌ Not started |
| Menu data for all 4 restaurants with names, descriptions, prices (NGN)                  | Resort Operations            | 2 weeks before M1 launch | ❌ Not started |
| Facility descriptions, operating hours, and location-within-resort info                 | Resort Operations            | 2 weeks before M1 launch | ❌ Not started |
| "Our Story" / About content — founding story, mission, vision, values, milestones       | Product / Founders           | 3 weeks before M1 launch | ❌ Not started |
| Privacy Policy legal text — NDPR/NDPA compliant, reviewed by compliance/legal           | Compliance Owner / Legal     | 3 weeks before M1 launch | ❌ Not started |
| Social media handles and links (Facebook, Instagram, Twitter/X, YouTube, TikTok)        | Marketing                    | 1 week before M1 launch  | ❌ Not started |
| Contact information — phone numbers, email addresses, physical address, operating hours | Resort Operations            | 1 week before M1 launch  | ❌ Not started |
| Google Maps coordinates and branded map pin                                             | Engineering / Marketing      | 1 week before M1 launch  | ❌ Not started |

## Content Seeding Strategy (Required Before Each Milestone Launch)

> **Rationale:** The plan seeds realistic data in SQL migrations for development/QA. A separate "Data Day" is needed before each milestone launch to replace seed data with verified production data.

**Before M1 Launch (Data Day 1):**

- [ ] Room inventory verified with actual unit counts and current prices
- [ ] All media assets uploaded to Supabase Storage `media-public` bucket
- [ ] Restaurant menus digitized and entered
- [ ] Facility hours confirmed and entered
- [ ] System settings configured (WhatsApp number, contact email, contact phone, map coordinates)
- [ ] Content pages populated with approved copy

**Before M2 Launch (Data Day 2):**

- [ ] Seasonal pricing records entered for current and upcoming seasons
- [ ] Active deals created with valid date ranges and promo codes
- [ ] Tax rate verified (currently defaulting to 7.5% VAT)
- [ ] Check-in/check-out times confirmed (currently defaulting to 14:00/11:00)
- [ ] Pending booking expiry window confirmed (currently defaulting to 30 minutes)
- [ ] Admin user accounts created for resort staff (Content Manager, Resort Admin, Super Admin)
- [ ] Paystack live keys configured (replacing test keys)
- [ ] SendGrid production sender verified

**Before M3 Launch (Data Day 3):**

- [ ] Sentry DSN configured for production
- [ ] GA4 measurement ID configured
- [ ] Error alerting thresholds reviewed and configured
- [ ] Background job schedules reviewed and confirmed (`CRON_SECRET` set in Vercel and Supabase Vault; `retry-failed-emails` present in `cron.job`)
- [ ] Uptime monitor configured; Supabase backups and point-in-time recovery confirmed
- [ ] Offline-payment SOP agreed: resort bank account shared via WhatsApp concierge, who may record payments/refunds, required transfer references, daily bank reconciliation
- [ ] Admin accounts created with `scripts/create-admin-user.ts` and roles verified

---

# Staging & Preview Strategy

> **Rationale:** Stakeholders need to review progress visually without running local dev. Vercel preview deployments provide this for free.

- **Every PR** gets an automatic Vercel preview deployment URL, shareable with stakeholders
- **`main` branch** auto-deploys to a staging URL (e.g., `staging.gracearenaresorts.com` or Vercel default)
- **Production domain** is pointed to `main` only when a milestone's exit criteria are fully met
- Stakeholders are invited to review preview deployments after each step PR is opened
- A dedicated Vercel project is set up from Day 1 (Step 1 prerequisite)

---

# Implementation Steps

## Step 1: Repository Foundation, Standards, and Environment Contract

**Milestone:** M1 · **Estimated Effort:** 2–3 days · **PR:** Own PR merged to `main`

### Files

- package.json
- .env.example
- src/config/env.ts
- src/lib/logger.ts
- src/lib/errors.ts
- src/lib/http/response.ts
- src/lib/http/validation.ts
- src/types/api.ts
- src/lib/i18n/index.ts <!-- GAP-FIX: #13 -->
- src/lib/i18n/en.json <!-- GAP-FIX: #13 -->
- src/lib/formatters/currency.ts <!-- GAP-FIX: #42 -->
- src/services/email/sendgrid.ts <!-- GAP-FIX: #14 -->
- src/services/email/templates.ts <!-- GAP-FIX: #14 -->
- .prettierrc <!-- GAP-FIX: #35 -->
- .prettierignore <!-- GAP-FIX: #35 -->
- README.md

### What

- Add all missing runtime and testing dependencies required by SRS stack (Supabase client, React Hook Form, Zod, dayjs, Paystack SDK/client wrapper, SendGrid client, testing stack, accessibility and e2e tooling).
- Define centralized typed environment parsing and startup validation.
- Define API envelope standard and shared error model used across all endpoints.
- Add baseline project conventions for folder layout under src for pages, features, domain, services, and tests.
- Add implementation guardrails for Pages Router + TypeScript strict mode.
- Standardize production and staging secret names in .env.example and document promotion rules for Vercel environments.
- Add i18n infrastructure: JSON-based translation file (en.json) with all user-facing strings externalized, a lookup helper that reads from the translation file, and a convention requiring all new user-facing strings to be added to the translation file rather than hard-coded. This is English-only in v1.0 but architecturally supports adding new locales without code changes per SRS 5.6. <!-- GAP-FIX: #13 -->
- Add currency formatter utility using `Intl.NumberFormat` with NGN locale for consistent ₦ formatting across the codebase per SRS 5.6. <!-- GAP-FIX: #42 -->
- Add SendGrid email service abstraction layer (`src/services/email/sendgrid.ts`) with typed send methods, template rendering, and queue-on-failure behavior (failed sends are recorded in a `failed_emails` table for retry by background job). This is needed before Step 4 (verification emails) and Step 8 (booking confirmations). <!-- GAP-FIX: #14 -->
- Verify Prettier is configured (`.prettierrc`, `.prettierignore`) and integrated with ESLint. Add format check to CI. <!-- GAP-FIX: #35 -->

### Testing

- Unit: env parser and response envelope utilities.
- Unit: i18n lookup helper with missing key fallback behavior. <!-- GAP-FIX: #13 -->
- Unit: currency formatter for various NGN amounts (zero, large, decimal edge cases). <!-- GAP-FIX: #42 -->
- Unit: email service send method, template rendering, and queue-on-failure behavior. <!-- GAP-FIX: #14 -->
- Integration: boot test that fails fast when required env vars are missing.
- Security: verify secrets are never logged by logger redaction tests.

## Step 2: Supabase Schema, Migrations, Seed Data, and RLS Baseline

**Milestone:** M2 · **Estimated Effort:** 3–5 days · **PR:** Own PR merged to `main`

### Files

- supabase/config.toml
- supabase/migrations/0001_init_schema.sql
- supabase/migrations/0002_rls_policies.sql
- supabase/migrations/0003_functions_triggers.sql
- supabase/migrations/0004_seed_reference_data.sql
- supabase/migrations/0005_storage_buckets.sql <!-- GAP-FIX: #16 -->
- supabase/migrations/0006_pg_cron_setup.sql <!-- GAP-FIX: #17 -->
- supabase/seed.sql
- src/types/db.ts

### What

- Implement the relational schema from SRS Section 6 with UUID keys, enums, indexes, constraints, and timestamps. Explicitly ensure all entities are created:
  - User, Resort, Building, RoomType, Room (unit), SeasonalPrice
  - Booking, BookingLineItem, Payment
  - Restaurant, MenuItem
  - Facility, Gem, EventCategory, EventInquiry
  - Deal, ContactSubmission, NewsletterSubscriber, NotifyMeRegistration
  - Amenity (resort-level entity with categories: general/bathroom/entertainment/outdoor), RoomTypeAmenity (junction table with composite PK) <!-- GAP-FIX: #4 -->
  - SystemSetting, MediaAsset, AuditLog
  - FailedEmail (queue table for email retry: id, recipient, subject, templateId, templateData JSON, attempts, lastAttemptAt, error, createdAt) <!-- GAP-FIX: #32 -->
- Explicitly implement the dual amenity system per SRS Section 6 Design Note: (1) `amenities` JSON array column on RoomType for room-specific amenity display (each entry: name, category "in-room"|"resort-level", isConditional boolean), and (2) separate `Amenity` entity + `RoomTypeAmenity` junction table for the resort-level amenities shown on the Home page amenities section. These are two distinct systems serving different purposes. <!-- GAP-FIX: #4 -->
- Ensure resort campuses are stored as data-driven configuration records (Resort entity), not hard-coded identifiers. The schema must support adding future campuses without structural changes per SRS Section 2 Design Note. <!-- GAP-FIX: #37 -->
- Create RLS policies matching authorization matrix in SRS Section 4.1.
- Add SQL functions for availability checks, pricing helpers, and booking reference generation.
- Add seed records for resorts, buildings, room types, room units, amenities (both JSON and entity-based), facilities, restaurants, menu items, event categories, gems, and baseline system settings (tax_rate=7.5, checkin_time=14:00, checkout_time=11:00, pending_booking_expiry_minutes=30, whatsapp_number, contact_email, contact_phone, map_coordinates).
- Include realistic seeded pricing and realistic media URLs suitable for demos, QA, and stakeholder review.
- Create Supabase Storage buckets with appropriate access policies: `media-public` (public read, authenticated write for admin roles), `confirmations` (authenticated read for own bookings, admin read). <!-- GAP-FIX: #16 -->
- Enable pg_cron extension and register cron schedules for: pending booking expiry (every 5 minutes), failed email retry, deal auto-deactivation. Actual job functions are implemented in Step 13 but the cron infrastructure must exist first. <!-- GAP-FIX: #17 -->

### Testing

- Integration: migration apply and rollback in isolated local database.
- Integration: RLS policy tests per role (guest, content manager, resort admin, super admin).
- Integration: verify dual amenity system — RoomType.amenities JSON and Amenity+RoomTypeAmenity junction both populated and queryable. <!-- GAP-FIX: #4 -->
- Integration: verify storage buckets created with correct access policies. <!-- GAP-FIX: #16 -->
- Security: verify guest role cannot read admin-only tables and cannot mutate other guest records.

## Step 3: API Core, Auth Session Handling, Rate Limiting, and Middleware

**Milestone:** M2 · **Estimated Effort:** 2–3 days · **PR:** Own PR merged to `main`

### Files

- src/pages/api/v1/\_shared/handler.ts
- src/pages/api/v1/\_shared/auth.ts
- src/pages/api/v1/\_shared/rate-limit.ts
- src/pages/api/v1/\_shared/recaptcha.ts
- src/pages/api/v1/\_shared/pagination.ts
- src/pages/api/v1/\_shared/audit-log.ts
- src/lib/supabase/server.ts
- src/lib/supabase/client.ts
- src/lib/security/csrf.ts
- src/lib/security/headers.ts

### What

- Build composable API handler wrappers for method guards, schema validation, authentication, role checks, pagination, and standardized errors.
- Implement session extraction for Supabase auth and role claim parsing.
- Implement rate limiting adapters for auth/contact/events/newsletter/notify endpoints.
- Add reCAPTCHA verification utility with score threshold handling (reject scores below 0.5 per SRS 4.5).
- Add security headers and CSRF protections per SRS requirements (HSTS, CSP, SameSite cookies, CSRF tokens on mutating requests).
- Use Vercel KV as the rate-limiter backing service for auth, contact, event, newsletter, and notify endpoints.
- Implement pagination helper using `?page=1&limit=20` with `X-Total-Count` and `X-Total-Pages` response headers per SRS Section 7 Design Note.

### Testing

- Unit: auth role parser, rate limit adapter behavior, and captcha verifier.
- Integration: representative API route wrapped with middleware stack.
- Security: CSRF and header assertions for mutating endpoints.
- Security: verify HSTS, CSP, and other security headers are set correctly.

## Step 4: Authentication and User Profile Vertical Slice

**Milestone:** M2 · **Estimated Effort:** 4–5 days · **PR:** Own PR merged to `main`

### Files

- src/pages/register.tsx
- src/pages/login.tsx
- src/pages/forgot-password.tsx
- src/pages/reset-password.tsx
- src/pages/verify-email.tsx <!-- GAP-FIX: #29 -->
- src/pages/api/v1/auth/register.ts
- src/pages/api/v1/auth/login.ts
- src/pages/api/v1/auth/refresh.ts
- src/pages/api/v1/auth/logout.ts
- src/pages/api/v1/auth/forgot-password.ts
- src/pages/api/v1/auth/reset-password.ts
- src/pages/api/v1/auth/me.ts
- src/pages/api/v1/auth/me/password.ts <!-- GAP-FIX: #1 -->
- src/pages/api/v1/auth/resend-verification.ts
- src/features/auth/schemas.ts
- src/features/auth/components/\*

### What

- Implement all SRS auth routes and pages, including verification, lockout behavior, and remember-me token policy.
- Implement `PUT /api/v1/auth/me/password` endpoint for authenticated password change (current password + new password + confirm), distinct from the reset-password flow which uses a token. This endpoint is used by the Guest Account profile page. <!-- GAP-FIX: #1 -->
- Add email verification interstitial page (`/verify-email`): displays "We've sent a verification link to {email}. Please check your inbox to verify your account." with a "Resend Verification Email" link. <!-- GAP-FIX: #29 -->
- Add form validation using shared Zod schemas.
- Add login failure count tracking and recaptcha trigger after 3 failed attempts (before lockout at 5). Account lockout lasts 15 minutes (time-based auto-expire). Failed attempt counter resets on successful login.
- Enforce authenticated booking requirement for online booking flow.
- Explicitly exclude social login from v1.0 and keep email/password auth only, per current SRS scope.
- Implement login page `?redirect={url}` query parameter support — after successful login, redirect to the provided URL (e.g., `/booking?room=xyz`). <!-- GAP-FIX: #28 -->
- Rate limit resend verification: max 1 per 60 seconds per email. <!-- GAP-FIX: #30 -->
- Configure Supabase Auth bcrypt cost factor to ≥ 12 per SRS 5.3. <!-- GAP-FIX: #15 -->
- JWT access tokens expire after 15 minutes; refresh tokens after 7 days (30 days with "Remember me"). Refresh tokens stored in HttpOnly cookies.
- Registration form must include NDPR consent checkbox linking to `/privacy`.
- Password policy: minimum 8 characters, at least one uppercase, one lowercase, one number.

### Testing

- Unit: auth schema validation and password policy helpers.
- Unit: change-password validation (current password verification, new password policy). <!-- GAP-FIX: #1 -->
- Integration: register/login/reset/change-password flows against Supabase auth mocks or test project.
- E2E: register to verify email interstitial to login redirect sequence.
- E2E: login with `?redirect` parameter correctly redirects after success. <!-- GAP-FIX: #28 -->
- Security: brute-force lockout and recaptcha threshold tests.
- Security: resend verification rate limit enforcement. <!-- GAP-FIX: #30 -->
- Security: bcrypt cost factor verification. <!-- GAP-FIX: #15 -->

## Step 5: Global Site Shell, Accessibility Baseline, Consent, and Shared UX States

**Milestone:** M1 · **Estimated Effort:** 3–4 days · **PR:** Own PR merged to `main`

### Files

- src/components/layout/Navbar.tsx
- src/components/layout/Footer.tsx
- src/components/layout/PageWrapper.tsx
- src/components/layout/HeadComponent.tsx
- src/components/common/SkipToContent.tsx
- src/components/common/WhatsAppFab.tsx
- src/components/common/CookieConsentBanner.tsx
- src/components/common/CookiePreferencesModal.tsx
- src/components/common/GlobalNetworkStatus.tsx
- src/components/common/PageTransitionIndicator.tsx <!-- GAP-FIX: #34 -->
- src/components/states/LoadingState.tsx
- src/components/states/ErrorState.tsx
- src/components/states/EmptyState.tsx
- src/styles/globals.css
- src/lib/seo/meta.ts

### What

- Replace current placeholder layout with SRS global shell behavior (sticky nav, footer, WhatsApp CTA, cookie banner, loading indicator).
- Implement cookie consent banner per SRS Section 3 specification: fixed bottom bar, three categories (Essential always-on, Analytics opt-in, Marketing opt-in), "Accept All" / "Reject Non-Essential" / "Manage Preferences" actions. "Manage Preferences" opens a modal with per-category toggles. Consent stored in first-party cookie `gar_cookie_consent` with 12-month expiry, recording per-category state and timestamp. "Cookie Settings" link in footer to re-open preferences.
- Implement conditional analytics loading: GA4/GTM scripts loaded only if analytics consent is granted. If consent not yet given, only essential cookies may be set.
- Add skip link, keyboard focus styles, semantic landmark structure (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), and reusable a11y helpers.
- Implement page transition loading indicator (visible during Next.js route changes). <!-- GAP-FIX: #34 -->
- Implement WhatsApp FAB with context-aware pre-filled messages (e.g., on Rooms page: "Hi, I'd like to inquire about {room name}"; on Booking page: "Hi, I need help with my booking"). <!-- GAP-FIX: #44 -->
- Implement network offline detection banner: "You appear to be offline. Some features may be unavailable."
- Expand SEO utilities for titles, descriptions, OG tags, Twitter Card tags, canonical URLs, and structured data stubs.
- Error state component includes "Contact Us on WhatsApp" fallback link per SRS.
- Empty state component includes optional CTA per SRS examples.
- Set legal copy approval owner to the internal Data Protection Officer (or designated Compliance Owner); Product Manager coordinates final sign-off, and Engineering only implements approved copy.

### Testing

- Unit: consent state persistence and script gating logic (verify GA4 not loaded when analytics declined).
- Unit: cookie consent cookie format (gar_cookie_consent, 12-month expiry, per-category state).
- Integration: global shell renders correctly across all public pages.
- Accessibility: axe checks for landmark structure, keyboard navigation, focus visibility, and skip link.
- Unit: WhatsApp FAB context-aware message generation. <!-- GAP-FIX: #44 -->

## Step 6: Public Content Pages Vertical Slice (Home, About, Facilities, Restaurants, Gems, Events, Deals, Contact, Privacy)

**Milestone:** M1 · **Estimated Effort:** 8–12 days · **PR:** Own PR (or split into 2 PRs: Home+About+Facilities+Restaurants and Gems+Events+Deals+Contact+Privacy) merged to `main`

### Files

- src/pages/index.tsx
- src/pages/about.tsx
- src/pages/facilities.tsx
- src/pages/restaurants.tsx
- src/pages/gems.tsx
- src/pages/events.tsx
- src/pages/deals.tsx
- src/pages/contact.tsx
- src/pages/privacy.tsx
- src/pages/api/v1/content/[page].ts
- src/pages/api/v1/facilities/index.ts
- src/pages/api/v1/facilities/[id].ts <!-- GAP-FIX: #9 -->
- src/pages/api/v1/restaurants/index.ts
- src/pages/api/v1/restaurants/[id].ts <!-- GAP-FIX: #8 -->
- src/pages/api/v1/restaurants/[id]/menu.ts
- src/pages/api/v1/gems/index.ts
- src/pages/api/v1/events/index.ts
- src/pages/api/v1/events/inquiries.ts
- src/pages/api/v1/deals/index.ts
- src/pages/api/v1/deals/[id].ts <!-- GAP-FIX: #10 -->
- src/pages/api/v1/contact/index.ts
- src/pages/api/v1/newsletter/subscribe.ts
- src/pages/api/v1/newsletter/unsubscribe.ts <!-- GAP-FIX: #11 -->
- src/pages/api/v1/newsletter/confirm.ts <!-- GAP-FIX: #2 -->
- src/pages/api/v1/amenities/index.ts <!-- GAP-FIX: #18 -->
- src/pages/api/v1/media/index.ts <!-- GAP-FIX: #12 -->
- src/components/common/Lightbox.tsx <!-- GAP-FIX: #21 -->
- src/components/common/MapSection.tsx <!-- GAP-FIX: #31 -->
- src/components/home/HeroVideo.tsx <!-- GAP-FIX: #33 -->
- src/features/content/\*

### What

- Implement each public page according to SRS Section 3 requirements with responsive behavior and API-backed data.
- **Home page (SRS 3.1):** Full-viewport hero video with poster image on mobile (< 768px) and `prefers-reduced-motion: reduce` fallback to static image. Four floating Off-Beat Gems cards with 5-second auto-rotate, swipeable on mobile. Resort Categories section (Elysian/Village cards). Amenities Snapshot using `GET /api/v1/amenities` (resort-level Amenity entity, not RoomType JSON). Facilities Carousel. Photo Gallery using `GET /api/v1/media?category=gallery&page=home` with accessible lightbox component (keyboard navigation: arrow keys, Escape to close; focus trap within overlay; alt text announced to screen readers). Map Section with Google Maps embed and "Get Directions" link. <!-- GAP-FIX: #18, #12, #21, #33 -->
- **Photo gallery lightbox component** (`src/components/common/Lightbox.tsx`): supports keyboard navigation (left/right arrows, Escape to close), traps focus within overlay while open, announces image alt text to screen readers. Reusable across pages. <!-- GAP-FIX: #21 -->
- **Map section component** (`src/components/common/MapSection.tsx`): renders Google Maps embed with branded pin. Includes fallback to static map image with "Open in Google Maps" link when Maps API is unavailable or fails to load. Coordinates read from SystemSetting. <!-- GAP-FIX: #31 -->
- **Amenities endpoint** (`GET /api/v1/amenities`): returns resort-level amenities from the Amenity entity (not RoomType JSON). Moved to Step 6 because the Home page depends on it. Sorted by sortOrder. Public, no auth required. <!-- GAP-FIX: #18 -->
- **Media endpoint** (`GET /api/v1/media`): public read access with filtering by category and page. Returns media assets for gallery display. Admin-only write operations deferred to Step 15. <!-- GAP-FIX: #12 -->
- Implement `GET /api/v1/restaurants/{id}` (public restaurant detail with description, cuisine type, operating hours, images). <!-- GAP-FIX: #8 -->
- Implement `GET /api/v1/facilities/{id}` (public facility detail with description, operating hours, images). <!-- GAP-FIX: #9 -->
- Implement `GET /api/v1/deals/{id}` (public deal detail with title, description, discount info, terms, validity dates, applicable room types). <!-- GAP-FIX: #10 -->
- Build event inquiry, contact, and newsletter flows with recaptcha verification and validation.
- **Newsletter subscription with double opt-in** per SRS 4.5: `POST /api/v1/newsletter/subscribe` generates a confirmation token, sends confirmation email via SendGrid with a verify link. `GET /api/v1/newsletter/confirm?token={token}` verifies the token and sets `isConfirmed=true` and `confirmedAt`. Only confirmed subscribers receive newsletters. <!-- GAP-FIX: #2 -->
- **Newsletter unsubscribe endpoint** (`POST /api/v1/newsletter/unsubscribe`): accepts email, sets `unsubscribedAt` timestamp. Every newsletter email must include an unsubscribe link. <!-- GAP-FIX: #11 -->
- Implement JSON-LD by page type and per-page SEO metadata per SRS specifications:
  - Home: `Hotel` schema
  - About: `Organization` schema
  - Facilities: `TouristAttraction`/`SportsActivityLocation` per facility
  - Restaurants: `Restaurant` schema per outlet with menu, price range, opening hours
  - Gems: `TouristAttraction` per gem
  - Events: `Event` schema per category
  - Deals: `Offer` schema per deal
  - Contact: `ContactPage` and `LocalBusiness`
- Implement empty/error/loading states consistently per SRS global state requirements.
- Contact form rate limited: max 3 submissions per IP per hour. Event inquiry form rate limited: max 5 submissions per IP per hour.
- Use realistic curated media and approved content copy package owned by Product and Marketing for all public sections.

### Testing

- Unit: page-level formatter and mapper utilities.
- Unit: newsletter double opt-in token generation and verification. <!-- GAP-FIX: #2 -->
- Unit: lightbox keyboard navigation and focus trap logic. <!-- GAP-FIX: #21 -->
- Integration: endpoint contracts and validation failures for all endpoints including new detail endpoints. <!-- GAP-FIX: #8, #9, #10 -->
- Integration: newsletter subscribe → confirm → unsubscribe flow. <!-- GAP-FIX: #2, #11 -->
- Integration: media gallery public endpoint returns filtered assets. <!-- GAP-FIX: #12 -->
- Integration: Google Maps fallback renders when embed fails. <!-- GAP-FIX: #31 -->
- E2E: key user paths across public pages and form submissions.
- Accessibility: automated checks for each page template.
- Accessibility: lightbox keyboard and screen reader behavior. <!-- GAP-FIX: #21 -->
- Performance: image lazy loading and LCP budget checks on Home.
- Performance: hero video poster image on mobile, prefers-reduced-motion handling. <!-- GAP-FIX: #33 -->

## Step 7: Rooms and Suites Catalog with Under-Construction and Notify Me

**Milestone:** M1 · **Estimated Effort:** 3–5 days · **PR:** Own PR merged to `main` — completes M1

### Files

- src/pages/rooms.tsx
- src/pages/api/v1/rooms/index.ts
- src/pages/api/v1/rooms/[id].ts
- src/pages/api/v1/buildings/index.ts <!-- GAP-FIX: #7 -->
- src/pages/api/v1/notify-me.ts
- src/features/rooms/\*

### What

- Implement room listing by resort toggle, tier filtering, and room details interactions.
- Implement `GET /api/v1/buildings` public endpoint to list all buildings with their resort campus association. Used by room filtering and resort detail sections. <!-- GAP-FIX: #7 -->
- Enforce under-construction behavior for Presidential and Royal room types: cards are visually distinct (greyed/outlined), display "Under Construction" badge, show "Notify Me" button instead of "Book This Room", display "Price TBD" instead of price.
- Implement notify-me capture endpoint with duplicate suppression (same email + roomTypeId returns 200 without creating duplicate) and success UX.
- Ensure Prayer Hut and shared amenity indicators render as required (items marked with \*\* shown with info tooltip "Subject to availability").
- Room type detail page/modal shows amenities categorized into "In-Room Amenities" (from RoomType.amenities JSON where category="in-room") and "Resort Amenities" (from RoomType.amenities JSON where category="resort-level"). This uses the structured JSON on RoomType, distinct from the resort-level Amenity entity used on the Home page. <!-- GAP-FIX: #4 -->
- Keep under-construction room cards visible in UI, but exclude them from bookable structured data offers.
- JSON-LD: `LodgingBusiness` with `makesOffer` listing each bookable room type (exclude under-construction from offers).
- Room cards: responsive layout — single column on mobile, 2-column tablet, 3-column desktop. Resort toggle becomes full-width tabs on mobile. Amenity details render as accordion on mobile, modal on desktop.

### Testing

- Unit: room filtering and amenity categorization utilities (both JSON-based and entity-based amenity systems). <!-- GAP-FIX: #4 -->
- Integration: room and notify APIs including duplicate notify behavior.
- Integration: buildings endpoint returns correct resort associations. <!-- GAP-FIX: #7 -->
- E2E: rooms browse, toggle, notify-me registration flow.
- Accessibility: modal or accordion semantics for amenity details.

## Step 8: Booking Engine Backend (Availability, Pricing, Booking Lifecycle)

**Milestone:** M2 · **Estimated Effort:** 8–10 days · **PR:** Own PR merged to `main`

### Files

- src/pages/api/v1/availability/index.ts
- src/pages/api/v1/availability/calendar.ts
- src/pages/api/v1/bookings/index.ts
- src/pages/api/v1/bookings/[ref].ts
- src/pages/api/v1/bookings/[ref]/cancel.ts
- src/pages/api/v1/bookings/[ref]/status.ts
- src/pages/api/v1/bookings/[ref]/confirmation.ts
- src/pages/api/v1/bookings/[ref]/pdf.ts
- src/pages/api/v1/deals/validate/[code].ts
- src/domain/booking/\*
- src/domain/booking/state-machine.ts
- src/services/pricing/\*

### What

- Implement booking domain rules: availability lock, per-night seasonal pricing, deals, tax, status transitions, cancellation refunds.
- Implement booking reference generation (alphanumeric, 8 chars, prefixed with "GAR-") and transactional concurrency controls (SELECT ... FOR UPDATE on room type unit count for requested date range to prevent double-booking).
- Implement confirmation PDF generation endpoint and confirmation resend endpoint.
- **Implement the full pricing engine per SRS 4.3 formula:** For each room in the booking, for each night: check SeasonalPrice records (latest createdAt takes precedence if overlapping), else use basePrice. Formula: `SUM(applicable_nightly_rate × quantity)` for all nights across all rooms = subtotal. Tax = `subtotal × tax_rate`. Deal discount logic: <!-- GAP-FIX: #5 -->
  - **Percentage discounts**: applied to the subtotal of ONLY the rooms whose roomTypeId appears in the deal's `applicableRoomTypeIds`. If a booking contains both applicable and non-applicable rooms, only the applicable rooms' subtotal is discounted. <!-- GAP-FIX: #5 -->
  - **Fixed discounts**: subtracted from the full subtotal after summing all rooms and nights. <!-- GAP-FIX: #5 -->
  - Deals apply within their valid date range regardless of seasonal pricing. Discount calculated on the effective (seasonal or base) price. <!-- GAP-FIX: #5 -->
  - Total = `subtotal − deal_discount + tax`.
- **Implement full booking state machine per SRS 4.3:** Pending → Confirmed → Checked-In → Checked-Out; Pending → Cancelled; Confirmed → Cancelled; Confirmed → No-Show. <!-- GAP-FIX: #19 -->
- **Implement no-show policy:** Admin can mark booking as "No-Show" starting 24 hours after scheduled check-in time (14:00 on check-in date). No-show bookings are not eligible for refund. Guard prevents marking no-show before the 24-hour window. <!-- GAP-FIX: #19 -->
- **Implement admin-initiated booking path:** When created by an admin role, bookings bypass payment flow — created with status "Confirmed" directly, `userId` is null, payment record is optional (gateway set to "cash" or "pos", status "success"). This supports walk-in, phone, and WhatsApp bookings processed by staff. The admin booking creation UI is deferred to Step 15 but the API must support it now. <!-- GAP-FIX: #20 -->
- Set fallback defaults when settings are unset: VAT 7.5%, pending booking expiry 30 minutes, cancellation windows per SRS (>=72h full refund, 24-72h 50%, <24h none).
- **Send confirmation email automatically** on status change to Confirmed, using the email service from Step 1. Email includes PDF attachment with booking details as specified in SRS 3.3 (logo, reference, guest info, dates, itemized rooms, totals, address, check-in/out times, cancellation policy summary). <!-- GAP-FIX: #24 -->
- Inventory locking: pending bookings reduce available count. Hold released on expiry or cancellation.
- Calendar availability endpoint returns per-day objects with date, available count, total count, and applicable price (base or seasonal) per SRS 4.3.
- Check-in/check-out times from SystemSetting displayed on confirmation page, email, and PDF.
- Multi-room bookings create one Booking record with multiple BookingLineItem records.
- Guest count validation: total guests must not exceed combined max guests of selected rooms.

### Testing

- Unit: pricing engine for multi-room and multi-night scenarios with seasonal pricing.
- Unit: pricing engine for deal discount with partial room applicability (percentage discount on subset of rooms). <!-- GAP-FIX: #5 -->
- Unit: pricing engine for fixed discount applied to full subtotal. <!-- GAP-FIX: #5 -->
- Unit: booking state machine transitions — valid and invalid transitions. <!-- GAP-FIX: #19 -->
- Unit: no-show eligibility guard (24h after check-in time). <!-- GAP-FIX: #19 -->
- Integration: booking creation transaction race-condition tests (two concurrent bookings for last unit).
- Integration: cancellation refund matrix tests (>=72h, 24-72h, <24h).
- Integration: admin-initiated booking creation with cash/POS payment. <!-- GAP-FIX: #20 -->
- Integration: confirmation email sent on booking confirmation. <!-- GAP-FIX: #24 -->
- Security: authorization checks for guest-own vs admin access.
- Performance: p95 latency checks for availability and booking endpoints (< 300ms target).

## Step 9: Payment Integration and Webhook Security

**Milestone:** M2 · **Estimated Effort:** 4–6 days · **PR:** Own PR merged to `main`

### Files

- src/pages/api/v1/payments/initiate.ts
- src/pages/api/v1/payments/verify.ts
- src/pages/api/v1/payments/[id].ts
- src/services/payments/paystack.ts
- src/services/payments/signature.ts
- src/services/payments/refund.ts <!-- GAP-FIX: #22 -->
- src/domain/payment/\*

### What

- Implement payment initiation and verification against Paystack.
- Enforce webhook signature verification using HMAC-SHA512 with raw body. **Disable Next.js automatic body parsing** for the webhook route (`export const config = { api: { bodyParser: false } }`) to access the raw request body needed for HMAC computation. <!-- GAP-FIX: #23 -->
- Implement timeout and expired pending booking handling, including refund trigger path.
- **Implement explicit race condition handling per SRS 4.3:** If a user completes payment for a booking that has already been expired by the background job, the payment verification handler checks if the booking is still in `Pending` status. If it has been expired, the payment is automatically refunded via Paystack Refunds API and the user is notified: "Your booking session expired. Your payment has been refunded. Please try again." <!-- GAP-FIX: #6 -->
- **Implement Paystack Refunds API integration** (`src/services/payments/refund.ts`): support full and partial refunds. Used by cancellation flow (full/50%/0% based on timing) and expired booking auto-refund. Payment entity status updated to `refunded` (full) or `partially_refunded`. <!-- GAP-FIX: #22 -->
- **Implement refund webhook handling:** Paystack sends webhook events when refund processing completes. Handle these events to update Payment status and send notification email to guest with refund amount and completion notice. <!-- GAP-FIX: #25 -->
- **Send refund notification emails:** Guest is notified via email when a refund is initiated (with refund amount and estimated 5–10 business day timeline) and again when the refund is completed (via Paystack refund webhook). <!-- GAP-FIX: #41 -->
- Add idempotency and replay protection for webhook processing.
- Implement Paystack only for v1.0 payment processing; do not implement Flutterwave fallback in this PR.
- **Implement graceful degradation for payment gateway downtime per SRS 5.4 and 8.1:** When Paystack API is unreachable or returns service errors, display "Online payment temporarily unavailable. Please contact us on WhatsApp to complete your booking." Pending booking is preserved for 2 hours instead of the standard 30 minutes to allow manual resolution. <!-- GAP-FIX: #3 -->

### Testing

- Unit: signature validator and webhook event parser.
- Unit: refund amount calculator (full/50%/none based on cancellation timing). <!-- GAP-FIX: #22 -->
- Unit: race condition detection logic (payment for expired booking). <!-- GAP-FIX: #6 -->
- Integration: initiate, verify, and reconciliation flows.
- Integration: refund initiation and webhook processing flow. <!-- GAP-FIX: #22, #25 -->
- Integration: payment gateway downtime detection and fallback behavior. <!-- GAP-FIX: #3 -->
- Security: invalid signature, replay, and tampered payload tests.
- Security: raw body parsing verification for webhook endpoint. <!-- GAP-FIX: #23 -->
- E2E: booking payment success and failure user journeys in sandbox mode.
- E2E: payment gateway unavailable fallback UX. <!-- GAP-FIX: #3 -->

## Step 10: Booking Wizard Frontend and Confirmation Experience

**Milestone:** M2 · **Estimated Effort:** 6–8 days · **PR:** Own PR merged to `main`

### Files

- src/pages/booking.tsx
- src/features/booking/context/BookingWizardContext.tsx
- src/features/booking/components/\*
- src/features/booking/schemas.ts
- src/features/booking/hooks/\*

### What

- Implement four-step wizard with date and guest selection, room selection, guest form, review and payment.
- Implement sticky summary sidebar on desktop and bottom sheet on mobile.
- Implement confirmation screen with booking reference, PDF download, and account navigation.
- Ensure query preselection behavior for room (`?room={roomTypeId}` pre-selects in Step 2) and deal (`?deal={dealId}` auto-applies discount, filters rooms to applicable types, displays deal banner) parameters.
- Step 1: Check-in date picker (blocks past dates), nights dropdown (1-30), auto-calculated check-out date. Adults (1-10) and children (0-10) stepper inputs.
- Step 2: Resort type and tier filter controls. Available rooms as selectable cards with per-night seasonal pricing. Zero-availability rooms shown greyed with "Unavailable." Under-construction rooms not displayed. "Add Room" supports multiple rooms per booking. Summary sidebar shows selected rooms.
- Step 3: Guest form with full name, email, phone (+234 format validated), special requests (max 500 chars).
- Step 4: Read-only summary with "Edit" links per section. Paystack inline checkout integration. Success/failure/timeout handling with user-facing messages per SRS 3.3.
- Booking summary sidebar: itemized rooms (per night × nights), dates, duration, guest count, subtotal, deal discount (if applicable with deal name), taxes (VAT), total in NGN, "Remove" per room.
- Confirmation screen: reference number prominently displayed, full summary, "Download Confirmation" (PDF), "Email Confirmation," "Contact Us on WhatsApp," "View My Bookings" link, "Return to Home."
- Persistent WhatsApp CTA: "Need help booking? Chat with us on WhatsApp."
- **Payment gateway downtime fallback UI:** When payment is unavailable, show "Online payment temporarily unavailable. Please contact us on WhatsApp to complete your booking." instead of Paystack checkout. <!-- GAP-FIX: #3 -->
- Date picker uses native mobile date input on touch devices. Form fields stack vertically on mobile. Room cards single column on mobile. Step indicator compact on mobile ("Step X of 4: {label}").

### Testing

- Unit: wizard reducer and form schema behavior.
- Integration: booking summary totals and edit-step navigation.
- Integration: deal preselection (room filtering, discount display).
- E2E: complete booking path from date selection to confirmation.
- E2E: payment gateway unavailable fallback displays correctly. <!-- GAP-FIX: #3 -->
- Accessibility: stepper semantics, focus management, and mobile interactions.
- Performance: interaction responsiveness on low-end mobile profile.

## Step 11: Guest Account and Booking Management

**Milestone:** M2 · **Estimated Effort:** 4–5 days · **PR:** Own PR merged to `main` — completes M2

### Files

- src/pages/account/index.tsx
- src/pages/account/bookings.tsx
- src/pages/account/profile.tsx
- src/features/account/\*
- src/pages/api/v1/bookings/index.ts
- src/pages/api/v1/auth/me.ts

### What

- Implement authenticated guest account area with booking list, detail, cancellation, resend confirmation, and profile settings.
- Implement status badges (color-coded per SRS 3.12: Confirmed=green, Pending=yellow, Cancelled=red, Checked-In=blue, Checked-Out=grey) and allowed actions per booking state:
  - Pending: "Complete Payment," "Cancel Booking"
  - Confirmed: "Cancel Booking," "Download Confirmation (PDF)," "Resend Confirmation Email," "Contact Us on WhatsApp"
  - Cancelled: "Refund Status" (shows refund amount and timeline)
  - Checked-Out: "Download Receipt (PDF)"
- Integrate cancellation modal with server-side refund preview data showing applicable refund amount based on cancellation policy and policy explanation text.
- For checked-out bookings with cash or POS, provide receipt PDF generation using stored booking totals and payment metadata (distinct from confirmation PDF — receipt variant shows payment method and settlement details). <!-- GAP-FIX: #45 -->
- **Profile Settings:** Editable fields (full name, phone), read-only email with change notice, and **Change Password section** (current password, new password, confirm new password) calling `PUT /api/v1/auth/me/password`. <!-- GAP-FIX: #1 -->
- Account page requires authentication — unauthenticated users redirected to `/login?redirect=/account`.
- Account navigation: sidebar on desktop, tab bar on mobile (My Bookings, Profile Settings).

### Testing

- Unit: status-to-action mapping logic.
- Unit: change password form validation (client-side). <!-- GAP-FIX: #1 -->
- Integration: profile update and booking action endpoints.
- Integration: change password flow via PUT /auth/me/password. <!-- GAP-FIX: #1 -->
- E2E: account login to booking management and cancellation flow.
- Security: enforce own-booking access only.

## Step 12A: Admin Shell, RBAC Guards, Bookings Operations, Offline Payments & Refunds, Room Status

**Milestone:** M3 · **Estimated Effort:** 7–9 days · **PR:** Own PR merged to `main`

> **Simplified Admin Rationale (PM Recommendation):** The SRS specifies a full CMS with 14 sidebar modules, Recharts dashboards, occupancy heatmaps, and broad CRUD. For v1.0, the admin panel will likely have 2–3 users. Step 12 is split so the operationally critical work ships first: **12A** builds (1) the admin shell, RBAC guards, and admin bootstrap, (2) **Bookings Management** including offline payments and manual refunds, and (3) **Room Status Management** with the Notify-Me trigger. **12B** adds the dashboard and analytics. All other admin CRUD modules (content, restaurants, facilities, gems, events, deals, contact, newsletter, media, users, settings, full room-type editing, seasonal pricing) remain deferred to Step 15. For general data inspection during v1.0, staff can use the **Supabase Dashboard** directly.

> **Product Decision (2026-10-16): Offline payments and manual refunds.** Guests who book through the WhatsApp concierge may pay by **bank transfer** instead of Paystack. Admins must be able to (a) record an offline payment (bank transfer, cash, POS) to confirm a booking, and (b) cancel such a booking and record a refund that is paid **outside Paystack**. Specified in **SRS v1.4** (§3.14.4, §4.3, §6, §7, §8.1).

### Files

- supabase/migrations/0009_admin_operations.sql <!-- M3-AUDIT: unit assignment, status history, cancellation reason, offline payments -->
- src/proxy.ts <!-- M3-AUDIT: Next 16 renamed Middleware to Proxy; nested `pages/admin/_middleware.ts` is not supported. Optimistic redirect only. -->
- src/lib/auth/admin-guard.ts <!-- M3-AUDIT: getServerSideProps role guard for every /admin page -->
- src/components/admin/AdminLayout.tsx
- src/components/admin/AdminSidebar.tsx
- src/components/admin/AdminTopbar.tsx
- src/components/admin/AdminBreadcrumb.tsx <!-- GAP-FIX: #38 -->
- src/components/admin/IdleTimeout.tsx
- src/pages/admin/index.tsx (shell landing; dashboard widgets arrive in Step 12B)
- src/pages/admin/bookings/index.tsx <!-- PM-REC: operationally critical -->
- src/pages/admin/bookings/[ref].tsx <!-- PM-REC: operationally critical -->
- src/pages/admin/bookings/new.tsx <!-- GAP-FIX: #20 — moved from Step 15 -->
- src/pages/admin/rooms/index.tsx <!-- PM-REC: room status management -->
- src/pages/api/v1/bookings/index.ts (admin filters/search; `bank_transfer` admin bookings)
- src/pages/api/v1/bookings/[ref]/status.ts (restricted transitions; unit assignment on check-in)
- src/pages/api/v1/bookings/[ref]/cancel.ts (admin cancellation, refund override, manual refund path)
- src/pages/api/v1/bookings/[ref]/offline-payment.ts (new)
- src/pages/api/v1/payments/[id]/refund.ts (new: record manual refund outcome, retry Paystack refund)
- src/pages/api/v1/payments/webhook.ts (`refund.failed` → `refund_failed`)
- src/pages/api/v1/rooms/[id].ts (add PUT; M3 accepts `status` only)
- src/pages/api/v1/rooms/[id]/units/index.ts (GET)
- src/pages/api/v1/rooms/[id]/units/[unitId].ts (PUT)
- src/services/notify-me/send-room-available.ts
- src/services/email/templates.ts (add `room_now_available`, offline-refund variants)
- scripts/create-admin-user.ts <!-- M3-AUDIT: admin bootstrap until Step 15 user management -->

### What

**Schema (`0009_admin_operations.sql`):**

- `bookings`: add `cancellation_reason` (`guest_request` | `admin_cancelled` | `payment_timeout` | `payment_after_expiry`), `cancelled_at`, `cancelled_by` (FK, nullable; null = system), `status_changed_by` (FK, nullable). Backfill rows tagged `[System: Cancelled due to payment timeout]` to `payment_timeout`. Update `expire_stale_pending_bookings()` to set the reason instead of appending to `special_requests`, so expired holds are no longer counted as real cancellations.
- `booking_status_history` (`booking_id`, `from_status`, `to_status`, `changed_by` nullable = system, `note`, `created_at`), written by an `AFTER INSERT OR UPDATE OF status` trigger on `bookings`. This captures every path (admin API, guest API, Paystack webhook, pg_cron), which `audit_logs` alone does not: today only cancel, claim, and status write audit rows.
- `booking_room_assignments` (`booking_id`, `booking_line_item_id`, `room_id`, `assigned_by`, `assigned_at`, `released_at`). A partial unique index on `room_id WHERE released_at IS NULL` prevents double-assigning a unit.
- `payments`: add status `refund_failed`. Constrain `gateway IN ('paystack','cash','pos','bank_transfer')`. Add `refund_method` (`paystack` | `bank_transfer` | `cash` | `pos_reversal`), `refund_reference`, `refund_processed_by`, `refund_note`. **Never store full bank account numbers.** Record only bank name and last 4 digits in `metadata.refundDestination`.
- Confirm the locking availability path (`check_room_availability`) subtracts `maintenance` units, as `get_stay_availability` does (SRS 4.2).

**Access control (Next 16 Pages Router):**

- Authorization is enforced in two places: `requireAdminPage(roles)` in `getServerSideProps` of every `/admin` page (reads the Supabase session cookie and loads the role), and the existing `withApi({ requiredRoles })` on every admin API. `src/proxy.ts` only does an optimistic redirect to `/login?redirect=/admin` when no session cookie is present. The Next 16 docs state Proxy is not an authorization layer.
- Role matrix per SRS 4.1 / 2.3:
  - **Content Manager:** Dashboard (non-financial), Bookings **read-only** (no action buttons; every booking mutation returns 403), content modules shown as "Coming Soon". Rooms & Buildings, Users, and System Settings are hidden.
  - **Resort Admin:** everything except Users and System Settings.
  - **Super Admin:** everything.
- Admin idle timeout (plan addition, not in SRS): a client idle timer (30 minutes, reset on activity) calls `/api/v1/auth/logout` and redirects to `/login?redirect=<page>&reason=idle`. The page guard also rejects a session whose HttpOnly `gar_admin_last_seen` cookie is older than 30 minutes.
- Admin bootstrap: `scripts/create-admin-user.ts` (service-role) creates the auth user, sets the role, and sends a password-set link. Admin self-registration stays impossible (SRS 4.1). This unblocks Data Day 2 until Step 15 delivers user management.

**Admin shell:**

- Protected shell, desktop-first, functional on tablet ≥ 768px (SRS 3.14). Distinct layout from the public site.
- Collapsible sidebar with all SRS 3.14.1 modules. Unbuilt modules are greyed out with a "Coming Soon" tooltip, and items are filtered by role.
- AdminTopbar: user name, role badge, "View Site" (new tab), logout, notification bell (counts wired in Step 12B). <!-- GAP-FIX: #39 -->
- AdminBreadcrumb for nested pages. <!-- GAP-FIX: #38 -->

**Bookings Management (`/admin/bookings`):**

- **Table:** reference, guest name, channel, check-in, check-out, rooms, total, booking status, payment/refund status, created date.
  - Filters: status, channel (`online_guest` / `online_account` / `walk_in`), payment status, check-in date range, resort. Quick filter **"Refunds to process"** shows `refund_pending` with a manual method, plus `refund_failed`.
  - Search: reference, guest name, guest email.
  - Extend `GET /api/v1/bookings` (today it filters only status, reference, and guestEmail) with `checkInFrom`, `checkInTo`, `resort`, `channel`, `paymentStatus`, and `q`.
- **Detail (`/admin/bookings/{ref}`):** guest info; linked account or "Guest checkout"; channel and source (WhatsApp / phone / front desk); privacy-consent timestamp; rooms; pricing breakdown; deal; special requests; payment panel (gateway, reference, amount, paid at, refund amount/status/method/reference); assigned units; status-history timeline from `booking_status_history` with admin notes from `audit_logs` (null actor shown as "System").
- **Status actions** via `PUT /bookings/{ref}/status`, now limited to `checked_in`, `checked_out`, and `no_show`:
  - **Mark Checked-In:** the admin assigns one available unit per booked room (count = line-item quantity). One transaction (RPC) inserts the assignments and sets those units to `occupied`.
  - **Mark Checked-Out:** releases the assignments and sets the units back to `available`.
  - **Mark No-Show:** existing 24-hour guard.
  - The endpoint **rejects `cancelled` and `pending → confirmed`**. Today both are accepted, which lets an admin cancel without the refund flow or confirm without payment. Cancellation must go through `/cancel`. Confirmation must go through payment verification or the offline-payment endpoint.
- **Record Offline Payment** (pending bookings, e.g. a guest who paid by bank transfer through the WhatsApp concierge, including the SRS 8.1 gateway-downtime fallback): `POST /bookings/{ref}/offline-payment` with `{ method: bank_transfer | cash | pos, amount, reference, paidAt, note }`.
  - The amount must equal the booking total; part-payments are out of scope for v1.0.
  - Bank-transfer references are required and unique (`uq_payments_gateway_reference`).
  - One transaction inserts a `success` payment and moves pending → confirmed, but only if the booking is still `pending`. If the hold has expired, it returns 409 with guidance to create a new admin booking.
  - Triggers the confirmation email with PDF. Audit-logged.
- **Admin-Initiated Booking (`/admin/bookings/new`):** the public booking fields plus source (WhatsApp / phone / front desk), payment method (`cash` | `pos` | `bank_transfer`), and payment reference (required for bank transfer).
  - Creates a Confirmed booking with `channel = 'walk_in'` and `userId = null`.
  - A real reference replaces the synthetic `…-WALKIN-…` gateway reference.
- **Cancellation & Refunds** (SRS 3.14.4, extended by the product decision above):
  - "Cancel Booking" opens a modal with the refund calculator (`GET /bookings/{ref}/cancel`): hours until check-in, policy tier, amount paid, refund amount.
  - **Admin override** (Resort Admin+): the refund amount may be changed within 0 to the amount paid, with a mandatory reason. Audit-logged; sets `cancellation_reason = 'admin_cancelled'`.
  - **Paystack payments:** refunded through the Paystack Refunds API as today. If Paystack rejects the refund, the admin can choose **"Refund manually instead"** and switch to the manual path instead of being blocked.
  - **Offline payments (bank transfer, cash, POS): no Paystack call.**
    - The booking becomes Cancelled and the payment becomes `refund_pending`. The admin picks `refund_method` (bank transfer, cash, or POS reversal), and the refund amount is stored.
    - The guest receives `booking_refund_initiated`, stating the refund will be paid by bank transfer and staff may contact them for account details.
    - A guest who self-cancels an offline-paid booking through the manage link lands in the same "Refunds to process" queue.
  - **Record refund outcome:** `POST /api/v1/payments/{id}/refund` with `{ action: mark_processed | mark_failed | retry_paystack, reference, refundedAt, destination: { bankName, accountLast4 }, note }`.
    - `mark_processed` → `refunded` / `partially_refunded` with `refunded_at`, `refund_reference`, and `refund_processed_by`, and sends `booking_refund_completed`.
    - `mark_failed` → `refund_failed`; the refund stays in the queue.
  - The UI shows refund status as Pending (`refund_pending`) → Processed (`refunded` / `partially_refunded`) → Failed (`refund_failed`).
  - The Paystack `refund.failed` webhook sets `refund_failed`. Today it is only logged and the payment stays `refund_pending` forever.
  - Only Resort Admin and Super Admin may cancel, record payments, or record refunds.
- **Audit logging** (SRS 5.3) for status changes, offline payments, cancellations (including overrides), refund outcomes, unit status changes, room-type status changes, and admin booking creation.

**Room Status Management (`/admin/rooms`, Resort Admin+):**

- Room types table (name, building, tier, status, units), filterable by resort, tier, and status.
- **Room-type status toggle** (`under_construction` ↔ `available`) via `PUT /api/v1/rooms/{id}`. In M3 that endpoint accepts only `status`; full room-type editing and seasonal pricing stay in Step 15.
- Units view via `GET /rooms/{id}/units`, with inline unit-status edit via `PUT /rooms/{id}/units/{unitId}`. Admins can set `available` or `maintenance`; `occupied` is set only by check-in and check-out. Setting `maintenance` on a unit with an active assignment is blocked.
- **Notify-Me (SRS 4.5), owned by this step:**
  - When a room type flips `under_construction` → `available`, a batch send runs after the response to every registration with `is_notified = false` for that room type.
  - New template `room_now_available`: subject "Great News — {Room Type Name} is Now Available at Grace Arena Resorts!"; body with room name, tier, ₦ price per night, hero image, description, and a "Book Now" button to `/booking?room={roomTypeId}`.
  - On success: `is_notified = true`, `notified_at = NOW()`.
  - Failures go to `failed_emails` with a `retry_handler`, and the Step 13 retry job retries them (up to 3×, exponential backoff).
  - Re-toggling never re-sends to rows already notified.

### Testing

- Unit: role guards, role-filtered sidebar, refund-override bounds, unit-assignment count validation.
- Integration: status endpoint rejects `cancelled` and `pending → confirmed`; check-in assigns units and sets them occupied; check-out releases them.
- Integration: offline payment confirms a pending booking; rejects expired holds, amount mismatches, and duplicate references.
- Integration: admin cancellation of a bank-transfer booking makes **no Paystack call** and sets `refund_pending`; `mark_processed` / `mark_failed` transitions and emails; guest self-cancel of an offline booking enters the queue; Paystack `refund.failed` → `refund_failed`; "Refund manually instead" after a Paystack rejection.
- Integration: a room-type status flip sends Notify-Me exactly once; failed sends are queued for retry.
- Integration: `booking_status_history` records API, webhook, and cron transitions.
- Security: Content Manager gets 403 on every booking mutation and room endpoint; guests and anonymous users get 403 on all admin APIs; IDOR checks on `/payments/{id}/refund` and `/bookings/{ref}/offline-payment`.
- E2E: unauthorized redirect to `/login?redirect=/admin`; WhatsApp concierge journey: create a bank-transfer admin booking → cancel → record the manual refund as processed.
- Accessibility: keyboard navigation and heading structure in the admin shell.

## Step 12B: Admin Dashboard and Analytics

**Milestone:** M3 · **Estimated Effort:** 4–5 days · **PR:** Own PR merged to `main`

### Files

- src/pages/admin/index.tsx (dashboard widgets)
- src/components/admin/dashboard/\* (MetricCard, BookingsRevenueChart, OccupancyHeatmap, ActivityFeed, QuickActions)
- src/pages/api/v1/analytics/bookings.ts
- src/pages/api/v1/analytics/revenue.ts
- src/pages/api/v1/analytics/occupancy.ts
- src/pages/api/v1/admin/summary.ts <!-- M3-AUDIT: plan addition; SRS §7 limits all analytics to Resort Admin+, so the Content Manager dashboard needs a non-financial source -->

### What

- Analytics endpoints are Resort Admin+ (SRS §7). The Content Manager dashboard uses only `/api/v1/admin/summary` (non-financial KPIs, unread counts, activity feed, bell counts) and never receives revenue fields.
- Metric cards per SRS 3.14.2: total bookings (today / week / month), revenue (today / week / month; Resort Admin+), occupancy rate (today), pending bookings, unread contact submissions (status `new`), unread event inquiries (status `new`).
- Bookings chart: booking count and revenue over the last 30 days (Recharts).
- Occupancy heatmap: current and next month.
- SRS 4.6 metrics: average stay duration, deal redemptions (promo-code usage), revenue by room type, contact submissions by status/subject, newsletter subscriber total and growth. **Page Views (GA)** is deferred to Step 15 because it needs GA4 Data API credentials; record it in the deferrals list.
- **Metric definitions** (documented in code and the API docs):
  - Revenue = successful payments (all gateways, including offline) by `paid_at`, minus processed refunds by `refunded_at`, with a breakdown by gateway.
  - Bookings are counted by `created_at`. `payment_timeout` cancellations are excluded and shown separately as "expired holds".
  - Occupancy = occupied units (confirmed + checked-in; pending holds excluded) / bookable units per night. The denominator excludes `under_construction` room types and `maintenance` units.
  - All date bucketing uses resort time (WAT).
- Recent activity feed: the last 10 events from `booking_status_history`, admin `audit_logs`, contact submissions, and event inquiries.
- Notification bell: new bookings since the admin last looked, new contact submissions, new event inquiries, refunds to process.
- Quick actions: "Create Booking" → `/admin/bookings/new` (built in 12A). "Add Deal" and "Upload Media" are disabled "Coming Soon" until Step 15.
- Optional, not SRS-required: average daily rate and revenue by campus, only if time permits.
- Analytics queries run as SQL views/RPCs with p95 < 300 ms at seed volume.

### Testing

- Integration: Content Manager gets 403 on all three analytics endpoints; `/admin/summary` returns no financial fields for Content Manager.
- Unit: metric calculations (occupancy denominator, revenue net of refunds, WAT bucketing, expired holds excluded).
- E2E: dashboard renders for Resort Admin (with revenue) and Content Manager (without revenue).

## Step 13: Observability, SEO Finalization, Background Job Scheduling, and Operational Hardening

**Milestone:** M3 · **Estimated Effort:** 4–5 days · **PR:** Own PR merged to `main`

> **Correction (M3 audit):** Earlier revisions listed Supabase Edge Functions under `supabase/functions/*`. They do not exist and are not needed. Pending expiry and deal deactivation are SQL functions scheduled by pg_cron (migrations 0006/0007). Email retry is an API route (`src/pages/api/v1/internal/jobs/retry-failed-emails.ts`) that is **not scheduled anywhere today**: 0006 only unschedules `retry-failed-emails`. Notify-Me is event-driven in Step 12A.

### Files

- src/pages/sitemap.xml.ts
- src/pages/robots.txt.ts
- src/lib/seo/structured-data/\* (or additions to `src/lib/seo/meta.ts`)
- instrumentation.ts + Sentry client/server config (see `node_modules/next/dist/docs/02-pages/02-guides/instrumentation.md`)
- src/lib/monitoring/sentry.ts (PII and token scrubbing)
- src/pages/api/v1/health.ts (uptime-monitor target)
- supabase/migrations/0010_job_schedules.sql (pg_cron + pg_net retry schedule, access-token purge)
- supabase/config.toml (`jwt_expiry`)
- docs/operations/runbook.md

### What

- **SEO:**
  - Sitemap covers public pages only. It excludes `/booking`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/account`, `/manage-booking`, and `/admin`. Generated per request, so it updates on content change.
  - `robots.txt` disallows `/admin`, `/api`, `/account`, `/booking`, and `/manage-booking`.
  - `noindex` on auth, account, and manage-booking pages. None was found on `/account` or `/manage-booking` during the audit.
  - JSON-LD coverage per SRS 4.6 schemas; add `og:url` alongside the canonical URL.
- **Sentry:**
  - Client and server monitoring via Next 16 instrumentation, with error and performance tracing.
  - `beforeSend` / `beforeBreadcrumb` scrub PII (email, phone, names), auth headers, and the `t` query parameter (the booking access token in manage-booking links) per SRS 5.3. No session replay.
  - Alert rules: error-rate spike, API p95 > 300 ms, webhook failures, job failures, new `refund_failed` payments.
- **GA4:** strip `t` from `page_location` before sending `page_view`.
- **Background jobs:**
  - `expire_stale_pending_bookings` (pg_cron, every 5 min; exists): verify the per-booking hold, including the 2-hour gateway-downtime window (SRS 8.1), and that it sets `cancellation_reason = 'payment_timeout'` after 0009.
  - `deactivate_expired_deals` (pg_cron, daily; exists): verify.
  - **Failed email retry (every 10 min; must be scheduled in this step):** pg_cron + pg_net POST to the retry route with `Authorization: Bearer $CRON_SECRET`, with the secret stored in Supabase Vault. This is preferred because Vercel Hobby crons run at most daily; `vercel.json` crons are the alternative on Vercel Pro.
    - Add `CRON_SECRET` to Vercel.
    - Retries up to 3× with exponential backoff.
    - Exhausted retries trigger a staff alert email and a Sentry event (SRS 8.4).
  - **Booking access-token purge (daily, new):** delete `booking_access` tokens past expiry (30 days after check-out; SRS v1.3).
  - Notify-Me batch sends are event-driven (Step 12A); their failures flow through the retry job.
- **Auth hardening:** set `jwt_expiry = 900`. SRS 4.1 requires 15-minute access tokens; `supabase/config.toml` currently has 3600. Re-verify the refresh flow, "Remember me", and the admin idle timeout.
- **Reliability (SRS 5.4):** confirm Supabase daily backups with 30-day retention and point-in-time recovery (Pro plan). Configure an uptime monitor on `/` and `/api/v1/health`.
- **Security:** verify headers (CSP, HSTS, Referrer-Policy), run `npm audit`, and run a secret scan (gitleaks).
- **Runbook:** incident response, alert thresholds, job monitoring (`SELECT * FROM cron.job_run_details`), rollback, and the offline-payment / manual-refund SOP with daily bank reconciliation.

### Testing

- Integration: sitemap and robots inclusion/exclusion, including `/manage-booking`.
- Integration: the retry schedule exists in `cron.job`; the route rejects a missing or invalid secret; backoff and the 3-attempt cap; alert on exhaustion.
- Integration: expiry sets `cancellation_reason` and writes status history; deal auto-deactivation; access-token purge. <!-- GAP-FIX: #26 -->
- Unit: Sentry/GA scrubbing removes the `t` token and email addresses.
- Performance: Core Web Vitals smoke run against public pages.
- Security: dependency audit, secret scan, headers verification.

## Step 14: End-to-End Quality Gate, Documentation, and Release Readiness

**Milestone:** M3 · **Estimated Effort:** 4–6 days · **PR:** Own PR merged to `main` — completes M3

### Files

- vitest.config.ts (coverage thresholds)
- playwright.config.ts
- src/\*\*/\_\_tests\_\_/\*\* (unit and integration tests follow the existing co-located convention, not a top-level `tests/` folder)
- e2e/\*\*/\*.spec.ts (Playwright; `@smoke` tags)
- e2e/accessibility/\*\*/\*.spec.ts (`@axe-core/playwright`)
- lighthouserc.json (Lighthouse CI)
- load/k6-booking.js
- .github/workflows/ci.yml
- docs/testing/strategy.md
- docs/api/openapi (generated)
- docs/release/checklist.md
- docs/accessibility/manual-audit-checklist.md <!-- GAP-FIX: #36 -->

### What

- Install `@playwright/test`, `@axe-core/playwright`, and `@lhci/cli`. Add the `test:e2e`, `test:a11y`, and `lhci` scripts; none exist today.
- **CI pipeline:**
  - Triggers: pull requests to `main` and `develop`; pushes to `develop` and `main`. The active integration branch is `develop`.
  - Steps: lint, Prettier check, typecheck, `test:coverage` (not `test`, so thresholds are enforced), build, e2e smoke against `next start` with local Supabase (`supabase start`), axe checks, and Lighthouse CI on public pages.
  - Full regression runs nightly on a schedule. <!-- GAP-FIX: #35 -->
- Coverage threshold in `vitest.config.ts`: ≥ 70% for backend business logic (`src/pages/api/**`, `src/domain/**`, `src/services/**`) per SRS 5.5.
- **OpenAPI:** generated from the Zod schemas and served at `/api/docs` in development only (SRS 2.7.4 / 5.5), instead of a hand-written YAML file.
- **Core Web Vitals (SRS 5.1)** <!-- GAP-FIX: #27 -->:
  - Lighthouse CI assertions: LCP < 2.5 s (4G throttling), CLS < 0.1, TTFB < 600 ms.
  - Chrome retired **FID** in 2024 and lab tools cannot measure it. Measure INP < 200 ms from field data (`web-vitals` / Vercel Speed Insights) and TBT < 200 ms in the lab as a proxy, per SRS v1.4 §5.1.
- **Load test (SRS 5.1)** <!-- GAP-FIX: #40 -->: **run** k6 at 500 concurrent virtual users against staging (browse, availability, booking creation with Paystack sandbox) before launch. API p95 < 300 ms is measured in this run. Results go in `docs/testing/strategy.md`. Required for M3 exit.
- **Manual accessibility audit** <!-- GAP-FIX: #36 -->: write the checklist (NVDA and VoiceOver, contrast for all text and interactive elements, focus management for modals, dropdowns, and dynamic content) **and complete** the audit before launch.
- **i18n readiness** <!-- GAP-FIX: #13 -->: audit that all user-facing strings, including the new admin strings, use the translation helper.
- **Security:** privilege-escalation and IDOR regression tests for every M3 admin endpoint (moved from Step 15, because these endpoints ship in M3); static dependency and secret scanning.
- **Release checklist** includes:
  - reCAPTCHA v3 on booking creation (SRS v1.3: "planned before production launch")
  - branch protection on `main` (SRS 5.5)
  - `CRON_SECRET`, Sentry DSN, and GA4 configured
  - Paystack live keys
  - admin accounts bootstrapped
  - offline-payment SOP signed off
  - the SRS deferrals list (Step 15 scope, GA page views, SMS)

### Testing

- Unit and integration: full suite passes with coverage thresholds enforced.
- E2E: critical guest journeys and admin journeys (booking management, offline payment, manual refund) pass.
- Accessibility: automated axe-core checks pass on representative public and admin pages.
- Performance: Lighthouse CI meets LCP, CLS, and TTFB; field INP is monitored; the k6 run meets API p95 < 300 ms at 500 virtual users.
- Security: privilege-escalation, IDOR, dependency, and secret scans pass.

## Step 15: Follow-up PR Plan - Admin CRUD Breadth (Deferred)

### Files

- src/pages/admin/rooms/new.tsx, src/pages/admin/rooms/[id]/\*.tsx (full room-type CRUD, seasonal pricing)
- src/pages/admin/content/\*.tsx
- src/pages/admin/restaurants/\*.tsx
- src/pages/admin/facilities/\*.tsx
- src/pages/admin/gems/\*.tsx
- src/pages/admin/events/\*.tsx
- src/pages/admin/deals/\*.tsx
- src/pages/admin/contact/\*.tsx
- src/pages/admin/newsletter/\*.tsx
- src/pages/admin/media/\*.tsx
- src/pages/admin/users/\*.tsx
- src/pages/admin/settings/\*.tsx
- src/pages/api/v1/admin/settings.ts
- src/pages/api/v1/admin/users/\*.ts
- src/pages/api/v1/media/\*.ts (admin write operations)
- src/pages/api/v1/events/inquiries/\*.ts

### What

- Move broad admin CRUD implementation to a dedicated follow-up PR to keep the core delivery PR reviewable and lower regression risk.
- Already delivered in M3 (not repeated here): bookings management, admin-initiated booking UI (GAP-FIX #20), offline payments and manual refunds, room-type status toggle, unit status management, and Notify-Me batch notifications (Step 12A).
- Implement all specified CMS modules with searchable lists, CRUD forms, soft-delete patterns, and module-level permissions.
- Implement full room-type editing, room pricing management (seasonal price CRUD with overlap validation), media validation and reference checks (MIME type: JPEG/PNG/WebP max 10MB, MP4 max 100MB), image auto-optimization on upload (resize, compress, WebP conversion), and super-admin user/settings modules. <!-- GAP-FIX: #43, #15 (file upload validation) -->
- Implement admin CRUD endpoints for all entity types deferred from Steps 6-7: POST/PUT/DELETE for rooms, buildings, facilities, restaurants, gems, events, deals, content pages, amenities.
- Implement admin users endpoints: GET /admin/users, PUT /admin/users/{id}/role, PUT /admin/users/{id}/status (replaces `scripts/create-admin-user.ts`).
- Implement admin settings endpoints: GET /admin/settings, PUT /admin/settings.
- Implement the dashboard **Page Views** metric (GA4 Data API) deferred from Step 12B, and enable the "Add Deal" / "Upload Media" quick actions.
- Suggested follow-up branch: feature/gar-admin-crud-phase-2

### Testing

- Unit: admin form schema validations and table filter logic.
- Integration: CRUD endpoint coverage and permission checks.
- Integration: media upload MIME/size validation. <!-- GAP-FIX: #43 -->
- E2E: one end-to-end scenario per module class (content, inventory, inquiries, settings).
- Security: IDOR and privilege escalation regression tests for the new Step 15 endpoints.
- Security: file upload validation bypass tests. <!-- GAP-FIX: #15 (file upload) -->

# Risks and Assumptions

- Risk: Even with scope split, the core PR remains broad and requires strict review checkpoints.
- Risk: Third-party service setup delays (Paystack, SendGrid, reCAPTCHA, Maps) can block end-to-end validation. **Mitigation:** Set up sandbox/test accounts for all third-party services in Sprint 0 before development begins. <!-- GAP-FIX: risk mitigation -->
- Risk: CMS UI breadth may exceed timeline without strict component reuse and prioritization.
- Risk: Vercel KV provisioning delay can block rate limiting implementation. **Mitigation:** Implement in-memory rate limiter as development fallback with Vercel KV adapter swap for staging/production. <!-- GAP-FIX: risk mitigation -->
- Risk: SendGrid email service provisioning delay can block auth and booking email flows. **Mitigation:** Email service abstraction allows swapping to a console/log transport for local development. <!-- GAP-FIX: risk mitigation -->
- Risk: Domain and SSL certificate provisioning delay (SRS 2.6). **Mitigation:** Use Vercel preview URLs for pre-production validation. <!-- GAP-FIX: risk mitigation -->
- Risk: Offline (bank transfer) payments and manual refunds depend on staff confirming money actually moved, so there is no gateway verification. **Mitigation:** Resort Admin+ only, mandatory unique transfer reference, full audit log, a "Refunds to process" queue, and daily bank reconciliation in the runbook. <!-- M3-AUDIT -->
- Risk: Vercel Hobby crons run at most daily, so the 10-minute email retry cannot use `vercel.json` there. **Mitigation:** schedule it with pg_cron + pg_net (Step 13). <!-- M3-AUDIT -->
- Resolved: SRS v1.4 (2026-10-16) adds the `bank_transfer` gateway with manual refunds and replaces FID with INP, so the plan has no open SRS deviations for M3. <!-- M3-AUDIT -->
- Assumption: Supabase project, service role key, and required extensions (pg_cron, pgcrypto) are available early.
- Assumption: Realistic media assets and realistic price fixtures are approved for repository seed usage.
- Assumption: Legal copy owner is the Data Protection Officer or delegated Compliance Owner, coordinated by Product.
- Assumption: Pages Router remains the chosen architecture for v1.0.
- Assumption: Node.js 20 LTS runtime is used for Vercel serverless functions per SRS 2.4. <!-- GAP-FIX: risk mitigation -->
- Assumption: Supabase provides encryption at rest (AES-256) for the managed PostgreSQL instance, satisfying SRS 5.3 data-at-rest encryption requirement. If self-managed, encryption must be configured explicitly. <!-- GAP-FIX: #14 (AES-256) -->

# Single-PR Commit Sequencing Summary

1. chore: foundation, dependencies, env contract, shared libs, i18n, email service, formatters <!-- GAP-FIX: #13, #14, #42 -->
2. feat: database schema, migrations, seeds, RLS, storage buckets, pg_cron setup <!-- GAP-FIX: #16, #17 -->
3. feat: API middleware stack, auth context, security primitives
4. feat: auth pages, auth endpoints, change-password endpoint <!-- GAP-FIX: #1 -->
5. feat: global shell, consent, accessibility baseline, page transitions <!-- GAP-FIX: #34 -->
6. feat: public content pages, supporting APIs, amenities endpoint, media endpoint, newsletter double opt-in, lightbox <!-- GAP-FIX: #2, #8, #9, #10, #11, #12, #18, #21 -->
7. feat: rooms catalog, buildings endpoint, notify-me <!-- GAP-FIX: #7 -->
8. feat: booking domain APIs, pricing logic with deal partial-applicability, no-show, admin-initiated booking API <!-- GAP-FIX: #5, #19, #20 -->
9. feat: payment integration, secure webhook, refund API, gateway degradation, race condition handling <!-- GAP-FIX: #3, #6, #22, #23, #25 -->
10. feat: booking wizard frontend, confirmation UX, payment fallback UI <!-- GAP-FIX: #3 -->
11. feat: guest account, booking management, change password UI <!-- GAP-FIX: #1 -->
    12A. feat: admin shell, RBAC guards, bookings operations, offline payments and manual refunds, room status, notify-me trigger <!-- GAP-FIX: #20, #38, #39; M3-AUDIT -->
    12B. feat: admin dashboard KPIs, analytics endpoints, activity feed <!-- M3-AUDIT -->
12. feat: observability, SEO completion, job scheduling, auth and reliability hardening <!-- GAP-FIX: #26; M3-AUDIT -->
13. chore: full test matrix, CI gates, CWV targets, load test, manual audit, docs, release readiness <!-- GAP-FIX: #27, #36, #40 -->
14. docs: follow-up PR plan for full admin CRUD breadth
