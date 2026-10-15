# M2 Follow-up Fix Plan: Guest Checkout & Manual-Test Findings

**Date:** 2026-10-15 · **Base branch:** `fix/m1-m2-audit` @ `a5d131d` · **Source:** manual testing against the hosted Supabase project (dev server log monitored throughout), plus a product change request.

## Summary

Manual testing confirmed the audit fixes on the critical path. Registration, the unverified-email gate, login, live availability, booking creation, Paystack payment and confirmation, and cancellation with a real Paystack refund (#18701050, 50% tier) all behaved correctly. Contact form submissions are persisted.

Six issues surfaced during testing, and there is one new requirement: **guests must be able to book and pay without an account**. Signing in or registering is offered only after the booking is complete, so that the guest can track and cancel the booking later.

The new requirement **contradicts GAR-SRS v1.2** in three places:

- §3.x Auth design note (line 893): "Guest checkout without an account is **not** supported in v1.0".
- Line 1240: "Email verification required before booking".
- §4.1 authorization matrix: guests may access public pages only.

The SRS must be updated (proposed v1.3) alongside the code.

Not yet verified (blocked on SendGrid credits): event inquiry, newsletter double opt-in and Notify Me. Their code paths have unit tests, but they still need an end-to-end check once email works.

---

## Findings from manual testing

| #   | Sev           | Finding                                                                                                                                                                                                                                                                                                              | Evidence                                                                       |
| --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| T1  | P0 (ops)      | **SendGrid account is out of credits.** Every send fails with `401 Unauthorized` and the body `"Maximum credits exceeded"`. The key is valid (it has the `mail.send` scope and the sender is verified).                                                                                                              | Every email attempt in `dev.log`                                               |
| T2  | P1            | **Failed emails are silently lost and the UI reports success.** `sendEmail` only logs. Nothing is written to `failed_emails`, so nothing can be retried. `/resend-verification` returned 200 ("a new link has been sent") while the send failed. There is no alert when the provider is down or out of credits.      | `POST /api/v1/auth/resend-verification 200` next to a SendGrid error           |
| T3  | P1            | **Emails block API responses.** PDF generation and the SendGrid call run before the response is sent. The Paystack return took 8.3 s and the cancellation took 4.3 s.                                                                                                                                                | `GET /payments/verify … 8.3s`, `PUT …/cancel … 4.3s`                           |
| T4  | P2            | **Slow availability.** `/api/v1/availability` takes 0.8–2.2 s per call against an SRS 5.1 target of p95 < 300 ms. It makes several sequential Supabase round-trips: room types, overlapping bookings, line items, maintenance and seasonal prices.                                                                   | 11 calls in `dev.log`                                                          |
| T5  | P2            | **Navbar hydration mismatch.** The active-link check uses `router.asPath.split("?")[0]`, which keeps `#hash`. The server and the client disagree on which link is active, so React throws "Hydration failed" and re-renders the header. This predates the audit branch (`Navbar.tsx` was last changed in `ff59425`). | `[browser] Uncaught Error: Hydration failed` at `<Navbar> … <t3 label="Home">` |
| T6  | P3 (dev only) | **Editing `.env.local` needs a dev-server restart.** `env` is parsed once and the SendGrid client is initialised once, so Next's "Reload env" does not reach them. This does not affect production (each deploy starts fresh).                                                                                       | First SendGrid 401 after an env edit                                           |
| T7  | Product       | **Sign-in is demanded only after the guest has filled in all four wizard steps.** This is superseded by the guest checkout below.                                                                                                                                                                                    | `POST /api/v1/bookings 401`                                                    |

Also observed:

- **Supabase dashboard edits run as `authenticated`.** The dashboard performed row edits as the `authenticated` role and was correctly denied by the 0007 column grants. For admin data fixes, use the SQL editor with the `postgres` role. No change is needed.
- **The 3 pre-audit accounts are unconfirmed.** One of them (`gidiblack+garbookings@…`) was verified manually as a testing workaround.

---

## New requirement: guest checkout (R1)

### Target behaviour

1. **No sign-in to book.** Anyone can complete all four wizard steps and pay with Paystack without signing in.
2. **The confirmation screen gives the guest a way back in.** It shows the booking reference, a PDF download, and a **private "Manage booking" link**. All three work even if the confirmation email fails, which matters while T1/T2 are unresolved.
3. **Account offer after booking.** Below the confirmation:
   - "Create an account to track and cancel your bookings", with the email and name prefilled.
   - "Already have an account? Sign in".
4. **Bookings attach to an account only by verified email.** Guest bookings are attached to an account when that account's email is verified and matches the booking email. Without that rule, anyone could register with someone else's email and claim their bookings.
5. **Guests manage bookings through the private link.** The link opens a manage page with the booking details, PDF, resend confirmation, and cancellation with the same refund preview and Paystack refund as `/account`.
6. **Signed-in users still book the same way** and see their bookings in `/account`.

### Design

| Concern                                      | Approach                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who owns a guest booking                     | New `bookings.channel` column: `online_guest` \| `online_account` \| `walk_in`. Guest bookings have `user_id = NULL` and `channel = 'online_guest'`, which also separates them from admin walk-ins (also `user_id = NULL` today).                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Access without an account                    | A **booking access token**: 32 random bytes, stored only as a SHA-256 hash (reusing `auth_tokens` with the new purpose `booking_access`). It expires 30 days after check-out. It is issued when the booking is created and travels in two places. **(a)** An HttpOnly, `SameSite=Lax` cookie `gar_booking_access` holds a short list of `{bookingId, token}` entries, so returning from Paystack in the same browser just works. **(b)** The manage link `/manage-booking/{ref}?t={token}` appears on the confirmation screen and in the email. Tokens can be rotated with "Email me a new manage link", which is rate-limited and requires the reference and the booking email. |
| Authorizing booking endpoints                | One helper, `authorizeBookingAccess(req, booking)`. It allows **(1)** admins, **(2)** the signed-in owner (`user_id`), or **(3)** a valid access token for that booking (cookie or `?t=`). It replaces the per-route `user_id` checks in `bookings/[ref]`, `/cancel`, `/pdf`, `/confirmation`, `payments/initiate` and `payments/verify`.                                                                                                                                                                                                                                                                                                                                        |
| Linking to an account                        | When an email is verified (`POST /auth/verify-email`), unowned `online_guest` bookings with the same email are linked to that account. A signed-in user holding a valid access token can also click "Add to my account" for a booking under a different email; holding the token proves possession. Linking is logged in `audit_logs`.                                                                                                                                                                                                                                                                                                                                           |
| Abuse: anonymous inventory holds             | Without accounts, a bot could hold every room for 30 minutes at a time. Mitigations: **reCAPTCHA v3 on `POST /bookings`** (score ≥ 0.5); a **rate limit** of 5 bookings per hour per IP on the KV limiter; a **cap of 3 live pending holds** per guest email and per IP (checked inside `create_booking_with_lock`); the existing cap of 20 units per booking; and a WhatsApp fallback message when a limit is hit.                                                                                                                                                                                                                                                              |
| Email correctness (no verification any more) | A "Confirm email" field in step 3; the manage link shown on screen, so a mistyped email is not fatal; and the email shown prominently on the review step.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| NDPR consent                                 | Registration normally captures consent. Guest checkout gets a required "I agree to the Privacy Policy…" checkbox in step 3, with the consent timestamp stored on the booking (`privacy_consent_at`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Payment flow                                 | `POST /payments/initiate` and `GET /payments/verify` accept access-token authorization. Payment references grow to 16 random bytes. The settlement logic is unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Confirmation and refund emails               | These include the manage link. If T2 is not done, the guest still has the link from the screen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

### SRS changes to propose (v1.3)

- Line 893: guest checkout is supported. Accounts are optional and are offered after booking.
- Line 1240: replace "Email verification required before booking" with "Email verification required to link bookings to an account".
- §4.1 matrix: Guest (Unauthenticated) may create and pay for bookings and manage them via a booking access link.
- §4.3: describe the booking access token, the hold-abuse limits and consent capture.

---

## Fix plan

Phases are ordered so that email reliability lands before guest checkout, which depends on email much more than account-based booking did.

### Phase 1: Email reliability (T1, T2, T6) · ~1.5 days

1. **Ops:** restore SendGrid credits or upgrade the plan. Then run the deferred end-to-end checks: event inquiry, newsletter double opt-in, Notify Me, and booking and refund emails.
2. `sendEmail` writes each failure to `failed_emails` (recipient, template, data, error, attempts). Any data that holds secrets (tokens) is excluded; instead, the queue stores the inputs needed to regenerate the email.
3. Add a `retry-failed-emails` job with exponential backoff and at most 3 attempts. The pg_cron schedule calls an internal route secured by a shared secret. This replaces the Step 13 Edge Function stub.
4. Provider-level failures (401, credits exhausted, 5xx) are logged once at `error` with a stable code `EMAIL_PROVIDER_UNAVAILABLE`, ready for the Sentry alert in Step 13.
5. User-facing honesty:
   - `register` and `resend-verification` say "We couldn't send the email right now; try again in a few minutes" when the send fails. The resend page shows the same message.
   - Account-enumeration protection stays: the response is the same whether or not the account exists.
6. Development only: when an email fails outside production, log the action link (verify, reset or manage) to the server console so testing can continue without credits.
7. Development only: document in README that editing `.env.local` needs a dev-server restart (T6).

**Gate:** with an invalid SendGrid key:

- the register UI shows the "couldn't send" message;
- a `failed_emails` row is created;
- after the key is fixed, the retry job delivers the email.

### Phase 2: Guest checkout (R1) · ~4–5 days

1. Migration `0008_guest_checkout.sql`:
   - Schema: `bookings.channel` and `bookings.privacy_consent_at`; backfill `channel` for existing rows; add `booking_access` to the `auth_tokens.purpose` CHECK.
   - Index on `bookings(lower(guest_email)) WHERE user_id IS NULL`.
   - `create_booking_with_lock` takes `p_channel` and enforces the pending-hold cap.
   - New function `link_guest_bookings(p_user_id, p_email)` (SECURITY DEFINER; service role only).
2. `src/services/booking/access.ts`: `issueBookingAccess`, `authorizeBookingAccess`, plus cookie helpers.
3. `POST /bookings`:
   - `requireAuth` is removed; the user is optional.
   - Adds reCAPTCHA, the per-IP limit, consent validation and the `channel` value.
   - Returns the manage URL and sets the access cookie.
4. Booking and payment endpoints switch to `authorizeBookingAccess` (see the design table).
5. New page `/manage-booking/[ref]` (token from `?t=` or cookie): booking summary, PDF, resend, cancel (reusing `CancellationModal`), "Add to my account" when signed in, and "Email me a new manage link".
6. Wizard changes:
   - Remove the 401 and `EMAIL_NOT_VERIFIED` redirects.
   - Step 3 gains a confirm-email field and the consent checkbox.
   - The confirmation screen shows the manage link and an account call-to-action: register prefilled, or sign in with `?redirect=` back to the booking.
7. Linking:
   - `verify-email` calls `link_guest_bookings`.
   - Login shows "We found N bookings made with this email" when there are unlinked guest bookings for a verified account.
8. Email templates (confirmation and refund) include the manage link.
9. Update the SRS to v1.3, and record the change in `implementation.md` (Steps 4, 10, 11).

**Gate:**

- **Guest happy path:** a signed-out browser books and pays with a Paystack test card, sees the confirmation with a manage link, and opens it in a private window to cancel and get the refund.
- **Account linking:** registering with the booking email and then verifying shows the booking in `/account`. Registering with the same email but **not** verifying does not.
- **Abuse limits:** the 6th booking attempt from one IP within an hour gets a 429. A 4th live hold for the same email is rejected.
- **Signed-in path:** the existing flow still works.

### Phase 3: Response latency (T3) · ~1 day

1. Return the `verify`, webhook, `cancel` and walk-in responses first, then send confirmation and refund emails afterwards, using Next's `after()` for Pages API routes on Next 16 (check `node_modules/next/dist/docs`) or Vercel `waitUntil`. A failed send falls back to the Phase 1 queue.
2. Generate the PDF on demand, for downloads and attachments, never on the request path that confirms payment.

**Gate:** p95 for `GET /payments/verify` is under 1.5 s, excluding Paystack's own latency. Confirmation emails are still delivered.

### Phase 4: Availability performance (T4) · ~1 day

1. Add a single SQL function `get_stay_availability(p_check_in, p_check_out, p_resort)` that returns per-room-type availability (maintenance and live holds included) and seasonal per-night rates in one round-trip. The TypeScript pricing engine stays the source of the price total.
2. Add `Cache-Control: private, max-age=15` on GET responses, and debounce the wizard's date changes (fetch 300 ms after the last change).

**Gate:** p95 for `/api/v1/availability` is under 300 ms against the hosted project (SRS 5.1).

### Phase 5: Navbar hydration (T5) · ~0.25 day

1. Compute `currentPath` from `router.asPath.split(/[?#]/)[0]`, and only once `router.isReady` (before that, fall back to `router.pathname`).
2. Add a regression test that renders `Navbar` with `asPath = "/#gallery"` on the server and the client and asserts the same output.

**Gate:** no hydration warnings when loading `/`, `/#anything`, `/rooms` or `/booking?deal=X`.

### Phase 6: Tests and docs · ~1.5 days (in parallel)

- Unit and integration tests (FakeSupabase plus PGlite):
  - guest booking without auth;
  - access-token authorization: valid, wrong booking, expired, cookie and query variants;
  - linking only after verification;
  - hold cap and rate limit;
  - email failure queueing and retry.
- PGlite migration checks for `0008` (constraints, function grants, linking).
- A Playwright smoke test for the guest checkout happy path (a mocked Paystack redirect), which starts the Step 14 e2e suite.
- Update `implementation.md`, the README environment notes and the audit plan status.

**Total estimate:** ~9–11 dev-days.

---

## Decisions needed before Phase 2

1. **SRS sign-off.** Who approves the v1.3 change to booking without an account (product owner or compliance owner)?
2. **Manage-link lifetime.** The proposal is 30 days after check-out, plus "email me a new link". Is that acceptable, or should it never expire?
3. **Linking existing accounts.** Should a guest booking made with an email that already belongs to a **verified** account link immediately (recommended), or only when the user next signs in?
4. **Hold-abuse limits.** Are 5 bookings per hour per IP and 3 live holds per email right for church and group retreat bookings, where several bookings from one office IP are normal? An alternative is a higher IP limit for logged-in users.

---

## Decisions (product owner, 2026-10-15)

1. **SRS change approved.** Guest checkout goes ahead; the SRS is updated to v1.3.
2. **Manage link lifetime:** 30 days after check-out.
3. **Guest bookings made with the email of a verified account link to that account immediately**, at booking time.
4. **Abuse limits:** **10 bookings per hour per IP** and **3 live pending holds per email**. **reCAPTCHA on booking is deferred** (keys not set up; still in development). Add it before production launch.
5. Phase 3 uses `waitUntil` from `@vercel/functions` (pinned to 3.9.8). Next's `after()` is App Router only.

---

## Implementation status (2026-10-15)

| Phase                      | Status                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Email reliability        | Done                    | Failures queued in `failed_emails` (secret-link emails rebuilt by handlers, never stored); `EMAIL_PROVIDER_UNAVAILABLE` log code; retry job at `/api/v1/internal/jobs/retry-failed-emails` (needs `CRON_SECRET` + a schedule; see README); honest register/resend messages; dev console prints action links. **SendGrid credits still need restoring (ops).**                                                                       |
| 2 Guest checkout           | Done                    | Migration `0008`; `services/booking/access.ts`; guest-capable booking/payment/cancel/PDF/resend endpoints; `/manage-booking/[ref]` + `/manage-booking` (request a new link); claim endpoint; wizard confirm-email + consent; confirmation screen manage link + account CTA; linking on verification and immediately for verified accounts; 10/hour/IP + 3 live holds/email; SRS updated to v1.3. reCAPTCHA deferred per decision 4. |
| 3 Response latency         | Done                    | Confirmation/refund emails run after the response via `waitUntil` (`runAfterResponse`).                                                                                                                                                                                                                                                                                                                                             |
| 4 Availability performance | Done                    | `get_stay_availability` (1 round-trip) + 15 s private cache + 300 ms wizard debounce. Re-measure p95 against the hosted project after `db push`.                                                                                                                                                                                                                                                                                    |
| 5 Navbar hydration         | Done                    | Hash/query-safe active link; regression test fails on the old code.                                                                                                                                                                                                                                                                                                                                                                 |
| 6 Tests and docs           | Done, except Playwright | New regression tests for guest checkout, linking, limits, claim, guest cancel, email queue/retry, Navbar; PGlite checks for `0008`. **Playwright e2e deferred to Step 14** (needs browser binaries plus a Paystack test double).                                                                                                                                                                                                    |

**Before testing on the hosted project:** run `npx supabase db push` to apply `0008` (the app now calls the new `create_booking_with_lock` signature and `get_stay_availability`).
