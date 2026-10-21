# Google Stitch Prompt Pack — Grace Arena Resorts Admin Dashboard

How to use this in Stitch:

1. Pick **Web** as the platform and use Experimental / Pro mode if you have it (it gives higher fidelity).
2. Paste **Prompt 0 (Master)** first. It sets the design system and builds the Dashboard screen.
3. Paste each **screen prompt (1–13)** one at a time in the same project. Each one starts with a short style recap so Stitch keeps the look consistent.
4. Refine with one or two small changes per follow-up prompt. Stitch handles small, targeted edits much better than big rewrites.
5. Use **Prompt 14** at the end if you want a dark-mode variant.

---

## Prompt 0 — Master: Design System + Dashboard

```
Design a desktop web admin dashboard (1440px wide) for "Grace Arena Resorts" (GAR), a luxury Christian resort in Nigeria with two campuses: GAR Elysian (premium rooms and suites) and GAR Village (rustic-luxury thatched huts). Staff use this panel to run bookings, rooms, restaurants, content and settings. It should feel like a five-star hotel's private office: rich, confident and vibrant, never like a generic SaaS template. Use a deep navy and black frame, warm gold accents, crisp white data cards and generous whitespace.

BRAND PALETTE (must match the public website):
- Midnight Navy #0B132B: sidebar, hero banner, primary dark surfaces
- Abyss Navy #0A0F1D: deepest layer, gradient ends
- Slate Navy #1E293B: dividers and hover states on dark surfaces
- Royal Navy #1A365D: links, secondary chart series, info accents on light surfaces
- Onyx Black #070707: text on gold, maximum-contrast elements
- Signature Gold #FCCA46: primary buttons, active nav item, key highlights
- Deep Gold #E7B81E: hover and pressed state of gold
- Metallic Gold #D4AF37: hairline borders, focus rings, icons, chart line
- Champagne #C5A880: soft tags and secondary accent
- Mist #F1F5F9: page canvas. White #FFFFFF: cards. Ink #0F172A: body text. Slate #64748B: secondary text.
- Status colours: Emerald #10B981 (success, checked-in), Amber #F59E0B (pending, always paired with an icon so it never reads as brand gold), Crimson #E53E3E (cancelled, failed, destructive), Azure #3182CE (info).
Gold is for emphasis only, about 10% of the screen. Navy is the frame and white is the workspace.

TYPOGRAPHY: Roboto for headings (semibold, slightly tight tracking) and Plus Jakarta Sans for body, tables and labels. Use tabular numerals for money and counts. Currency is Nigerian Naira, e.g. ₦1,240,000.

LAYOUT SHELL (reused on every screen):
- Left sidebar, 264px wide: vertical gradient from #0B132B to #0A0F1D. At the top, a gold diamond-shaped "GAR" monogram, the wordmark "GRACE ARENA" in white with "ADMIN · OPERATIONS & CMS" below it in small gold letter-spaced caps. Then grouped navigation with small uppercase group labels in Slate:
  OVERVIEW: Dashboard
  OPERATIONS: Bookings, Rooms & Suites
  HOSPITALITY: Restaurants, Facilities, Off-Beat Gems, Events & Inquiries, Deals & Promos
  ENGAGEMENT: Contact Messages, Newsletter
  CONTENT: Content CMS, Media Library
  ADMINISTRATION: User Management, System Settings (each with a tiny "Super Admin" lock chip)
  Nav items have a line icon and label in light grey. The active item gets a soft gold-tinted pill (#FCCA46 at 12% opacity), a 3px solid gold bar on its left edge, and gold icon and text. Hover gives a #1E293B background. Count badges appear on Bookings (pending count) and Contact Messages (unread). Pin a collapse toggle to the bottom of the sidebar.
- Top bar, 72px, white with a subtle bottom border: page title and breadcrumb ("Admin / Dashboard") on the left. On the right: a global search field ("Search bookings, guests, references…"), an outlined "View Site ↗" button, a notification bell with a gold count dot, then a user chip with avatar initials, the name "Adaeze Okafor" and a role badge "Resort Admin" (role badge colours: Super Admin = gold on black, Resort Admin = navy on white with navy border, Content Manager = champagne).
- Content area on the Mist canvas, 32px padding, 12-column grid. Cards are white with 16px radius, a 1px #E2E8F0 border and a very soft navy-tinted shadow.

DASHBOARD SCREEN CONTENT:
1. Hero welcome banner across the full width: a navy-to-black gradient (#0B132B → #070707) with faint gold line-art of palm fronds and a thatched hut roof in the right corner. Text reads "Good morning, Adaeze" in white and "Resort Operations Dashboard · Friday, 17 October 2026" in Champagne. Add a pulsing green "Live Overview" pill. On the right, three Quick Action buttons: "Create Booking" (solid gold with black text), "Add Deal" and "Upload Media" (gold outline on navy).
2. KPI row of 4 large metric cards. The first, "Net Revenue (Month)", is the hero card: a gold gradient (#FCCA46 → #D4AF37) with black text showing ₦18,450,000, a +12.4% vs last month chip, and the sub-line "Today ₦640,000 · Week ₦3,120,000". The others are white cards with navy icons in gold-tinted circles: "Total Bookings (Month)" 142 (Today 6 · Week 31), "Today's Occupancy" 78% with a thin circular progress ring in gold ("39 of 50 units active"), and "Pending Bookings" 7 with an amber "Action Needed" chip ("Awaiting payment confirmation"). Each card has a tiny sparkline.
3. Second row of 3 compact cards: "Refunds to Process" 3 (red "Review" chip), "Unread Inbox" 12 ("8 contacts · 4 events", orange "New" chip), "Newsletter Audience" 1,284 ("1,190 confirmed subscribers").
4. Main row: on the left (8 columns), "Bookings & Revenue — Last 30 Days" as a combo chart: Royal Navy bars for daily bookings, a smooth Metallic Gold line with a soft gold area fill for revenue, dual y-axes and a 7D / 30D / 90D segmented toggle. On the right (4 columns), "Recent Activity" as a vertical timeline feed of the last 10 events, each with a coloured icon dot: a new booking GAR-7KQ2M9XA (emerald), an event inquiry from Mrs Bello for a wedding (champagne), a cancellation (crimson), a contact message (azure), and audit actions (slate). Each shows a relative time like "4 min ago".
5. "Occupancy Calendar" heatmap card showing the current and next month side by side as calendar grids. Each day cell shows the date and an occupancy %, coloured on a ramp from pale champagne (#FBF3D5, low) through Signature Gold to deep bronze (#B7791F, high). Fully sold-out days are Midnight Navy with gold text. Show a legend: 0% Available · 1–40% · 41–75% · 76–99% · 100% Sold Out.
6. Insight row of 3 mini stat cards: "Average Length of Stay" 2.8 nights, "Deal Redemptions" 23, "Expired Holds" 5 ("Pending holds released after timeout").
7. Two side-by-side tables: "Revenue by Payment Gateway" (Gateway, Payments, Gross, Refunds, Net Revenue, with rows for Paystack, Bank Transfer, Cash, POS) and "Revenue by Room Type" (Room Type, Bookings, Net Revenue, with rows for Executive Suite – Executive Huts, Premium Suite – The Cabana, Deluxe Room – Fountain Haven, Standard Room – Fountain Haven). Net revenue figures are emerald and bold, and each row has a slim inline gold bar showing its share.

STYLE DETAILS: line icons with 1.5px stroke, 8px spacing scale, 16px card radius and 10px button radius, a subtle gold focus ring on every interactive element, and WCAG AA contrast throughout. Use real Nigerian names and NGN amounts; no lorem ipsum. Tables have sticky headers, zebra rows in #F8FAFC, and a gold-tinted row hover.
```

---

## Prompt 1 — Bookings List

```
Using the same GAR admin design system (navy gradient sidebar with Bookings active in gold, white top bar, Mist canvas, white cards, Signature Gold #FCCA46 primary buttons, Roboto/Plus Jakarta Sans), design the "Bookings" screen.

- Page header: title "Bookings", subtitle "Manage reservations across GAR Elysian and GAR Village", and on the right a gold "+ Create Booking" button.
- Status summary chips as horizontal tabs with counts: All 142 · Pending 7 · Confirmed 58 · Checked-In 21 · Checked-Out 49 · Cancelled 5 · No-Show 2, plus a separate red-outlined "Refunds to Process 3" chip.
- Filter bar card: search ("Reference, guest name or email"), date-range picker (check-in), Resort dropdown (All / GAR Elysian / GAR Village), Channel dropdown (Online / Walk-in / Phone / WhatsApp) and a "Clear filters" link.
- Data table with columns: Reference (bold Royal Navy monospace, e.g. GAR-7KQ2M9XA), Guest (avatar initials, name and email), Channel (small icon pill: globe = Online, door = Front Desk, phone, WhatsApp green), Dates ("Oct 18 → Oct 21 · 3 nights"), Rooms ("2 × Executive Suite"), Booking Status pill (Pending amber with a clock icon, Confirmed navy, Checked-In emerald, Checked-Out slate, Cancelled crimson, No-Show grey with strikethrough), Payment pill (Paid, Unpaid, Refund Pending, Refunded), Total (₦, right-aligned) and a "View →" action.
- 10 realistic rows, pagination footer ("Showing 1–10 of 142"), rows-per-page select.
- A read-only variant hint: a slim banner reading "Content Managers have read-only access to bookings", with the Create button disabled.
```

## Prompt 2 — Booking Detail

```
Same GAR admin design system. Design the "Booking Detail" screen for reference GAR-7KQ2M9XA. Breadcrumb: Admin / Bookings / GAR-7KQ2M9XA.

- Header card on a navy gradient (#0B132B): large reference in white monospace with a copy icon, a "Confirmed" status pill, channel "Online · Paystack", and created date. On the right, the state-machine action buttons: "Check In" (solid emerald), "Mark No-Show" (outline grey) and "Cancel Booking" (outline crimson). Add a horizontal status stepper below: Pending → Confirmed → Checked-In → Checked-Out, with the current step glowing gold.
- Left column (8 cols):
  • "Guest Information" card: Full Name, Email Address, Phone Number, Account Status (Registered / Guest checkout), Privacy Consent ✓.
  • "Rooms & Stay" card: check-in Sat 18 Oct 14:00 → check-out Tue 21 Oct 11:00, 3 nights, 2 adults · 1 child, and a table with Room Type, Quantity, Rate / Night, Line Total.
  • "Special Requests" card containing a quoted guest note.
  • "Status History" vertical timeline (audit trail): each entry shows the status change, who made it (staff name and role), timestamp and an optional note.
- Right column (4 cols, sticky):
  • "Pricing Breakdown" receipt-style card: Subtotal, Promotional Discount (code EASTER25, in emerald), VAT & Taxes (7.5%), and a large bold "Total Amount ₦612,450" above a gold hairline divider.
  • "Payment" card: gateway, Paystack reference, paid date, "Paid" pill, and a "Record Offline Payment" secondary button.
  • "Refund" card (when cancelled): calculated refund per policy, an "Override Refund Amount (Admin)" field with a mandatory reason, refund status Pending → Processed / Failed, and buttons "Retry Paystack Refund" and "Mark as Processed (Paid to Guest)".
- Also show the "Check In" modal open over a dimmed backdrop: for each booked room, a dropdown to assign a specific unit (e.g. "EH-04 · Floor 1 · Available"), with "Confirm Check-In" in gold.
```

## Prompt 3 — Create Booking (Walk-in / Concierge)

```
Same GAR admin design system. Design "Create Reservation (Admin / Concierge)" for front-desk, phone and WhatsApp bookings.

Two-column layout. The left side is a vertical form of 3 numbered section cards with gold numbered circles:
1. "Guest Details": full name, email, phone (+234), and a "Reservation Source / Channel" segmented control (Front Desk / Phone / WhatsApp).
2. "Stay & Room Selection": check-in and check-out date pickers, Adults and Children steppers, then selectable room-type cards grouped by campus (GAR Elysian / GAR Village), each with a thumbnail, tier badge, nightly rate, live availability ("4 of 10 available") and a quantity stepper. Under-construction rooms (Presidential Suite, Royal Suite) appear disabled with a "Coming Soon" ribbon.
3. "Payment & Settlement": payment method radio cards (Cash at Front Desk, POS Terminal, Bank Transfer); a payment reference field that is required for bank transfer (placeholder "e.g. NIP/ZENITH/109283921"); and a "Special Requests / Notes" textarea.
The right side is a sticky navy summary card: guest name, dates and nights, a room line-items list, Subtotal, VAT 7.5% and a gold large Total, plus the note "Booking will be marked Confirmed immediately". At the bottom are a full-width gold "Create & Confirm Reservation" button and a "Cancel" text button.
```

## Prompt 4 — Rooms & Suites

```
Same GAR admin design system, with Rooms & Suites active. Design "Room Status & Unit Operations".

- Header with "+ Add Room Type" (gold) and "+ Add Building" (outline) buttons.
- Campus switcher as two large toggle cards with photo backgrounds and navy overlays: "GAR Elysian · 3 buildings · 30 units" and "GAR Village · 3 buildings · 30 units".
- Filters: Tier (Standard, Deluxe, Premium, Executive, Presidential, Royal), Status (Available / Under Construction), and search.
- Room-type table with columns: Room Suite (thumbnail, name and building, e.g. "Premium Suite · The Cabana"), Campus / Tier (tier badge whose gold intensity increases with rank, Royal being solid gold on black), Base Rate (₦120,000 / night), Units ("6 total · 4 free" with a mini segmented bar showing available, occupied and maintenance), Status pill, and Actions (Edit, Pricing, Manage Units).
- Show the "Manage Physical Units" side drawer open on the right: a table with Unit #, Floor, Status (an inline dropdown with Available green, Occupied navy, Maintenance amber), Active Guest (name and booking ref for occupied units, locked with the hint "Occupied (Manage via check-out)"), and a "Done" button.
```

## Prompt 5 — Room Edit + Seasonal Pricing

```
Same GAR admin design system. Design the "Edit Room Type" screen for "Executive Suite · Executive Huts".

The layout has a main form plus a right-hand meta panel. The form contains: Name, Tier dropdown, a rich-text Description editor with a toolbar, Base Price (₦), Max Guests, Total Units, and Status ("Available (Bookable Online)" / "Under Construction"). Add an "Amenities" structured editor: a list of chips grouped by category (Comfort, Tech, Bathroom, Faith & Wellness, including "Prayer Hut access"), each with a "Conditional" toggle and a "+ Add amenity" row. Add an "Image Gallery" with a drag-to-reorder thumbnail grid, a "Cover" gold badge on the first image, and a dashed gold drop zone.
The right panel has a live preview card of how the room looks on the public site (dark navy card with gold price), Save (gold), "Back to Rooms" and a crimson "Delete Suite" link.

Below, add a tab or section called "Seasonal Pricing": a table with Season / Label ("Christmas Peak", "Easter Retreat"), Start Date, End Date, Nightly Rate (₦) and Actions. Above it, show a horizontal 12-month timeline strip visualising the season ranges as gold bars over a navy track, plus an "Add Seasonal Price Override" modal containing an inline overlap-validation error state.
```

## Prompt 6 — Restaurants & Menu Editor

```
Same GAR admin design system, with Restaurants active. Design two views side by side, or as a list → detail flow:
1. "Restaurants" list as large cards with a food photo, name, cuisine type, campus tag, open/closed-now pill, operating hours summary, and "Edit" and "Manage Menu" buttons.
2. "Menu Editor" for one restaurant: category tabs (Starters, Mains, Desserts, Beverages) with item counts. Each item is a draggable row (grip handle) with name, short description, price (₦4,500), an "Available" toggle in gold, and edit/delete icons. Include a weekly "Operating Hours" editor card (Mon–Sun rows with open/close time pickers and a "Closed" toggle). Add an "Add Menu Item" modal with name, category, description, price and availability.
```

## Prompt 7 — Facilities, Off-Beat Gems & Deals (shared CRUD pattern)

```
Same GAR admin design system. Design a reusable list + drawer-form CRUD pattern, shown for "Deals & Promotional Offers":
- Header with the gold "+ New Deal" button and toggle filters: Active / Scheduled / Expired.
- Deal table: Deal Title (with banner thumbnail), Promo Code (a monospace ticket-style chip with a dashed gold border and copy icon, or "Automatic"), Discount ("25% off" or "₦20,000 off"), Valid Dates with a mini progress bar showing elapsed time, Status (Active emerald / Scheduled azure / Expired grey), Actions.
- Right-side drawer form "Create Deal": title, description, discount type and value, start/end date pickers (with the error "End date must be after start date"), Promo Code with a "Generate" button that fills a random code, an "Applicable Room Types" multi-select showing chips, an Active toggle, and a banner image upload.
- A soft-delete confirmation dialog: navy header, crimson "Delete" button, and the text "Hidden from the public site, kept in records."
Also show small thumbnails of the same pattern applied to "Facilities" (columns: Facility Name, Campus, Featured star toggle, Actions) and "Off-Beat Gems" (Attraction Name, Category, Distance & Duration, Actions).
```

## Prompt 8 — Events Inquiries & Contact Messages (Inbox)

```
Same GAR admin design system. Design an email-client-style split inbox for "Events & Inquiries".
- The left pane (40%) lists inquiries: contact name, event category chip (Wedding, Retreat, Conference, Birthday), preferred date, guest count, status pill (New gold-filled dot, In Review azure, Responded emerald, Closed grey) and relative time. Unread rows are bold with a gold left bar.
- The right pane (60%) shows the selected inquiry ("Inquiry from Mrs Funmilayo Bello"): all submitted fields in a definition grid, a Status dropdown (New → In Review → Responded → Closed), an "Assign To" staff dropdown with avatars, an "Internal Notes" textarea with a saved-notes history, and a "Reply via Email" gold button.
Then design the same split layout for "Contact Messages": columns Sender, Subject, Date Received, Status (New / Read / Responded / Closed), with the full message on the right and a "Reply via Email" button.
```

## Prompt 9 — Media Library

```
Same GAR admin design system, with Media Library active. Design "Media Asset Library".
- Header with the gold "Upload Media" button and a large dashed gold drag-and-drop zone ("Drop images or videos here · JPEG, PNG, WebP up to 10 MB · MP4 up to 100 MB").
- Category filter chips: All Categories, Resort Gallery, Room Suites, Facilities, Restaurants & Dining, Events, Deals. A grid/list view toggle sits on the right.
- Masonry grid of resort photos (pool, huts, suites, dining). Each tile shows a hover overlay in navy at 70% with file name, dimensions, size and upload date, plus icon buttons: Edit details, Copy URL, Delete. Video tiles show a play badge and duration. Tiles with missing alt text show a small amber "Alt text missing" chip.
- An upload modal showing per-file progress bars filling in gold, with a success tick and an error state.
- An "Edit Media Details" modal: large preview, alt text field (placeholder "e.g. Presidential hut thatched roof exterior view at sunset"), category select, Save Changes.
- A delete warning dialog: "This asset is used in 2 places: Executive Suite gallery, Pool facility".
```

## Prompt 10 — Content CMS

```
Same GAR admin design system, with Content CMS active. Design "Content Management (CMS)".
On the left is a vertical list of managed pages as cards with icon, title and "Last published 3 days ago by Chidi": About & Our Story, Facilities Showcase, Off-Beat Gems, Events & Gatherings, Contact Information, Privacy Policy (NDPR/NDPA), Terms & Conditions. The selected page has a gold left bar.
On the right is the editor for "About & Our Story": structured fields (Hero headline, Intro paragraph, Mission, Vision, Faith Statement, Team section) using rich-text editors with a clean toolbar. A sticky header bar shows a "Draft – unsaved changes" amber dot, an outline "Preview" button and a gold "Publish" button. Include a "Preview" mode thumbnail that renders the content in the public site's dark navy and gold style.
```

## Prompt 11 — Newsletter & User Management

```
Same GAR admin design system. Design two screens.
A) "Newsletter Subscribers": 3 stat cards at the top (Total 1,284 · Confirmed 1,190 · Unsubscribed 41) and a gold area chart "Subscriber Growth – last 6 months". Below is a table with Subscriber Email, Double Opt-In Status (Confirmed emerald / Awaiting amber), Subscribed Date and Confirmed Date, plus an "Export CSV" outline button with a download icon.
B) "Staff & User Access Control" (with a "Super Admin Only" badge): a table with Full Name & Email (avatar), Assigned Role (badge: Super Admin gold-on-black, Resort Admin navy, Content Manager champagne), Email Verified, Status (Active / Locked with a lock icon), Joined, and Actions (Change role, Lock/Unlock). The current user's row is marked "You", with delete disabled. Add a "Provision Admin Account" modal (name, email, phone optional, role select with a description of each role's access, and the note "An invitation email with a temporary password will be sent").
```

## Prompt 12 — System Settings

```
Same GAR admin design system, with System Settings active and a "Super Admin Only" badge. Design "Resort Operations & System Settings" as a centred 800px column. On the left is a sticky in-page section nav, and on the right are 4 numbered section cards with gold numbered circles:
1. Financial & Tax Configuration: VAT rate (%) input defaulting to 7.5, with a live example ("₦100,000 room → ₦107,500").
2. Operational Timings & Inventory Locks: check-in time 14:00, check-out time 11:00, pending booking hold expiry (minutes) 30, and cancellation policy thresholds (hours).
3. Contact Information & Location: phone numbers, emails, physical address, social URLs, WhatsApp number (2348012345678), and Google Maps coordinates (7.4431, 3.2842) with a small map preview.
4. Payment Gateway Downtime Override: a big toggle card. Off shows "Standard Mode (Paystack Online Active)" in emerald. On turns the card amber with "Fallback Mode – Bank transfer / WhatsApp concierge shown to guests".
A sticky bottom save bar reads "You have unsaved changes", with Discard and a gold "Save Settings" button.
```

## Prompt 13 — System States & Components Sheet

```
Same GAR admin design system. Create a single component and states reference board showing:
- Buttons: primary gold, secondary navy, outline, ghost, destructive crimson, disabled, and loading (with spinner). Each with default, hover and focus states.
- Status pills for bookings (Pending, Confirmed, Checked-In, Checked-Out, Cancelled, No-Show), payments, refunds and inquiries.
- In-app dialogs: info (azure), confirm (navy), destructive (crimson), success (emerald). These replace browser alert and confirm pop-ups.
- Toasts in the top-right: success, error, info.
- An empty state (line illustration of a thatched hut with a gold sun, "No bookings match these filters", "Clear filters" button), a loading skeleton table, and an error state with a "Retry" button.
- An idle-timeout modal: "You'll be signed out in 60s for security" with a gold "Stay signed in" button.
- Form inputs: text, select, date picker, toggle, checkbox, multi-select chips, file drop zone, and rich-text toolbar, each with default, focus (gold ring) and error states.
```

## Prompt 14 — Optional Dark Mode Variant

```
Create a dark-mode variant of the GAR Dashboard screen. Canvas #070707, cards #0B132B with 1px #1E293B borders, and the sidebar #0A0F1D. Primary text #F1F5F9, secondary #94A3B8. Keep Signature Gold #FCCA46 for primary actions and the active nav, and Metallic Gold #D4AF37 for chart lines. Brighten Royal Navy chart bars to #3B82F6 for contrast. The hero revenue card stays gold with black text. Keep WCAG AA contrast.
```
