# M1 + M2 Audit Findings & Fix Plan (pre-M3)

**Audit date:** 2026-10-15 · **Branch audited:** `develop` @ `821b9af`
**Scope:** Steps 1–11 of `implementation.md` (M1: 1, 5, 6, 7 · M2: 2, 3, 4, 8, 9, 10, 11)

## Summary

Static gates are green — `tsc` ✅, `eslint` ✅, `vitest` ✅ (21 files / 136 tests) — but the tests mock Supabase and Paystack, so none of the defects below are exercised. **M2 is not functional end-to-end** and several M1 features silently do nothing. The "[x] Done" marks in `implementation.md` for Steps 2, 4, 6, 8, 9, 10, 11 should be reverted until the fixes below land.

Severity: **P0** = broken core flow or exploitable security hole · **P1** = wrong behaviour / data integrity · **P2** = spec gap or hardening.

---

## Root cause: registration does not work

Confirmed with a read-only diagnostic against the hosted Supabase project:

- **No migrations have been applied to the hosted project.** Every `public.*` table returns `PGRST205 Could not find the table`.
- Auth has **3 users, all unconfirmed, all without a `public.users` profile** (orphans from failed registrations).

Failure chain in [register.ts](../../src/pages/api/v1/auth/register.ts):

1. The duplicate-email lookup errors (missing table) — error is ignored.
2. `auth.admin.createUser` succeeds → profile insert fails → user sees "Failed to save user profile"; the auth user is left orphaned.
3. Retrying with the same email: `createUser` fails with "already registered", but `!authData?.user` is always true on error, so the code falls into the **random-UUID fallback**, which can never satisfy `public.users.id REFERENCES auth.users(id)` → same error forever.

Public pages looked healthy only because 17 public API routes fall back to `MOCK_*` data whenever the DB query fails.

Even after migrations are applied, registration → login → booking is still broken by A2–A4 below.

---

## Findings

### A. Authentication (Step 4) — P0

| #   | Finding                                                                                                                                                                                                                                                                                                                                                  | Where                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| A1  | Error handling in register swallows all `createUser` errors into a random UUID (FK-impossible); no rollback of the auth user when the profile insert fails.                                                                                                                                                                                              | `api/v1/auth/register.ts:48-63`                                                    |
| A2  | **Email verification has no backend.** `/verify-email` shows "Email Confirmed" whenever `?token` is present; nothing ever sets `is_email_verified = true` or confirms the Supabase auth user. Because booking requires a verified email, **no guest can ever book**.                                                                                     | `pages/verify-email.tsx:18-23`                                                     |
| A3  | Users are created with `email_confirm: false`, so `signInWithPassword` always fails and login silently issues a fake `gar_jwt_…` cookie that `getAuthUser` rejects → user appears logged in but every authed call returns 401.                                                                                                                           | `api/v1/auth/login.ts:131-145`                                                     |
| A4  | Login / refresh / logout call `signInWithPassword` / `refreshSession` / `signOut` on the **shared service-role singleton**. supabase-js stores that session on the client and then sends the _user's_ JWT on subsequent queries, so later "admin" queries in the same instance can run as an arbitrary user under RLS; `signOut` logs the singleton out. | `lib/supabase/server.ts`, `auth/login.ts`, `auth/refresh.ts`, `auth/logout.ts`     |
| A5  | **Password-reset tokens are forgeable** — unsigned `base64(userId:expiry)`, not single-use. Anyone who learns a user UUID can take over the account. Same scheme for verification tokens.                                                                                                                                                                | `auth/forgot-password.ts`, `auth/reset-password.ts`, `auth/resend-verification.ts` |
| A6  | Two password stores (`public.users.password_hash` + Supabase Auth). Reset/change update both best-effort and swallow Auth errors → can drift.                                                                                                                                                                                                            | `auth/me/password.ts`, `auth/reset-password.ts`                                    |
| A7  | Open redirect: `/login?redirect=https://evil.example` is passed straight to `router.push`.                                                                                                                                                                                                                                                               | `pages/login.tsx:10,39`                                                            |
| A8  | No client-side token refresh; the 15-minute access cookie expires and the user is silently logged out.                                                                                                                                                                                                                                                   | `features/account`, `pages/booking.tsx`                                            |

### B. Database / RLS (Step 2) — P0

| #   | Finding                                                                                                                                                                                                                                                                  | Where                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| B1  | `current_user_role()` reads `auth.jwt()->>'role'`, which is the Postgres role (`authenticated`), so it never reaches `public.users.role` → **every admin RLS check is false**.                                                                                           | `0002_rls_policies.sql:32-44`        |
| B2  | Guests can `UPDATE` their own `users` row with no column restriction → **self-promotion to `super_admin`**, self-unlock, self-verify (becomes exploitable once B1 is fixed). The self-`INSERT` policy lets an orphaned auth user insert their own profile with any role. | `0002:77-91`                         |
| B3  | Guests can `UPDATE` any column on their own booking (`status='confirmed'`, `total=0`) and `INSERT` bookings/line items with arbitrary totals directly through PostgREST using the public anon key.                                                                       | `0002:144-182`                       |
| B4  | Guests can `INSERT` payments with `status='success'` for their own bookings.                                                                                                                                                                                             | `0002:194-202`                       |
| B5  | `newsletter_subscribers` is `FOR ALL USING (true)` → anyone with the anon key can read, edit or delete the whole subscriber list (PII / NDPR breach).                                                                                                                    | `0002:233-235`                       |
| B6  | `expire_stale_pending_bookings()` ignores the 2-hour downtime hold, and `SELECT COALESCE(value::int,30) INTO … WHERE key=…` yields `NULL` if the row is missing → nothing ever expires.                                                                                  | `0006_pg_cron_setup.sql:7-29`        |
| B7  | `retry-failed-emails` is unscheduled but never scheduled; `sendEmail` never writes to `failed_emails`.                                                                                                                                                                   | `0006`, `services/email/sendgrid.ts` |
| B8  | `0002` policies are not idempotent (`CREATE POLICY` without `DROP … IF EXISTS`); `0004_seed_reference_data.sql` duplicates `seed.sql`.                                                                                                                                   | migrations                           |

### C. Payments (Step 9) — P0

| #   | Finding                                                                                                                                                                                                                                                                                                                                         | Where                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| C1  | **Amount and currency are never checked** in `verify` or the webhook. Combined with the fallback that matches a booking by the `GAR-XXXXXXXX` prefix of _any_ reference, a guest can open their own ₦100 inline-checkout transaction with reference `GAR-<ref>-1` and get the booking confirmed.                                                | `payments/verify.ts:211-222`, `payments/webhook.ts:576-585` |
| C2  | **Late payment after cron expiry keeps the money.** The cron sets stale bookings to `cancelled`; the webhook/verify only auto-refund when status is still `pending`, so a cancelled booking falls through to "valid payment": payment marked `success`, no refund, booking stays cancelled. `verify` even reports `bookingStatus: "confirmed"`. | `webhook.ts:612,661-739`, `verify.ts:259,336-427`           |
| C3  | **Guest cancellation never refunds.** `cancel.ts` marks the payment `refunded`/`partially_refunded` and tells the guest a refund was "initiated", but never calls `initiatePaystackRefund`.                                                                                                                                                     | `bookings/[ref]/cancel.ts:83-95`                            |
| C4  | Webhook idempotency row is written **before** processing; if processing throws (e.g. refund API failure → 500), Paystack's retry is acknowledged as a duplicate and the event is lost.                                                                                                                                                          | `webhook.ts:536-560`                                        |
| C5  | Confirmation is not idempotent: `verify` and the webhook both flip `pending→confirmed` with no conditional update, so the guest can get two confirmation emails/PDFs.                                                                                                                                                                           | `verify.ts:347`, `webhook.ts:672`                           |
| C6  | `refund.processed` builds `.or(\`gateway_reference.eq.${txRef},id.eq.${txRef}\`)`from webhook data (filter-string injection), and`id.eq.<non-uuid>` errors the whole query so the refund is never recorded.                                                                                                                                     | `webhook.ts:747-751`                                        |
| C7  | Paystack signs webhooks with the **secret key**; `PAYSTACK_WEBHOOK_SECRET` must equal `PAYSTACK_SECRET_KEY` or every webhook gets a 401. Not documented.                                                                                                                                                                                        | `services/payments/signature.ts`, `.env.example`            |

### D. Booking engine (Step 8) — P1

| #   | Finding                                                                                                                                                                                                                                             | Where                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| D1  | **Double-booking race:** availability check and insert are separate round-trips with no lock or transaction (the plan requires `SELECT … FOR UPDATE`). A line-item insert failure is only logged, leaving a booking that holds no inventory.        | `bookings/index.ts:163-339`                                                             |
| D2  | Maintenance units are subtracted in `GET /availability` but not in `POST /bookings`.                                                                                                                                                                | `bookings/index.ts:198-212`                                                             |
| D3  | Hold window is hard-coded to 30 minutes in availability, calendar, booking POST and the SQL function; the downtime 2-hour hold is ignored everywhere except payment initiation.                                                                     | multiple                                                                                |
| D4  | Deal handling: the server never checks a deal's `start_date`/`end_date`; `ilike(promo_code, userInput)` treats `%`/`_` as wildcards.                                                                                                                | `bookings/index.ts:226-246`                                                             |
| D5  | Seasonal "latest takes precedence" takes the last array element instead of sorting by `created_at` (also in calendar).                                                                                                                              | `services/pricing/pricing-engine.ts:117-121`, `availability/calendar.ts:144-146`        |
| D6  | `booking_line_items.unit_price` stores `base_price` even when seasonal rates were charged; PDFs show "Room Suite"/"Suite" instead of room names.                                                                                                    | `bookings/index.ts:313-322`, `[ref]/pdf.ts`, `[ref]/status.ts`, `[ref]/confirmation.ts` |
| D7  | Timezones: date strings are parsed as UTC and `setHours(14)` uses server-local time. On Vercel (UTC) check-in "14:00" is 15:00 WAT, so the refund tiers and the no-show guard are off by an hour, and the "past date" check is off around midnight. | `domain/booking/cancellation.ts`, `state-machine.ts`, `bookings/index.ts:128-138`       |
| D8  | `tax_rate` system setting is ignored (hard-coded `0.075`). **Spec ambiguity:** SRS §4.3 line 1377 says `tax = subtotal × rate`, but lines 1379–1380 apply discounts "before tax". The code taxes the discounted subtotal. **Decision needed.**      | `pricing-engine.ts`, `docs/GAR-SRS.md:1377-1382`                                        |
| D9  | `?resort=` filter on `/availability` is applied to an embedded relation without `!inner`, so it filters nothing.                                                                                                                                    | `availability/index.ts:55-57`                                                           |
| D10 | Mock fallbacks in 17 public API routes hide DB outages in production; mock room IDs and promo codes can't be booked (deal validate approves mock codes the booking API won't apply).                                                                | `grep -l MOCK_ src/pages/api`                                                           |

### E. Booking wizard & account frontend (Steps 10–11) — P0/P1

| #   | Finding                                                                                                                                                                                                                                                                               | Where                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| E1  | **P0 Guest cancellation is fully broken:** the modal calls `GET` (preview) and `POST` (confirm) but the endpoint only allows `PUT` → 405 on both. There is no preview mode on the API.                                                                                                | `features/account/components/CancellationModal.tsx:43,66` |
| E2  | **P0 Deals never apply server-side:** the wizard sends `dealCode`; the API reads `promoCode` / `dealId`. The UI shows a discount and the guest is charged full price.                                                                                                                 | `pages/booking.tsx:476`                                   |
| E3  | **P0 Paystack return never confirms:** Paystack appends its own `?reference=` to the callback URL, so `router.query.reference` becomes an array and the effect bails. Even if it ran, `verify` is called with the _booking_ reference instead of the payment reference → gateway 404. | `pages/booking.tsx:319-357,505`                           |
| E4  | False confirmations: the confirmation screen is shown on verify _network failure_, when `verified: false`, and in the "direct confirmation fallback" when no `authorizationUrl` is returned. After the redirect, dates and totals come from empty wizard state.                       | `pages/booking.tsx:332-354,533-545`                       |
| E5  | `EMAIL_NOT_VERIFIED` redirects to `/login` (loop) instead of `/verify-email`.                                                                                                                                                                                                         | `pages/booking.tsx:488-494`                               |

### F. M1 public site (Steps 1, 5, 6, 7) — P1/P2

| #   | Finding                                                                                                                                                                                                                                          | Where                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| F1  | **Contact form and event inquiries persist nothing and notify no staff.** Only an auto-reply goes to the guest, so messages are lost. No reCAPTCHA (plan requires it).                                                                           | `api/v1/contact/index.ts`, `api/v1/events/inquiries.ts` |
| F2  | Newsletter: subscribe stores nothing; confirm only decodes the token; unsubscribe is a no-op; the token is unsigned. **Reflected XSS:** `confirm` interpolates the decoded email into HTML unescaped (`/confirm?token=<base64 of "<script>…">`). | `api/v1/newsletter/*.ts`                                |
| F3  | Notify-me uses an in-memory array (lost on every cold start / per serverless instance).                                                                                                                                                          | `api/v1/notify-me.ts`                                   |
| F4  | Rate limiting is an in-process `Map`, so it is ineffective on Vercel; the IP comes from the client-controlled first `X-Forwarded-For` entry; the KV adapter the plan requires is missing.                                                        | `lib/security/rate-limit.ts`                            |
| F5  | Security headers (CSP/HSTS) are only set on API JSON responses; HTML pages get none (`next.config.ts` has no `headers()`). The CSP includes `unsafe-eval`.                                                                                       | `lib/security/headers.ts`, `next.config.ts`             |
| F6  | CSRF passes any request carrying an `X-Requested-With` header of any value; the cookie double-submit is never issued.                                                                                                                            | `lib/security/csrf.ts`                                  |
| F7  | Leftover scaffold `src/pages/api/hello.ts`.                                                                                                                                                                                                      | —                                                       |

---

## Fix plan

Ordered so each phase unblocks the next. Each phase gets its own commit (or PR) with a verification gate, matching the runbook style.

### Phase 0 — Environment & data (unblocks everything) · ~0.5 day

1. `npx supabase link --project-ref <ref>` → `npx supabase db push`. First confirm `pgcrypto` and `pg_cron` are enabled in the dashboard. Do B8 (idempotent policies) first if a re-push is likely.
2. Regenerate `src/types/db.ts` from the hosted schema and diff it against the committed file.
3. Delete the 3 orphaned, unconfirmed auth users (or backfill profiles via the trigger in Phase 1).
4. Gate all `MOCK_*` fallbacks behind `NEXT_PUBLIC_USE_MOCK_DATA === "true"` (default off). In production, a DB error must return 5xx and log. (D10)
5. Document in `.env.example` that `PAYSTACK_WEBHOOK_SECRET` = Paystack secret key. (C7)

**Gate:** diagnostic shows all tables reachable; `/rooms` and `/deals` render from DB with mock mode off.

### Phase 1 — Auth rebuilt on Supabase Auth as the single source of truth · ~3 days

1. **Profile creation via DB trigger:** add `handle_new_auth_user()` `SECURITY DEFINER` trigger on `auth.users` that inserts `public.users(id, email, full_name, phone, role='guest')` from `raw_user_meta_data`. Register then only calls `createUser`. Map "already registered" to 409. Delete the random-UUID branch and roll back on any failure. (A1)
2. **Drop `password_hash`** and bcrypt from app code. Login, change-password and reset all use Supabase Auth only. Keep lockout counters in `public.users`. (A6)
3. **Per-request clients:** add `createSupabaseAuthClient()` returning a fresh anon-key client (`persistSession:false`) for `signInWithPassword` / `refreshSession`. Never call auth session methods on the admin singleton. Logout uses `auth.admin.signOut(accessToken)`. Add a unit test asserting the admin client never holds a session. (A3, A4)
4. **Email verification:** generate links with `auth.admin.generateLink({ type: "signup" })` (or an HMAC-signed, single-use token stored hashed with an expiry). Add `POST /api/v1/auth/verify-email` that validates the token, sets `is_email_verified=true` and `email_confirm=true`, and wire `/verify-email` to call it with real success and error states. (A2)
5. **Password reset:** `generateLink({ type: "recovery" })` or a signed single-use token table (`auth_tokens(token_hash, user_id, purpose, expires_at, used_at)`). Reject reused or expired tokens. (A5)
6. **Login redirect allow-list:** accept only paths matching `^/(?!/)`. (A7)
7. **Session refresh:** `getAuthUser` refreshes transparently from `gar_refresh_token` when the access token has expired, or a client fetch wrapper retries once via `/auth/refresh` on 401. (A8)

**Gate:** register → email link → verify → login → `GET /auth/me` returns 200 with `isEmailVerified: true`. Wrong password ×5 locks the account. Reset link works once only. A tampered token is rejected.

### Phase 2 — RLS & DB hardening (migration `0007_security_fixes.sql`) · ~1.5 days

1. `current_user_role()` → `SELECT role FROM public.users WHERE id = auth.uid()` (no JWT `role` claim). (B1)
2. `users`: drop the self-INSERT policy (the trigger creates profiles). `REVOKE UPDATE ON public.users FROM authenticated; GRANT UPDATE (full_name, phone) ON public.users TO authenticated;`. (B2)
3. `bookings`, `booking_line_items`, `payments`: remove guest INSERT/UPDATE policies. All writes go through API routes using the service role; guests keep SELECT on their own rows. (B3, B4)
4. `newsletter_subscribers`: drop `FOR ALL USING (true)`; no anon access (API uses the service role). (B5)
5. **Atomic booking RPC** `create_pending_booking(...)`: `SELECT … FROM room_types WHERE id = ANY(...) FOR UPDATE`, recompute availability with the shared hold logic (maintenance included), insert the booking and line items in one transaction, and raise on insufficient availability. `POST /bookings` calls `supabase.rpc`. (D1, D2)
6. Hold window from one source: a `booking_hold_minutes()` SQL function reading `pending_booking_expiry_minutes` and `paystack_downtime` (with `COALESCE` outside the `SELECT INTO`). Used by `check_room_availability`, the RPC and the cron; TS reads the same setting. (B6, D3)
7. Make `0002` idempotent (`DROP POLICY IF EXISTS`). Remove duplicate seed data from `0004` or `seed.sql`. Either schedule `retry-failed-emails` (with `sendEmail` enqueueing to `failed_emails` on failure) or explicitly defer it to Step 13. (B7, B8)

**Gate:** SQL tests via `supabase test db` (pgTAP) or an integration suite. A guest JWT cannot change `role`, insert payments, update booking status or read newsletter rows. An admin JWT passes `is_resort_admin()`. Concurrent double-book of the last unit: exactly one succeeds.

### Phase 3 — Payments correctness · ~2 days

1. Match only by exact `payments.gateway_reference` (delete the `GAR-` prefix fallback). Require `verified.amountKobo === booking.total * 100` and `currency === "NGN"`. On mismatch, mark the payment `failed`/flagged, auto-refund, and alert. (C1)
2. Shared `settleSuccessfulCharge(payment, booking, charge)` used by both `verify` and the webhook:
   - booking `pending` and hold valid → conditional update `.eq("status","pending")`; send the email/PDF only if a row changed. (C5)
   - booking `pending` and hold expired, **or** booking `cancelled`/`no_show` → full auto-refund, payment `refund_pending`, email the guest. (C2)
   - booking already `confirmed` → no-op.
3. Webhook idempotency: unique key `(event, data.id)` in a `webhook_events` table with `processed_at`. Insert first with `ON CONFLICT DO NOTHING`, process, then set `processed_at`; on failure leave it unset so a retry re-processes. (C4)
4. `refund.processed`: lookup `.eq("gateway_reference", txRef)` only. (C6)
5. Cancel endpoint: add `GET` = refund preview (no side effects). `PUT` = cancel, call `initiatePaystackRefund` for the refundable amount, store the refund id, set the payment to a new `refund_pending` status (add it to the CHECK constraint), and let `refund.processed` finalise. (C3, E1)
6. `verify` returns the real post-settlement `bookingStatus` and `total`.

**Gate:** Paystack sandbox runs covering a normal payment (exactly one email), an underpaid transaction (rejected and refunded), payment after cron expiry (refunded), a webhook replay (no double processing), and guest cancellation ≥72h (refund hits Paystack and `refund.processed` updates the status).

### Phase 4 — Booking engine & frontend fixes · ~2 days

1. Wizard sends `promoCode` (E2). The server validates deal `start_date ≤ check-in ≤ end_date`, `is_active`, and does exact case-insensitive matching (`.eq("promo_code", code.toUpperCase())` with uppercase storage). (D4)
2. Seasonal precedence: sort by `created_at` desc and take the first, in both the pricing engine and the calendar. (D5)
3. Line items: store `unit_price` as the average nightly rate actually charged (or add `nightly_rates JSONB`). Build PDF room names from `room_types`. Extract one `buildBookingPdfInput(bookingId)` helper used by `status`, `confirmation`, `pdf`, `verify` and the webhook. (D6)
4. Add `dayjs` `utc`+`timezone` plugins with `RESORT_TZ = "Africa/Lagos"`. Compute check-in 14:00 WAT for refunds and no-show, and "today" in WAT for the past-date check. (D7)
5. Read `tax_rate` from `system_settings`. Apply the tax formula you decide on (D8 decision below).
6. Fix the resort filter: `buildings!inner(resorts!inner(slug))`. (D9)
7. Callback flow: callback URL `/booking?bookingRef=GAR-…`. Read Paystack's `reference`/`trxref` as the payment ref, call `verify` with it, and load booking details from `GET /bookings/[ref]`. Show the confirmation only when `bookingStatus === "confirmed"`. Otherwise show "payment pending/failed" with a retry or WhatsApp CTA. Remove the "direct confirmation" and network-failure confirmations. (E3, E4)
8. `EMAIL_NOT_VERIFIED` → `/verify-email?email=…`. (E5)

**Gate:** e2e happy path in Paystack sandbox — book 2 rooms with a deal, pay, return to the confirmation screen with the correct totals, PDF and email. The cancel modal shows the preview and cancels.

### Phase 5 — M1 completion & hardening · ~2 days

1. Contact and inquiries: insert into `contact_submissions` / `event_inquiries`, email staff, add reCAPTCHA (`verifyRecaptcha`), and route through `withApi`. (F1)
2. Newsletter: upsert `newsletter_subscribers` with a hashed, single-use `confirm_token`; `confirm` sets `confirmed_at`; unsubscribe uses a signed token link (not bare email). HTML-escape all interpolated values, or redirect to a React page instead of returning HTML. (F2)
3. Notify-me: persist to `notify_me_registrations` with a unique `(room_type_id, lower(email))` index for duplicate suppression. (F3)
4. Rate limiter: Vercel KV / Upstash adapter with the in-memory fallback only in dev. IP from `x-real-ip` / Vercel's `x-vercel-forwarded-for`. (F4)
5. Page security headers via `next.config.ts` `headers()`. Drop `unsafe-eval` in production. (F5)
6. CSRF: require `X-CSRF-Token` to match the `gar_csrf_token` cookie (issued on first GET), or rely strictly on `Sec-Fetch-Site`/`Origin` matching `NEXT_PUBLIC_APP_URL`. Remove the bare `X-Requested-With` bypass. (F6)
7. Delete `api/hello.ts`. (F7)

**Gate:** contact, inquiry, newsletter and notify-me rows appear in the DB. The XSS payload renders escaped. Rate limits hold across two `vercel dev` instances. securityheaders.com grades the HTML pages ≥ A.

### Phase 6 — Tests & documentation · ~1.5 days (in parallel with phases 1–5)

- Add an integration test suite against local Supabase (`supabase start` in CI) for each regression above: register/verify/login, RLS escalation attempts, concurrent booking, payment amount mismatch, late payment refund, cancellation refund, newsletter XSS.
- Add a unit test for the admin-client-session leak (A4) and for timezone boundaries (D7).
- Update `implementation.md`: un-tick the items that were not actually met, and re-tick them when each phase gate passes.

**Total estimate:** ~12–13 dev-days before starting M3.

---

## Decisions needed before Phase 4

1. **Tax base (D8):** `subtotal × rate` (SRS line 1377, literal) or `(subtotal − discount) × rate` (current code; matches the "discount before tax" wording in lines 1379–1380 and normal Nigerian VAT practice)?
2. **Verification links:** Supabase-generated links (less code, Supabase email templates bypassed by sending the link via SendGrid) or a custom signed-token table (full control)?
3. **Late payment on a cancelled booking (C2):** always refund (recommended), or re-confirm if inventory is still free?

---

## Implementation status (branch `fix/m1-m2-audit`, 2026-10-15)

Decisions applied (reversible): tax on the discounted subtotal; custom single-use hashed tokens for verification/reset/newsletter; late payments on non-confirmable bookings are always refunded.

| Phase                       | Status                                      | Notes                                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 Environment & data        | Code done; **hosted push pending approval** | Seed aligned with the public catalogue (room slugs, real promo codes); `seed.sql` creates demo users via `auth.users`; mock data behind `NEXT_PUBLIC_USE_MOCK_DATA`; public sign-up disabled in `config.toml`                                       |
| 1 Auth                      | Done                                        | A1–A8                                                                                                                                                                                                                                               |
| 2 RLS & DB (`0007`)         | Done                                        | B1–B7; B8 partially (0002 left as-is, 0007 is idempotent)                                                                                                                                                                                           |
| 3 Payments                  | Done                                        | C1–C7 (`services/payments/settlement.ts`, `webhook_events` ledger)                                                                                                                                                                                  |
| 4 Booking engine & frontend | Done                                        | D1–D10, E1–E5; also: wizard ignored the availability response shape (always used slug IDs → every booking 404'd), deal validate returned `promoCode` but wizard read `code`, zod `.uuid()` rejected seeded IDs, "Complete Payment" link did nothing |
| 5 M1 completion             | Done                                        | F1–F7; also: email templates now HTML-escape input, GA4 loads after consent (previously never loaded), `/deals` codes now match the booking engine                                                                                                  |
| 6 Tests                     | Done                                        | 180 tests (44 new regression tests + in-memory Supabase fake); migrations 0001–0007 + seed verified in PGlite incl. RLS, locking, expiry                                                                                                            |

**Remaining before M3:** apply migrations to the hosted project (`supabase link` + `supabase db push`; `0007` backfills profiles for the 3 orphaned auth users), set `PAYSTACK_WEBHOOK_SECRET` = Paystack secret key, configure KV + reCAPTCHA keys in Vercel, confirm per-room unit counts in `0004` (assumed), run a Paystack sandbox end-to-end, then re-tick `implementation.md`. Pre-existing Prettier issues remain in 5 untouched files.
