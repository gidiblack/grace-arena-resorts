---
goal: Grace Arena Resorts SRS v1.2 Implementation Plan
version: 1.2
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

## Step 12: Admin Portal Foundation, RBAC, and Dashboard

### Files

- src/pages/admin/index.tsx
- src/pages/admin/\_middleware.ts or page-level guards under Pages Router pattern
- src/components/admin/AdminLayout.tsx
- src/components/admin/AdminSidebar.tsx
- src/components/admin/AdminTopbar.tsx
- src/components/admin/AdminBreadcrumb.tsx <!-- GAP-FIX: #38 -->
- src/pages/api/v1/analytics/bookings.ts
- src/pages/api/v1/analytics/revenue.ts
- src/pages/api/v1/analytics/occupancy.ts

### What

- Implement protected admin shell with role-based access and desktop-first layout (must remain functional on tablet ≥ 768px per SRS 3.14). Distinct layout from public site (no public navbar/footer).
- Implement collapsible sidebar navigation with all module links per SRS 3.14.1: Dashboard, Rooms & Buildings, Bookings, Restaurants & Menus, Facilities, Off-Beat Gems, Events & Inquiries, Deals & Offers, Contact Submissions, Newsletter, Media Library, Content Pages, Users (Super Admin only), System Settings (Super Admin only).
- Implement AdminTopbar with: admin user name, role badge, "View Site" link (opens public site in new tab), logout button, notification bell (placeholder for new bookings/inquiries/contact submissions). <!-- GAP-FIX: #39 -->
- Implement AdminBreadcrumb component for navigation context within nested pages. <!-- GAP-FIX: #38 -->
- Implement dashboard metrics cards: total bookings (today/week/month), revenue (today/week/month), occupancy rate (today), pending bookings count, new contact submissions (unread), new event inquiries (unread).
- Implement bookings chart (line/bar chart showing booking count and revenue over last 30 days using Recharts).
- Implement occupancy heatmap (calendar heatmap for current and next month).
- Implement recent activity feed (last 10 actions with timestamps).
- Implement quick actions placeholders: "Create Booking" (admin-initiated, links to future admin page), "Add Deal," "Upload Media."
- Wire notifications and quick actions placeholders for downstream modules.
- Allow Resort Admin and Super Admin to view financial analytics; Content Manager has no financial analytics access.
- Unauthenticated or unauthorized users redirected to `/login?redirect=/admin`.

### Testing

- Unit: RBAC guard utilities.
- Integration: analytics endpoints with role enforcement (verify Content Manager cannot access financial analytics).
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
- supabase/functions/deactivate-expired-deals/index.ts <!-- GAP-FIX: #26 -->
- docs/operations/runbook.md

### What

- Finalize SEO output (metadata completeness, JSON-LD coverage per page type, sitemap and robots generation). Sitemap includes all public pages, excludes noindex pages (booking, auth, account). Updated on content change.
- Integrate Sentry error and performance monitoring hooks.
- Implement and schedule background jobs for:
  - **Pending booking expiry** (every 5 minutes via pg_cron): expire stale pending bookings, release inventory holds.
  - **Failed email retry** (every 10 minutes): retry failed email sends from `failed_emails` table (up to 3 retries with exponential backoff). Alert admin if persistent failure.
  - **Notify room available**: triggered when room status changes from `under_construction` to `available`. Sends batch notification emails to all NotifyMeRegistration records for that room type. Updates `isNotified=true` and `notifiedAt`. Failed sends queued for retry.
  - **Deactivate expired deals** (daily): set `isActive=false` on deals whose `endDate` has passed. <!-- GAP-FIX: #26 -->
- Add operational runbook for incident response and deployment validation.
- Ensure notify-room-available background processing is wired to room status transitions.

### Testing

- Integration: sitemap and robots generation assertions (correct page inclusion/exclusion).
- Integration: background function invocation and retry semantics.
- Integration: deal auto-deactivation for expired deals. <!-- GAP-FIX: #26 -->
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
- docs/accessibility/manual-audit-checklist.md <!-- GAP-FIX: #36 -->

### What

- Complete CI pipeline: lint, format check (Prettier), typecheck, unit, integration, e2e smoke, accessibility checks, and build. <!-- GAP-FIX: #35 -->
- Produce OpenAPI contract documentation aligned to implemented endpoints.
- Document test strategy and release checklist for single PR merge readiness.
- Run final gap analysis against SRS and document known deferrals with explicit rationale.
- Use smoke e2e on push; run full regression suites on scheduled nightly jobs.
- **Verify all Core Web Vitals targets** per SRS 5.1: LCP < 2.5s on 4G, FID < 100ms, CLS < 0.1, TTFB < 600ms, API p95 < 300ms. Include all metrics in CI performance checks, not just LCP. <!-- GAP-FIX: #27 -->
- **Add manual accessibility audit checklist** covering NVDA and VoiceOver screen reader testing, color contrast verification for all interactive elements and text, and focus management review for modals/dropdowns/dynamic content. Schedule manual audit before launch. <!-- GAP-FIX: #36 -->
- **Document load testing approach** for 500+ concurrent users per SRS 5.1. Include recommended tools (k6, Artillery) and test scenarios in docs/testing/strategy.md. Schedule load test before production launch. <!-- GAP-FIX: #40 -->
- **Verify i18n readiness:** audit that all user-facing strings use the translation helper from Step 1 and no hard-coded strings remain in components. <!-- GAP-FIX: #13 -->

### Testing

- Unit: full suite pass with threshold enforcement (≥ 70% for API routes per SRS 5.5).
- Integration: API contract and database behavior suite pass.
- E2E: critical guest and admin journeys pass.
- Accessibility: automated axe-core checks pass on representative pages.
- Performance: Lighthouse checks satisfy all SRS 5.1 targets (LCP, FID, CLS, TTFB). <!-- GAP-FIX: #27 -->
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
- src/pages/api/v1/media/\*.ts (admin write operations)
- src/pages/api/v1/events/inquiries/\*.ts

### What

- Move broad admin CRUD implementation to a dedicated follow-up PR to keep the core delivery PR reviewable and lower regression risk.
- Implement all specified CMS modules with searchable lists, CRUD forms, soft-delete patterns, and module-level permissions.
- Implement room pricing management (seasonal price CRUD with overlap validation), unit status management, media validation and reference checks (MIME type: JPEG/PNG/WebP max 10MB, MP4 max 100MB), image auto-optimization on upload (resize, compress, WebP conversion), and super-admin user/settings modules. <!-- GAP-FIX: #43, #15 (file upload validation) -->
- Ensure notify-me batch notifications are triggered when room status changes from under construction to available.
- Implement admin-initiated booking UI page (the API already supports it from Step 8). <!-- GAP-FIX: #20 -->
- Implement admin CRUD endpoints for all entity types deferred from Steps 6-7: POST/PUT/DELETE for rooms, buildings, facilities, restaurants, gems, events, deals, content pages, amenities.
- Implement admin users endpoints: GET /admin/users, PUT /admin/users/{id}/role, PUT /admin/users/{id}/status.
- Implement admin settings endpoints: GET /admin/settings, PUT /admin/settings.
- Suggested follow-up branch: feature/gar-admin-crud-phase-2

### Testing

- Unit: admin form schema validations and table filter logic.
- Integration: CRUD endpoint coverage and permission checks.
- Integration: media upload MIME/size validation. <!-- GAP-FIX: #43 -->
- E2E: one end-to-end scenario per module class (content, inventory, inquiries, settings).
- Security: IDOR and privilege escalation regression tests.
- Security: file upload validation bypass tests. <!-- GAP-FIX: #15 (file upload) -->

# Risks and Assumptions

- Risk: Even with scope split, the core PR remains broad and requires strict review checkpoints.
- Risk: Third-party service setup delays (Paystack, SendGrid, reCAPTCHA, Maps) can block end-to-end validation. **Mitigation:** Set up sandbox/test accounts for all third-party services in Sprint 0 before development begins. <!-- GAP-FIX: risk mitigation -->
- Risk: CMS UI breadth may exceed timeline without strict component reuse and prioritization.
- Risk: Vercel KV provisioning delay can block rate limiting implementation. **Mitigation:** Implement in-memory rate limiter as development fallback with Vercel KV adapter swap for staging/production. <!-- GAP-FIX: risk mitigation -->
- Risk: SendGrid email service provisioning delay can block auth and booking email flows. **Mitigation:** Email service abstraction allows swapping to a console/log transport for local development. <!-- GAP-FIX: risk mitigation -->
- Risk: Domain and SSL certificate provisioning delay (SRS 2.6). **Mitigation:** Use Vercel preview URLs for pre-production validation. <!-- GAP-FIX: risk mitigation -->
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
12. feat: admin shell, RBAC, analytics dashboard, breadcrumbs <!-- GAP-FIX: #38, #39 -->
13. feat: observability, SEO completion, background jobs, deal auto-deactivation <!-- GAP-FIX: #26 -->
14. chore: full test matrix, CWV targets, manual audit checklist, docs, PR readiness <!-- GAP-FIX: #27, #36, #40 -->
15. docs: follow-up PR plan for full admin CRUD breadth
