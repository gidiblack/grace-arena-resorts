---
goal: Grace Arena Resorts SRS v1.2 Implementation Plan
version: 1.1
date_created: 2026-03-29
last_updated: 2026-03-29
owner: Engineering Team
status: Planned
tags: [feature, architecture, migration, qa, security]
---

# Title

Grace Arena Resorts SRS v1.2 Full-Stack Implementation Plan

# Branch

feature/gar-srs-v1-full-implementation

# Description

This plan converts the authoritative requirements in docs/GAR-SRS.md into one dedicated feature branch and one PR for the core guest-facing platform and admin foundation, using commit-sized, testable steps for a Next.js 16 Pages Router and TypeScript codebase. The current repository is an early scaffold with Chakra UI setup, a single home page, and one sample API route. The plan therefore starts with foundational architecture and delivery tooling, then progresses through public pages, booking engine, account flows, admin foundation, and final quality gates. The full admin CRUD breadth is intentionally moved to a follow-up PR to reduce review risk.

# Goal

Deliver an SRS-aligned v1.0 implementation baseline that includes:

- Public marketing site pages and SEO foundations
- Room browsing and under-construction notify flow
- Authenticated booking engine with payment and PDF confirmation
- Guest account management
- Admin foundation for operational management (shell, RBAC, analytics)
- Security, accessibility, performance, and test coverage gates required by the SRS

# Implementation Steps

## Step 1: Repository Foundation, Standards, and Environment Contract

### Files

- package.json
- .env.example
- src/config/env.ts
- src/lib/logger.ts
- src/lib/errors.ts
- src/lib/http/response.ts
- src/lib/http/validation.ts
- src/types/api.ts
- README.md

### What

- Add all missing runtime and testing dependencies required by SRS stack (Supabase client, React Hook Form, Zod, dayjs, Paystack SDK/client wrapper, SendGrid client, testing stack, accessibility and e2e tooling).
- Define centralized typed environment parsing and startup validation.
- Define API envelope standard and shared error model used across all endpoints.
- Add baseline project conventions for folder layout under src for pages, features, domain, services, and tests.
- Add implementation guardrails for Pages Router + TypeScript strict mode.
- Standardize production and staging secret names in .env.example and document promotion rules for Vercel environments.

### Testing

- Unit: env parser and response envelope utilities.
- Integration: boot test that fails fast when required env vars are missing.
- Security: verify secrets are never logged by logger redaction tests.

## Step 2: Supabase Schema, Migrations, Seed Data, and RLS Baseline

### Files

- supabase/config.toml
- supabase/migrations/0001_init_schema.sql
- supabase/migrations/0002_rls_policies.sql
- supabase/migrations/0003_functions_triggers.sql
- supabase/migrations/0004_seed_reference_data.sql
- supabase/seed.sql
- src/types/db.ts

### What

- Implement the relational schema from SRS Section 6 with UUID keys, enums, indexes, constraints, and timestamps.
- Create RLS policies matching authorization matrix in SRS Section 4.1.
- Add SQL functions for availability checks, pricing helpers, and booking reference generation.
- Add seed records for resorts, buildings, room types, amenities, facilities, restaurants, and baseline system settings.
- Include realistic seeded pricing and realistic media URLs suitable for demos, QA, and stakeholder review.

### Testing

- Integration: migration apply and rollback in isolated local database.
- Integration: RLS policy tests per role (guest, content manager, resort admin, super admin).
- Security: verify guest role cannot read admin-only tables and cannot mutate other guest records.

## Step 3: API Core, Auth Session Handling, Rate Limiting, and Middleware

### Files

- src/pages/api/v1/\_shared/handler.ts
- src/pages/api/v1/\_shared/auth.ts
- src/pages/api/v1/\_shared/rate-limit.ts
- src/pages/api/v1/\_shared/recaptcha.ts
- src/pages/api/v1/\_shared/pagination.ts
- src/pages/api/v1/\_shared/audit-log.ts
- src/lib/supabase/server.ts
- src/lib/security/csrf.ts
- src/lib/security/headers.ts

### What

- Build composable API handler wrappers for method guards, schema validation, authentication, role checks, pagination, and standardized errors.
- Implement session extraction for Supabase auth and role claim parsing.
- Implement rate limiting adapters for auth/contact/events/newsletter/notify endpoints.
- Add reCAPTCHA verification utility with score threshold handling.
- Add security headers and CSRF protections per SRS requirements.
- Use Vercel KV as the rate-limiter backing service for auth, contact, event, newsletter, and notify endpoints.

### Testing

- Unit: auth role parser, rate limit adapter behavior, and captcha verifier.
- Integration: representative API route wrapped with middleware stack.
- Security: CSRF and header assertions for mutating endpoints.

## Step 4: Authentication and User Profile Vertical Slice

### Files

- src/pages/register.tsx
- src/pages/login.tsx
- src/pages/forgot-password.tsx
- src/pages/reset-password.tsx
- src/pages/api/v1/auth/register.ts
- src/pages/api/v1/auth/login.ts
- src/pages/api/v1/auth/refresh.ts
- src/pages/api/v1/auth/logout.ts
- src/pages/api/v1/auth/forgot-password.ts
- src/pages/api/v1/auth/reset-password.ts
- src/pages/api/v1/auth/me.ts
- src/pages/api/v1/auth/resend-verification.ts
- src/features/auth/schemas.ts
- src/features/auth/components/\*

### What

- Implement all SRS auth routes and pages, including verification, lockout behavior, and remember-me token policy.
- Add form validation using shared Zod schemas.
- Add login failure count tracking and recaptcha trigger after threshold.
- Enforce authenticated booking requirement for online booking flow.
- Explicitly exclude social login from v1.0 and keep email/password auth only, per current SRS scope.

### Testing

- Unit: auth schema validation and password policy helpers.
- Integration: register/login/reset flows against Supabase auth mocks or test project.
- E2E: register to verify email interstitial to login redirect sequence.
- Security: brute-force lockout and recaptcha threshold tests.

## Step 5: Global Site Shell, Accessibility Baseline, Consent, and Shared UX States

### Files

- src/components/layout/Navbar.tsx
- src/components/layout/Footer.tsx
- src/components/layout/PageWrapper.tsx
- src/components/layout/HeadComponent.tsx
- src/components/common/SkipToContent.tsx
- src/components/common/WhatsAppFab.tsx
- src/components/common/CookieConsentBanner.tsx
- src/components/common/GlobalNetworkStatus.tsx
- src/components/states/LoadingState.tsx
- src/components/states/ErrorState.tsx
- src/components/states/EmptyState.tsx
- src/styles/globals.css
- src/lib/seo/meta.ts

### What

- Replace current placeholder layout with SRS global shell behavior (sticky nav, footer, WhatsApp CTA, cookie banner, loading indicator).
- Implement consent categories and conditional analytics loading.
- Add skip link, keyboard focus styles, semantic landmark structure, and reusable a11y helpers.
- Expand SEO utilities for titles, descriptions, OG, canonical, and structured data stubs.
- Set legal copy approval owner to the internal Data Protection Officer (or designated Compliance Owner); Product Manager coordinates final sign-off, and Engineering only implements approved copy.

### Testing

- Unit: consent state persistence and script gating logic.
- Integration: global shell renders correctly across all public pages.
- Accessibility: axe checks for landmark structure, keyboard navigation, and focus visibility.

## Step 6: Public Content Pages Vertical Slice (Home, About, Facilities, Restaurants, Gems, Events, Deals, Contact, Privacy)

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
- src/pages/api/v1/restaurants/index.ts
- src/pages/api/v1/restaurants/[id]/menu.ts
- src/pages/api/v1/gems/index.ts
- src/pages/api/v1/events/index.ts
- src/pages/api/v1/events/inquiries.ts
- src/pages/api/v1/deals/index.ts
- src/pages/api/v1/contact/index.ts
- src/pages/api/v1/newsletter/subscribe.ts
- src/features/content/\*

### What

- Implement each public page according to SRS Section 3 requirements with responsive behavior and API-backed data.
- Build event inquiry, contact, and newsletter flows with recaptcha verification and validation.
- Implement JSON-LD by page type and per-page SEO metadata.
- Implement empty/error/loading states consistently.
- Use realistic curated media and approved content copy package owned by Product and Marketing for all public sections.

### Testing

- Unit: page-level formatter and mapper utilities.
- Integration: endpoint contracts and validation failures.
- E2E: key user paths across public pages and form submissions.
- Accessibility: automated checks for each page template.
- Performance: image lazy loading and LCP budget checks on Home.

## Step 7: Rooms and Suites Catalog with Under-Construction and Notify Me

### Files

- src/pages/rooms.tsx
- src/pages/api/v1/rooms/index.ts
- src/pages/api/v1/rooms/[id].ts
- src/pages/api/v1/amenities/index.ts
- src/pages/api/v1/notify-me.ts
- src/features/rooms/\*

### What

- Implement room listing by resort toggle, tier filtering, and room details interactions.
- Enforce under-construction behavior for Presidential and Royal room types.
- Implement notify-me capture endpoint with duplicate suppression and success UX.
- Ensure Prayer Hut and shared amenity indicators render as required.
- Keep under-construction room cards visible in UI, but exclude them from bookable structured data offers.

### Testing

- Unit: room filtering and amenity categorization utilities.
- Integration: room and notify APIs including duplicate notify behavior.
- E2E: rooms browse, toggle, notify-me registration flow.
- Accessibility: modal or accordion semantics for amenity details.

## Step 8: Booking Engine Backend (Availability, Pricing, Booking Lifecycle)

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
- src/services/pricing/\*

### What

- Implement booking domain rules: availability lock, per-night seasonal pricing, deals, tax, status transitions, cancellation refunds.
- Implement booking reference generation and transactional concurrency controls.
- Implement confirmation PDF generation endpoint and confirmation resend endpoint.
- Set fallback defaults when settings are unset: VAT 7.5%, pending booking expiry 30 minutes, cancellation windows per SRS (>=72h full refund, 24-72h 50%, <24h none).

### Testing

- Unit: pricing engine for multi-room and multi-night scenarios.
- Integration: booking creation transaction race-condition tests.
- Integration: cancellation refund matrix tests.
- Security: authorization checks for guest-own vs admin access.
- Performance: p95 latency checks for availability and booking endpoints.

## Step 9: Payment Integration and Webhook Security

### Files

- src/pages/api/v1/payments/initiate.ts
- src/pages/api/v1/payments/verify.ts
- src/pages/api/v1/payments/[id].ts
- src/services/payments/paystack.ts
- src/services/payments/signature.ts
- src/domain/payment/\*

### What

- Implement payment initiation and verification against Paystack.
- Enforce webhook signature verification using HMAC-SHA512 with raw body.
- Implement timeout and expired pending booking handling, including refund trigger path.
- Add idempotency and replay protection for webhook processing.
- Implement Paystack only for v1.0 payment processing; do not implement Flutterwave fallback in this PR.

### Testing

- Unit: signature validator and webhook event parser.
- Integration: initiate, verify, and reconciliation flows.
- Security: invalid signature, replay, and tampered payload tests.
- E2E: booking payment success and failure user journeys in sandbox mode.

## Step 10: Booking Wizard Frontend and Confirmation Experience

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
- Ensure query preselection behavior for room and deal parameters.

### Testing

- Unit: wizard reducer and form schema behavior.
- Integration: booking summary totals and edit-step navigation.
- E2E: complete booking path from date selection to confirmation.
- Accessibility: stepper semantics, focus management, and mobile interactions.
- Performance: interaction responsiveness on low-end mobile profile.

## Step 11: Guest Account and Booking Management

### Files

- src/pages/account/index.tsx
- src/pages/account/bookings.tsx
- src/pages/account/profile.tsx
- src/features/account/\*
- src/pages/api/v1/bookings/index.ts
- src/pages/api/v1/auth/me.ts

### What

- Implement authenticated guest account area with booking list, detail, cancellation, resend confirmation, and profile settings.
- Implement status badges and allowed actions per booking state.
- Integrate cancellation modal with server-side refund preview data.
- For checked-out bookings with cash or POS, provide receipt PDF generation using stored booking totals and payment metadata.

### Testing

- Unit: status-to-action mapping logic.
- Integration: profile update and booking action endpoints.
- E2E: account login to booking management and cancellation flow.
- Security: enforce own-booking access only.

## Step 12: Admin Portal Foundation, RBAC, and Dashboard

### Files

- src/pages/admin/index.tsx
- src/pages/admin/\_middleware.ts or page-level guards under Pages Router pattern
- src/components/admin/AdminLayout.tsx
- src/components/admin/AdminSidebar.tsx
- src/components/admin/AdminTopbar.tsx
- src/pages/api/v1/analytics/bookings.ts
- src/pages/api/v1/analytics/revenue.ts
- src/pages/api/v1/analytics/occupancy.ts

### What

- Implement protected admin shell with role-based access and desktop-first layout.
- Implement dashboard metrics cards, trends chart, occupancy heatmap, and recent activity feed.
- Wire notifications and quick actions placeholders for downstream modules.
- Allow Resort Admin and Super Admin to view financial analytics; Content Manager has no financial analytics access.

### Testing

- Unit: RBAC guard utilities.
- Integration: analytics endpoints with role enforcement.
- E2E: unauthorized redirect and authorized dashboard rendering.
- Accessibility: keyboard navigation and heading structure in admin shell.

## Step 13: Observability, SEO Finalization, Background Jobs, and Operational Hardening

### Files

- src/pages/sitemap.xml.ts
- src/pages/robots.txt.ts
- src/lib/seo/structured-data/\*
- src/lib/monitoring/sentry.ts
- supabase/functions/expire-pending-bookings/index.ts
- supabase/functions/retry-failed-emails/index.ts
- supabase/functions/notify-room-available/index.ts
- docs/operations/runbook.md

### What

- Finalize SEO output (metadata completeness, JSON-LD coverage, sitemap and robots generation).
- Integrate error and performance monitoring hooks.
- Implement and schedule background jobs for pending booking expiry and retry pipelines.
- Add operational runbook for incident response and deployment validation.
- Ensure notify-room-available background processing is wired to room status transitions.

### Testing

- Integration: sitemap and robots generation assertions.
- Integration: background function invocation and retry semantics.
- Performance: smoke run for Core Web Vitals against public pages.
- Security: dependency audit and headers verification.

## Step 14: End-to-End Quality Gate, Documentation, and PR Assembly

### Files

- vitest.config.ts
- playwright.config.ts
- tests/unit/\*_/_.test.ts
- tests/integration/\*_/_.test.ts
- tests/e2e/\*_/_.spec.ts
- tests/accessibility/\*_/_.spec.ts
- tests/performance/\*_/_.md or scripts
- .github/workflows/ci.yml
- docs/testing/strategy.md
- docs/api/openapi.yaml
- docs/release/checklist.md

### What

- Complete CI pipeline: lint, typecheck, unit, integration, e2e smoke, accessibility checks, and build.
- Produce OpenAPI contract documentation aligned to implemented endpoints.
- Document test strategy and release checklist for single PR merge readiness.
- Run final gap analysis against SRS and document known deferrals with explicit rationale.
- Use smoke e2e on push; run full regression suites on scheduled nightly jobs.

### Testing

- Unit: full suite pass with threshold enforcement.
- Integration: API contract and database behavior suite pass.
- E2E: critical guest and admin journeys pass.
- Accessibility: automated checks pass on representative pages.
- Performance: Lighthouse/field proxy checks satisfy SRS targets.
- Security: static dependency and secret scanning pass.

## Step 15: Follow-up PR Plan - Admin CRUD Breadth (Deferred)

### Files

- src/pages/admin/rooms/\*.tsx
- src/pages/admin/bookings/\*.tsx
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
- src/pages/api/v1/media/\*.ts
- src/pages/api/v1/events/inquiries/\*.ts

### What

- Move broad admin CRUD implementation to a dedicated follow-up PR to keep the core delivery PR reviewable and lower regression risk.
- Implement all specified CMS modules with searchable lists, CRUD forms, soft-delete patterns, and module-level permissions.
- Implement room pricing management, unit status management, media validation and reference checks, and super-admin user/settings modules.
- Ensure notify-me batch notifications are triggered when room status changes from under construction to available.
- Suggested follow-up branch: feature/gar-admin-crud-phase-2

### Testing

- Unit: admin form schema validations and table filter logic.
- Integration: CRUD endpoint coverage and permission checks.
- E2E: one end-to-end scenario per module class (content, inventory, inquiries, settings).
- Security: IDOR and privilege escalation regression tests.

# Risks and Assumptions

- Risk: Even with scope split, the core PR remains broad and requires strict review checkpoints.
- Risk: Third-party service setup delays (Paystack, SendGrid, reCAPTCHA, Maps) can block end-to-end validation.
- Risk: CMS UI breadth may exceed timeline without strict component reuse and prioritization.
- Assumption: Supabase project, service role key, and required extensions are available early.
- Assumption: Realistic media assets and realistic price fixtures are approved for repository seed usage.
- Assumption: Legal copy owner is the Data Protection Officer or delegated Compliance Owner, coordinated by Product.
- Assumption: Pages Router remains the chosen architecture for v1.0.

# Single-PR Commit Sequencing Summary

1. chore: foundation, dependencies, env contract, shared libs
2. feat: database schema, migrations, seeds, RLS
3. feat: API middleware stack, auth context, security primitives
4. feat: auth pages and auth endpoints
5. feat: global shell, consent, accessibility baseline
6. feat: public content pages and supporting APIs
7. feat: rooms catalog and notify-me
8. feat: booking domain APIs and pricing logic
9. feat: payment integration and secure webhook
10. feat: booking wizard frontend and confirmation UX
11. feat: guest account and booking management
12. feat: admin shell, RBAC, analytics dashboard
13. feat: observability, SEO completion, background jobs
14. chore: full test matrix, docs, and PR readiness
15. docs: follow-up PR plan for full admin CRUD breadth
