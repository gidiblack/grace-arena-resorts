# Admin Browser Test — Findings & Fix Plan (Steps 12A, 12B, 15)

**Tested:** 2026-10-16/17 · branch `feature/gar-admin-crud-phase-2` @ `9c38b1a` · `next dev` (16.2.1, Turbopack) against the hosted Supabase project in `.env.local`
**Method:** headless Chrome (playwright-core) driving the admin UI as Super Admin, Resort Admin, Content Manager and guest; console, page errors and every 4xx/5xx captured.

## Implementation status (2026-10-17)

**All fixes are done, including Fix 1.** Migration `0009` is applied to the hosted project (`supabase migration list --linked` shows 0001–0009 on both sides). Unit tests: 241 passing. Before the push, 0009 was tightened: `check_in_booking` now locks the booking and each unit and raises `INVALID_LINE_ITEM` / `ROOM_TYPE_MISMATCH`.

Post-migration browser check (Super Admin), all passing:

- Summary, notifications, bookings/revenue/occupancy analytics and `refundQueue` all return 200; booking counts and the real channel keys are populated.
- Check-in assigns a unit (occupied), the timeline shows each transition once, a second booking into the same unit gets 409 `ROOM_NOT_AVAILABLE`, and check-out releases the unit.
- Cancelling a cash booking with a ₦1,000 override sets `admin_cancelled` + `refund_pending`/`cash`; the booking appears in the refund queue; Mark Failed → `refund_failed`; Mark Processed → `partially_refunded`. A 2-character reason keeps Confirm disabled.
- Offline bank-transfer payment confirms a pending hold atomically.
- Every admin page is readable; the bell lists all 4 queues on every page. The only console errors left are the expected 401 before login.

Notes:

- **Dev 404s:** the root cause was the Turbopack dev filesystem cache (default since 16.1), not `next build`; `next.config.ts` disables it for dev.
- **`src/types/db.ts`** is hand-maintained (custom aliases such as `BookingChannel`) and already covers the 0009 tables, columns and RPCs, so it was not regenerated.
- **Media uploads (follow-up, done):** files now go from the browser straight to Storage. `POST /api/v1/media/upload-url` checks the declared type and size and issues a signed upload URL for a server-chosen path. `POST /api/v1/media` then registers the file by `storagePath` after checking the stored object's real size and magic bytes (read through a one-off signed URL so unverified files never enter the public CDN cache). Rejected files are deleted, and deleting an asset now deletes its stored file. Migration `0010_media_direct_uploads.sql` removes SVG from the `media-public` bucket, and `0011_media_upload_limit_50mb.sql` caps it at 50 MB (both applied). Images are limited to 10 MB and MP4 videos to 50 MB, matching the Supabase Free plan's per-upload limit. Verified in Chrome against the hosted project with a 6 MB image and a 20 MB MP4. Step 13's job-schedule migration is renumbered to `0012`.
  - **If the project moves to a paid plan:** raise `MAX_VIDEO_BYTES` in `src/services/media/media-rules.ts` and the bucket limit (new migration) together.
  - **Known:** deleted files can stay reachable from the CDN cache until it expires; uploads abandoned between upload and registration remain in the bucket (candidate for a Step 13 cleanup job).
- **Not done:** `npm run format:check` still fails on 16 files this work did not touch (pre-existing from the Step 15 commit).

## What passed

- **Access control:** unauthenticated → `/login?redirect=…`; guest role kept out of `/admin` and 403 on admin APIs; idle cookie > 30 min → `reason=idle`; locked users cannot log in.
- **Role matrix:** Content Manager has no revenue cards, no `revenue` in `/admin/summary`, 403 on analytics/booking/room mutations, no booking action buttons, Rooms/Users/Settings hidden and redirected. Resort Admin gets analytics, Users/Settings hidden. Self-lock and self-demotion are refused.
- **Bookings:** list filters (status, channel, payment status, date range, search), admin booking creation (`walk_in`, `user_id` null, real transfer reference), duplicate transfer reference (409), status API rejects `cancelled`/`confirmed`, No-Show 24 h guard, offline payment amount and duplicate-reference checks, override without reason (400).
- **Rooms:** unit maintenance persists and restores; `occupied` cannot be set manually; maintenance blocked while occupied; room type edit, seasonal rate add/delete/overlap/inverted dates, Mark Available, delete; deleting a booked room type refused (409).
- **Step 15 modules:** restaurants + menu items, facilities, gems, deals, media upload/delete, contact status, newsletter CSV, settings save, all 7 Content CMS pages load and invalid JSON is blocked; staff user creation, duplicates (409), weak passwords (400), role changes.

## P0 — blocks 12A/12B from working at all

### 1. Migration `0009_admin_operations.sql` is not applied to the hosted database

**Evidence:**

- `check_in_booking` returns `PGRST202 Could not find the function`.
- Booking rows have no `status_changed_by` or `cancellation_reason`.
- Payment rows have no `refund_method`, `refund_reference` or `refund_processed_by`.
- No `booking_room_assignments` rows are written.

**Downstream effects seen in the browser:**

- Check-in returns 200, but the booking stays `confirmed` while its unit becomes `occupied`.
- Admin cancel returns 409/500 `CANCEL_FAILED`.
- Offline payment returns 500 after inserting the payment.
- The "Refunds to process" flow can't start.
- The status timeline is empty.
- Every booking metric on the dashboard is 0 (the analytics query selects `cancellation_reason`).

**Fix:**

1. `npx supabase link` → `npx supabase db push` to the dev project (and to staging/prod at release).
2. `npx supabase gen types typescript --linked > src/types/db.ts`.
3. Add to the Step 13 health endpoint (or a startup log) a check that the 0009 RPCs exist, so schema drift fails loudly.

### 2. Silent fallbacks and unchecked Supabase errors hide failures

- [status.ts](../../src/pages/api/v1/bookings/[ref]/status.ts): on **any** RPC error (including a legitimate "unit already assigned"), the handler falls back to unguarded inserts and updates, ignores their errors, and returns 200. Reproduced:
  - a second booking was "checked in" to an already occupied unit with 200;
  - unit EFS-01 was left `occupied` with no booking.
  - **Fix:** remove the fallbacks and map RPC errors to 409/400/500.
- `status.ts` `no_show` branch (and the fallbacks) insert into `booking_status_history` by hand while the 0009 trigger also logs every status change, so each change is logged twice. **Fix:** delete the manual inserts; the trigger is the single writer.
- [offline-payment.ts](../../src/pages/api/v1/bookings/[ref]/offline-payment.ts) inserts the payment, then updates the booking separately.
  - Reproduced: GAR-RKT52A9Z ended up `pending` with a `success` ₦64,500 payment. The hold-expiry job then cancelled it, so money is recorded against a cancelled booking with no refund.
  - **Fix:** always use the `record_offline_payment` RPC (single transaction). Never fall back to two writes.
- [cancel.ts](../../src/pages/api/v1/bookings/[ref]/cancel.ts) treats a failed claim update as "already being cancelled" (409). **Fix:** check `error` separately and return 500 for DB errors.
- [analytics-service.ts](../../src/services/analytics/analytics-service.ts) ignores query errors and reports zeros. **Fix:** throw on `error` so the endpoint returns 500 and the dashboard shows an error state.

### 3. Refund override is silently dropped on an invalid body

`cancel.ts`: `cancelRequestSchema.safeParse` failure sets `payload = undefined` and the cancellation continues at the **policy** refund.

- An override reason under 3 characters (the UI accepts 1–2) cancels with a full refund instead of the override.
- **Fix:** return 400 `INVALID_REQUEST_BODY` when parsing fails. In the cancel modal, require ≥ 3 characters to match the schema.

### 4. Admin text and inputs are near-invisible (white on white)

[globals.css:13](../../src/styles/globals.css#L13) sets `body { color: #f1f5f9 }` for the dark public site, and forces input text to `#f8fafc` unless an ancestor has `[data-theme="light"]`. The admin shell has light backgrounds and never resets either.

**Affected text (every admin page):**

- guest name and email, booking dates, line items, gateway reference;
- table cells, user names, Joined dates;
- form section headings, prefilled values (dates, nights, `+234`), the role filter select;
- the Content CMS JSON editor.

**Fix:** on the `AdminLayout` root, set `data-theme="light"` and `color="gray.800"`. Re-check modals, which render outside normal flow.

### 5. Zod 4 `.uuid()` rejects every seeded ID

`z.string().uuid()` enforces RFC 4122 variant bits, so `33333333-3333-3333-3333-333333333301` is rejected (verified). As a result, `/admin/rooms/new` cannot create a room type in any existing building ("Building ID must be a valid UUID"). The same applies to `resort_id` on restaurants, facilities and buildings, menu item `id`, inquiry `assigned_to`, and check-in `roomId`/`bookingLineItemId`.

**Fix:** replace with `z.guid()` in:

- [rooms/index.ts](../../src/pages/api/v1/rooms/index.ts)
- [buildings/index.ts](../../src/pages/api/v1/buildings/index.ts)
- [facilities/index.ts](../../src/pages/api/v1/facilities/index.ts)
- [restaurants/index.ts](../../src/pages/api/v1/restaurants/index.ts)
- [restaurants/[id]/menu.ts](../../src/pages/api/v1/restaurants/[id]/menu.ts)
- [events/inquiries/[id].ts](../../src/pages/api/v1/events/inquiries/[id].ts)
- [bookings/[ref]/status.ts](../../src/pages/api/v1/bookings/[ref]/status.ts)

## P1 — spec gaps and correctness

| #   | Issue                                                                                                                                                                                                     | Fix                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | **Status timeline never renders.** [bookings/[ref].tsx](../../src/pages/admin/bookings/[ref].tsx) reads `status_history` from `GET /api/v1/bookings/{ref}`, which doesn't return it.                      | Add a staff-only `GET /api/v1/bookings/{ref}/history` that merges `booking_status_history` (actor null → "System") with admin `audit_logs` notes; render both. |
| 7   | **Assigned Units panel shows the wrong units.** It lists every unit of the _first_ line item's room type with any active assignment, from any booking.                                                    | Filter `activeAssignment.booking_id === booking.id` across all line items.                                                                                     |
| 8   | **Multi-room bookings can't be checked in.** The modal renders one select per line item; the API requires one unit per booked room (Σ quantity). Line items also show the "Room Suite" fallback name.     | Render `quantity` selects per line item and block duplicate unit picks; join `room_types(name)` in the list API.                                               |
| 9   | **Search box → HTTP 500 on a comma** (bookings `q`, users `search`). The term is interpolated into PostgREST `.or()` unescaped, which also allows filter injection.                                       | Strip or escape `,()` (or quote the value) before building `.or()`; add tests.                                                                                 |
| 10  | **"Refunds to process" definition is wrong.** The quick filter, dashboard count and bell use `refund_pending` only. Spec: `refund_pending` with a manual method, or `refund_failed`.                      | Add a `refundQueue=true` API filter and reuse it in the summary count.                                                                                         |
| 11  | **Revenue by room type doesn't reconcile with net revenue.** It sums pre-tax `line_total` and ignores refunds. The channel breakdown seeds keys that don't exist (`direct_web`, `phone_whatsapp`, `ota`). | Allocate net paid amount (after refunds) per booking to room types; key channels by the real enum.                                                             |
| 12  | **Media upload trusts the client MIME type.** A non-image file named `.png` was stored as `image/png`.                                                                                                    | Sniff magic bytes server-side (allow-list jpeg/png/webp/avif/mp4) and enforce the size limit on the actual bytes.                                              |
| 13  | **Bell count only appears on the dashboard.** Other pages pass no `notificationCount`. The bell is a non-focusable `HStack`.                                                                              | Load the summary counts in `AdminLayout` (shared hook, short poll); make the bell a `<button aria-label>` linking to the relevant queues.                      |
| 14  | **Content Manager gets 404 instead of 403** on `PUT /bookings/{ref}/cancel`.                                                                                                                              | Return 403 for staff roles without cancel rights.                                                                                                              |

## P2 — polish and housekeeping

- **Missing Update actions (Step 15 "full CRUD"):** restaurants, facilities, gems, menu items, media (alt text/category) and deals offer only create, delete or toggle, though the `PUT /[id]` APIs exist. Add edit modals.
- **Icon-only delete buttons have no `aria-label`** (restaurants, facilities, gems, deals, pricing, menu). Add `aria-label="Delete <name>"`.
- **`colorScheme` is a Chakra v2 prop;** v3 ignores it, so status badges and action buttons render uncoloured. Replace with `colorPalette` across `src/pages/admin/**` and `src/components/admin/**`.
- **`NextLink … legacyBehavior`** logs a deprecation error on every admin page ([AdminSidebar.tsx:221](../../src/components/admin/AdminSidebar.tsx#L221), [AdminBreadcrumb.tsx](../../src/components/admin/AdminBreadcrumb.tsx), [bookings/index.tsx](../../src/pages/admin/bookings/index.tsx), [rooms/index.tsx](../../src/pages/admin/rooms/index.tsx), [restaurants/index.tsx](../../src/pages/admin/restaurants/index.tsx)). Switch to Chakra `asChild` with `NextLink`.
- **Dev-only console error on every page:** `Refused to execute script … _clientMiddlewareManifest.js (MIME 'application/json')`. Next 16.2 dev serves JSON at a `.js` URL, and our global `X-Content-Type-Options: nosniff` blocks it. It's harmless (dev fetches `_devMiddlewareManifest.json`), but to silence it, skip the header for `/_next/static/development/:path*` when `isDev` in [next.config.ts](../../next.config.ts).
- **A logged-in guest opening `/admin`** is bounced to `/login` with no message. Redirect to `/account` with a notice instead.
- **Dynamic routes 404 in dev after `next build`.** All `[param]` pages and API routes 404'd until `.next/dev` was deleted. Add to the README/runbook: `rm -rf .next` after a production build before `npm run dev`.
- **Date min on the new-booking form** uses `toISOString()` (UTC). Compute "today" in WAT.

## Test data left in the hosted database

| Record                                                                                                                           | State                                                                     | Suggested action                                      |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| GAR-CUASU9EM (checked out), GAR-M8MWAM3Z (cancelled, partial manual refund processed)                                            | used by the post-migration check                                          | Delete when no longer needed                          |
| GAR-6ED9M3H5 (bank transfer, 8–10 Dec), GAR-9S3EB9EG (bank transfer, 18 Dec)                                                     | `confirmed`; they hold Standard Room inventory and count in revenue       | Cancel (exercises the manual refund path) or delete   |
| GAR-RKT52A9Z                                                                                                                     | `cancelled` by hold expiry with an orphan `success` bank-transfer payment | Delete, or mark the payment refunded                  |
| `gidibetim+garcm@` (content_manager), `gidibetim+garra@` (resort_admin), `gidibetim+garguest@` (guest), password `E2eTest@12345` | active                                                                    | Lock or delete when no longer needed for role testing |
| Unit EFS-01                                                                                                                      | restored to `available`                                                   | —                                                     |
| Test restaurants, facilities, gems, deals, room types, media                                                                     | deleted                                                                   | —                                                     |

## Suggested order and verification

1. Fix 1 (apply 0009) → fixes 2, 3, 5 → re-run the 12A flow: check-in/out, cancel with override, refund failed → processed, offline payment on a pending hold.
2. Fix 4 (contrast) → visual pass on every admin page and modal.
3. P1 items 6–14, each with a unit test (status timeline API, `refundQueue` filter, search escaping, magic-byte sniffing, check-in Σ quantity).
4. P2 items.
5. Fold the browser scripts into Step 14's `e2e/` Playwright suite so this pass runs in CI.
