# Software Requirements Specification — Grace Arena Resorts (GAR) Website

**Version:** 1.0
**Date:** March 29, 2026
**Status:** Draft
**Prepared by:** Software Architecture Team
**Audience:** Developers, Designers, QA Engineers, Project Stakeholders

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Pages & Client-Side Functional Requirements](#3-pages--client-side-functional-requirements)
4. [Server-Side Functional Requirements](#4-server-side-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Data Model](#6-data-model)
7. [API Endpoint Summary](#7-api-endpoint-summary)
8. [Third-Party Integrations](#8-third-party-integrations)
9. [Appendices](#9-appendices)

---

## 1. Introduction

> **Design Note:** This SRS is authored as the single source of truth for the GAR website project. Given that the resort is an actively operating business with rooms under construction and future expansion plans, the document must be treated as a living artifact — versioned and updated as business requirements evolve. The architecture should accommodate rooms and facilities that don't yet exist without requiring schema changes.

### 1.1 Purpose

This Software Requirements Specification defines the complete functional and non-functional requirements for the Grace Arena Resorts (GAR) website. It serves as the authoritative reference for:

- **Developers** — to implement frontend and backend systems with precise specifications
- **Designers** — to understand page structures, user flows, and interaction requirements
- **QA Engineers** — to derive test cases and acceptance criteria
- **Stakeholders** — to validate that the system captures all business requirements before development begins

### 1.2 Scope

The GAR website encompasses:

- **Public-Facing Guest Site** — a responsive, SEO-optimized website with 10 primary pages enabling guests to explore the resort, browse rooms, make bookings, and contact staff
- **Admin / CMS Panel** — a secured dashboard for resort staff to manage rooms, bookings, content, restaurants, deals, and event inquiries
- **Booking Engine** — a multi-room reservation system with calendar availability, price calculation, and payment processing
- **API Layer** — a RESTful backend serving data to the frontend and integrating with third-party services (payment, WhatsApp, maps, email, SMS)

Out of scope for v1.0: native mobile applications, loyalty/rewards program, multi-language support (architecture will support future localization).

### 1.3 Definitions & Acronyms

| Term              | Definition                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| **GAR**           | Grace Arena Resorts — the resort brand                                                           |
| **GAR Elysian**   | The premium/luxury tier resort campus (buildings: Fountain Haven, Oasis Villa, The Cabana)       |
| **GAR Village**   | The rustic/hut-style resort campus (buildings: Executive Huts, Presidential Huts, Royal Huts)    |
| **SRS**           | Software Requirements Specification                                                              |
| **CMS**           | Content Management System                                                                        |
| **API**           | Application Programming Interface                                                                |
| **NGN**           | Nigerian Naira (₦)                                                                               |
| **Off-Beat Gems** | GAR's branded term for curated local attractions and things to do                                |
| **Prayer Hut**    | A distinguishing Christian-resort amenity — a dedicated private prayer space available to guests |
| **Room Tier**     | Classification hierarchy: Standard → Deluxe → Premium → Executive → Presidential → Royal         |
| **OG Tags**       | Open Graph meta tags for social media previews                                                   |
| **LCP**           | Largest Contentful Paint (Core Web Vital)                                                        |
| **WCAG**          | Web Content Accessibility Guidelines                                                             |

### 1.4 References

| Document                   | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| GAR Brand Guidelines       | Visual identity, color palette, typography, logo usage (TBD) |
| Paystack API Documentation | Payment gateway integration reference                        |
| WhatsApp Business API Docs | Messaging integration reference                              |
| Google Maps Platform Docs  | Maps embed and geocoding reference                           |
| SendGrid API Documentation | Transactional email service reference                        |
| OWASP Top 10 (2025)        | Security vulnerability mitigation reference                  |
| WCAG 2.1 AA                | Accessibility compliance standard                            |

---

## 2. Overall Description

> **Design Note:** GAR operates two distinct resort campuses (Elysian and Village) with different aesthetics and price points but under a unified brand. The architecture must cleanly separate these as data-driven configurations rather than hard-coding them as separate subsystems. This allows the addition of future campuses without structural changes. The Christian-resort identity is a key differentiator — the Prayer Hut amenity and faith-based content should be first-class concerns in the data model and UI, not afterthoughts.

### 2.1 Product Perspective

The GAR website is a standalone, mobile-responsive web application. It is the resort's primary digital presence and booking channel. The system is self-contained with the following external touchpoints:

- Payment gateway (Paystack) for online transactions
- WhatsApp Business API for guest communication
- Google Maps API for location services
- Email/SMS services for notifications
- CDN for media asset delivery

A future native mobile app may consume the same API layer, so the backend must be designed as a decoupled service with a well-defined API contract.

### 2.2 Product Features Summary

- Hero-driven home page with video, resort category browsing, amenities, facilities, map, and gallery
- Room browsing with tier-based filtering across two resort campuses
- Multi-room booking engine with calendar availability, price calculation, and payment
- Restaurant pages with menus, operating hours, and dining reservation CTAs
- Facilities showcase with descriptions, images, and hours
- Off-Beat Gems (activities and attractions) with category filtering
- Events & Experiences portal with inquiry forms
- Deals & Offers management with promo codes and newsletter signup
- Contact page with form, map, WhatsApp integration, and social links
- Admin CMS for all content, bookings, rooms, restaurants, deals, and inquiries
- SEO optimization with structured data, SSR/SSG, and sitemap
- WhatsApp as a primary CTA across key pages
- "Notify Me" feature for under-construction rooms

### 2.3 User Classes & Characteristics

| User Class                  | Description                                                                              | Access Level                                             |
| --------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Guest (Unauthenticated)** | Anonymous website visitor browsing pages, viewing rooms, exploring facilities            | Public pages only                                        |
| **Registered Guest**        | User with an account who can make and manage bookings, view booking history              | Public pages + booking management                        |
| **Content Manager**         | Staff member who manages page content, menus, deals, media uploads                       | CMS: content, restaurants, facilities, deals, media      |
| **Resort Admin**            | Staff member who manages rooms, bookings, event inquiries, and operational data          | CMS: all content + rooms, bookings, inquiries, analytics |
| **Super Admin**             | System administrator with full access including user management and system configuration | Full system access                                       |

### 2.4 Operating Environment

- **Browsers:** Chrome, Firefox, Safari, Edge (latest 2 major versions)
- **Devices:** Mobile (320px+), Tablet (768px+), Desktop (1024px+)
- **Hosting:** Cloud hosting (e.g., Vercel for Next.js frontend, cloud VM or managed service for API)
- **Database:** PostgreSQL (relational, suitable for transactional booking data)
- **Runtime:** Node.js 20 LTS or later

### 2.5 Design & Implementation Constraints

- **Currency:** All monetary values displayed and stored in Nigerian Naira (₦ / NGN). No multi-currency support required in v1.0.
- **Language:** English only. Architecture must use i18n-ready patterns (externalized strings) to support future localization.
- **Branding:** Christian-themed — imagery, copy, and features (Prayer Hut) must reflect a faith-based, family-friendly resort. No alcohol-centric promotion.
- **WhatsApp:** Must be a primary CTA (not secondary) on Rooms & Suites, Booking, and Contact pages.
- **Under Construction Rooms:** Presidential and Royal huts must appear in the UI with a visible "Under Construction" badge and must NOT be bookable. A "Notify Me" registration feature is required.

### 2.6 Assumptions & Dependencies

- Paystack (or Flutterwave) is available and approved for NGN online payment processing.
- WhatsApp Business API access is provisioned for the resort's phone number.
- Google Maps API key is available with Maps Embed and Places API enabled.
- Resort provides all media assets (photos, videos) or authorizes stock imagery.
- Domain name and SSL certificate are provisioned.
- Resort provides real menu data, pricing, and operating hours for restaurants and facilities.
- Email service (SendGrid or equivalent) is configured for transactional email.

---

## 3. Pages & Client-Side Functional Requirements

> **Design Note:** The frontend is built with Next.js (App Router or Pages Router, based on team preference) to leverage SSR/SSG for SEO-critical pages (Home, Rooms, About) and client-side rendering for interactive flows (Booking). Each page must be independently deployable as a static page where possible, falling back to SSR for dynamic data (availability, prices). All pages share a common layout: sticky navbar, footer, WhatsApp floating action button (bottom-right), and cookie consent banner.

**Global UI Elements (all pages):**

- Sticky top navbar with logo, navigation links, "Book Now" CTA button, and mobile hamburger menu
- Footer with resort address, quick links, social media icons, newsletter signup, and copyright
- Floating WhatsApp button (bottom-right corner, always visible)
- Cookie consent banner on first visit
- Page transition loading indicator

**Global SEO Requirements (all pages):**

- Unique `<title>` and `<meta name="description">` per page
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`)
- Twitter Card tags
- Canonical URL
- Structured data (JSON-LD) as specified per page

**Global Accessibility Requirements (all pages):**

- WCAG 2.1 AA compliance
- Semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- ARIA labels on interactive elements without visible text
- Keyboard navigability for all interactive components
- Minimum contrast ratio 4.5:1 for text, 3:1 for large text
- Alt text on all images
- Focus indicators on interactive elements
- Skip-to-content link

---

### 3.1 Home Page

**Route:** `/`

**Layout & UI Components:**

1. **Hero Section** — Full-viewport background video (muted, autoplay, looped) with overlay text (resort tagline, "Book Now" CTA). Four floating "Off-Beat Gems" cards overlaid at the bottom of the hero — auto-rotate every 5 seconds, user-swipeable on mobile, click to navigate to Off-Beat Gems page.

2. **Resort Categories Section** — Two cards side by side (stacked on mobile): **GAR Elysian** and **GAR Village**. Each card contains a background image, title, short description, and a "View Rooms" CTA linking to `/rooms?type=elysian` or `/rooms?type=village`.

3. **Amenities Snapshot** — Section title "Resort Amenities". Two-row flexbox grid showing 8 amenity icons with labels initially visible. Horizontal scroll reveals additional amenities. Each amenity shows an icon and label text.

4. **Facilities Carousel** — Section title "Our Facilities". Three facility cards visible at a time on desktop, one on mobile. Horizontally scrollable with left/right arrow buttons. Each card: image, facility name, short description, "Learn More" link to `/facilities`.

5. **Photo Gallery** — Masonry or grid layout of resort photos. Clicking any photo opens a lightbox overlay with navigation arrows. Images are lazy-loaded with placeholder blur.

6. **Map Section** — Embedded Google Maps interactive map showing the resort location with a branded pin. Address text and "Get Directions" link below.

**Data Requirements:**

- Off-Beat Gems (featured subset): `GET /api/v1/gems?featured=true`
- Amenities list: `GET /api/v1/amenities`
- Facilities (featured subset): `GET /api/v1/facilities?featured=true`
- Gallery images: `GET /api/v1/media?category=gallery&page=home`

**SEO:**

- JSON-LD: `Hotel` schema with name, address, star rating, image, price range
- Title: "Grace Arena Resorts — A Serene Christian Retreat"

**Responsive Behavior:**

- Hero video replaced with static image on mobile if bandwidth is constrained (use `<picture>` or `prefers-reduced-motion`)
- Resort category cards stack vertically on mobile
- Facilities carousel shows one card at a time on mobile
- Gallery switches from masonry to 2-column grid on mobile

---

### 3.2 Rooms & Suites

**Route:** `/rooms`
**Query Parameters:** `?type=elysian|village` (optional, defaults to showing both)

**Layout & UI Components:**

1. **Page Header** — Title "Rooms & Suites", subtitle, and two prominent CTAs: "Book Now" button and "Contact via WhatsApp" button (with WhatsApp icon).

2. **Resort Type Toggle** — Tab/toggle selector: "GAR Elysian" | "GAR Village". Active tab is visually highlighted. URL updates query parameter on toggle.

3. **Resort Detail Section** — For the selected resort type: hero image, title, description, features list.

4. **Rooms List** — Cards for each room type within the selected resort. Each card contains:
   - Room name and tier badge (color-coded by tier)
   - Thumbnail image
   - Price in NGN (e.g., "₦60,000 / night") — or "Price TBD" for under-construction rooms
   - Key amenities summary (top 5, including **Prayer Hut** always visible)
   - Max guest capacity icon
   - **"Under Construction"** badge for Presidential and Royal huts — these cards are visually distinct (greyed or outlined) with a "Notify Me" button instead of "Book This Room"
   - "Book This Room" CTA for available rooms — navigates to `/booking?room={roomTypeId}`
   - "View Details" link expanding or navigating to full amenity list

5. **Full Amenity Modal/Accordion** — When "View Details" is clicked, displays the complete amenity list for that room type, categorized into "In-Room Amenities" and "Resort Amenities" (shared access). Items subject to availability are flagged with a small info tooltip.

**Room Inventory Data:**

#### GAR Elysian — Buildings & Rooms

| Building           | Room Type       | Tier      | Count                     | Price (NGN) | Max Guests |
| ------------------ | --------------- | --------- | ------------------------- | ----------- | ---------- |
| The Fountain Haven | Standard Room   | Standard  | 10                        | ₦60,000     | 2          |
| The Fountain Haven | Deluxe Room     | Deluxe    | 5                         | ₦70,000     | 2          |
| The Oasis Villa    | Deluxe Suite    | Deluxe    | 4 (downstairs apartments) | ₦80,000     | 2          |
| The Oasis Villa    | Premium Suite   | Premium   | 4 (apartments)            | ₦90,000     | 2          |
| The Cabana         | Premium Suite   | Premium   | 6                         | ₦120,000    | 2          |
| The Cabana         | Executive Suite | Executive | 1 (twin room)             | ₦180,000    | 4          |

#### GAR Village — Buildings & Rooms

| Building          | Room Type          | Tier         | Count | Price (NGN) | Max Guests | Status             |
| ----------------- | ------------------ | ------------ | ----- | ----------- | ---------- | ------------------ |
| Executive Huts    | Executive Suite    | Executive    | 10    | ₦100,000    | —          | Available          |
| Presidential Huts | Presidential Suite | Presidential | 10    | TBD         | —          | Under Construction |
| Royal Huts        | Royal Suite        | Royal        | 10    | TBD         | —          | Under Construction |

#### Room Tier Hierarchy (lowest → highest)

**Standard** → **Deluxe** → **Premium** → **Executive** → **Presidential** → **Royal**

#### Full Amenities Per Room Type

**Standard Room (Fountain Haven):**

- King-size Bed 6×6
- Air conditioner
- Standing Fan
- Mini Refrigerator
- Vanity Table
- Complimentary Breakfast for One Guest
- Room Services Available
- Laundry & Ironing Services Available
- Bath Amenities (vanity kit — soap, body cream, shampoo)
- Water Heater
- Tea & coffee making facilities
- Access to Resort Facilities \*\*
- Gym Access \*\*
- Free WiFi
- Cable TV (DStv) / Netflix
- Intercom Phone
- **Prayer Hut** \*\*
- Welcome drink (one bottle of water)
- Up to 2 Guests

**Deluxe Room (Fountain Haven):**

- King-size bed
- Air conditioner
- Standing Fan
- Mini Refrigerator
- Vanity Table
- Relaxation chairs
- Complimentary Breakfast for One Guest
- Room Services Available
- Laundry & Ironing Services Available
- Bath Amenities (deluxe tier vanity kit — soap, body cream, shampoo, bath gel)
- Water Heater
- Tea & coffee making facilities
- Access to Resort Facilities \*\*
- Gym Access \*\*
- Free WiFi
- Cable TV (DStv)
- Welcome drink (one bottle of water, 1 drink & biscuit)
- Intercom Phone
- **Prayer Hut** \*\*
- Bed Lamps
- Up to 2 Guests

**Deluxe Suite (Oasis Villa):**

- Exclusive suite with bedroom & kitchenette
- King-size bed
- Air conditioner
- Standing Fan
- Mini Refrigerator
- Microwave
- Kitchenette (Zinc, Cupboard, Small Cooktop)
- Vanity Table / Long Mirror
- Complimentary Breakfast for One Guest
- Room Services Available
- Laundry & Ironing Services Available
- Water Heater
- Access to Resort Facilities \*\*
- Gym Access \*\*
- Free WiFi
- Satellite TV
- Intercom Phone
- Tea & coffee making facilities
- Welcome drink (one bottle of water, 1 drink)
- **Prayer Hut** \*\*
- Up to 2 Guests

**Premium Suite (Oasis Villa):**

- Exclusive suite with living room, bedroom & kitchenette
- King-size bed
- Air conditioner
- Standing Fan
- Mini Refrigerator
- Microwave
- Kitchenette (Zinc, Cupboard, Small Cooktop)
- Vanity Table
- Complimentary Breakfast for One Guest
- Room Services Available
- Laundry & Ironing Services Available
- Water Heater
- Access to Resort Facilities \*\*
- Gym Access \*\*
- Free WiFi
- Satellite TV
- Intercom Phone
- Tea & coffee making facilities
- Welcome drink (one bottle of water, 1 drink)
- **Prayer Hut** \*\*
- Bathrobes
- Up to 2 Guests

**Premium Suite (Cabana):**

- Ante Room
- Air conditioner
- Standing Fan
- Mini Refrigerator
- Vanity Table
- Complimentary Breakfast for One Guest
- Room Services Available
- Laundry & Ironing Services Available
- Water Heater
- Access to Resort Facilities \*\*
- Gym Access \*\*
- Free WiFi
- Satellite TV (Netflix, YouTube, Amazon Prime)
- Intercom Phone
- Tea & coffee making facilities
- **Prayer Hut** \*\*
- Exclusive Shallow Pool
- Welcome drink (one bottle of water, 1 drink)
- Bathrobes
- Pool Towels
- Private Terrace (furnished with Sunbed)
- Private Balcony
- Up to 2 Guests

**Executive Suite (Cabana):**

- 1 unit with living room, guest toilet, bedroom & kitchenette
- Ante Room
- Air conditioner
- Standing Fan
- Mini Refrigerator
- Reading Corner / Table / Workspace
- Complimentary Breakfast for One Guest
- Room Services Available
- Laundry & Ironing Services Available
- Water Heater
- Access to Resort Facilities \*\*
- Gym Access \*\*
- Free WiFi
- Satellite TV (Netflix, YouTube, Amazon Prime)
- Intercom Phone
- Tea & coffee making facilities
- **Prayer Hut** \*\*
- Exclusive Shallow Pool
- Welcome drink (one bottle of water, 1 drink & biscuit)
- Fully Fitted Kitchen (Cooker, Fridge, Freezer, Blender etc.)
- Bathrobes
- Pool Towels
- Private Terrace (furnished with Sunbed)
- Private Balcony
- Up to 4 Guests

**Executive Suite (Village Hut):**

- Air conditioner
- Standing Fan
- Mini Refrigerator
- Reading Corner / Table / Workspace
- Complimentary Breakfast for One Guest
- Room Services Available
- Laundry & Ironing Services Available
- Water Heater
- Access to GAR Village Resort Facilities \*\*
- Gym Access \*\*
- Free WiFi
- Smart TV (Netflix, YouTube, Amazon Prime)
- Intercom Phone
- Tea & coffee making facilities
- **Prayer Hut** \*\*

> Items marked with `**` are shared/resort-level amenities (not private to the room). Items subject to availability or seasonal changes will be flagged in the UI with an informational tooltip.

**Data Requirements:**

- Room types by resort: `GET /api/v1/rooms?resort={elysian|village}`
- Room type detail: `GET /api/v1/rooms/{roomTypeId}`

**SEO:**

- JSON-LD: `LodgingBusiness` with `makesOffer` listing each room type, price, and description
- Title: "Rooms & Suites — Grace Arena Resorts"

**Responsive Behavior:**

- Room cards stack vertically on mobile, 2-column on tablet, 3-column on desktop
- Resort toggle becomes full-width tabs on mobile
- Amenity details render in an accordion on mobile (instead of modal)

---

### 3.3 Booking Page

**Route:** `/booking`
**Query Parameters:** `?room={roomTypeId}` (optional pre-selection)

**Layout & UI Components:**

1. **Date Selector** — Check-in date picker (blocks past dates and fully-booked dates) + number of nights dropdown/stepper (1–30). Check-out date is auto-calculated and displayed.

2. **Guest Selector** — Number of adults (1–10), number of children (0–10) via stepper inputs.

3. **Room Selection Area:**
   - Filter controls: resort type (Elysian/Village), room tier, availability
   - Available rooms displayed as selectable cards with name, price, thumbnail, key amenities
   - "Add Room" button on each card — supports adding multiple rooms to a single booking
   - Under-construction rooms are not displayed in this selector
   - Selected rooms appear in the booking summary sidebar

4. **Booking Summary Sidebar** (sticky on desktop, collapsible on mobile):
   - Itemized list of selected rooms with per-room price
   - Dates and duration
   - Guest count
   - Subtotal
   - Taxes and fees (itemized)
   - **Total (NGN)**
   - "Remove" action per room line item

5. **Guest Information Form:**
   - Full name (required)
   - Email address (required, validated)
   - Phone number (required, Nigerian format validated)
   - Special requests (optional, textarea, max 500 characters)

6. **Payment Section:**
   - Payment gateway integration (Paystack inline checkout)
   - Displays total amount before initiating payment
   - Handles success, failure, and timeout states

7. **Confirmation Screen** (post-payment):
   - Booking reference number (prominently displayed)
   - Full booking summary (rooms, dates, guests, total paid)
   - "Download Confirmation" (PDF) and "Email Confirmation" buttons
   - "Contact Us on WhatsApp" CTA
   - "Return to Home" link

8. **WhatsApp CTA** — Persistent banner or button: "Need help booking? Chat with us on WhatsApp"

**Business Logic:**

- Prevent booking dates in the past
- Validate guest count does not exceed combined max guests of selected rooms
- Real-time availability check before payment initiation
- Price = (base room price × number of nights × number of rooms) + applicable taxes
- Booking is only confirmed upon successful payment callback

**Data Requirements:**

- Availability check: `GET /api/v1/availability?checkIn={date}&nights={n}&resort={type}`
- Create booking: `POST /api/v1/bookings`
- Initiate payment: `POST /api/v1/payments/initiate`
- Verify payment: `POST /api/v1/payments/verify`

**SEO:**

- Title: "Book Your Stay — Grace Arena Resorts"
- `noindex` meta tag (transactional page, not indexed)

**Responsive Behavior:**

- Summary sidebar collapses to a bottom sheet on mobile
- Date picker uses native mobile date input on touch devices
- Form fields stack vertically on mobile

---

### 3.4 About GAR

**Route:** `/about`

**Layout & UI Components:**

- Hero image with overlay: resort name, tagline
- **Our Story** section — narrative text about the resort's founding, Christian values, and mission
- **Mission & Vision** — side-by-side or stacked cards
- **Core Values** — icon + label grid (e.g., Faith, Hospitality, Serenity, Excellence)
- **Timeline / Milestones** — vertical or horizontal timeline showing key events (founding, expansion, new builds)
- **Leadership Team** — optional grid of team member cards (photo, name, title, short bio)
- **Awards & Recognitions** — badge or card layout (if applicable; hidden if empty)
- **CTA Section** — "Explore Our Rooms" and "Book Your Stay" buttons

**Data Requirements:**

- About page content: `GET /api/v1/content/about`

**SEO:**

- JSON-LD: `Organization` schema
- Title: "About Us — Grace Arena Resorts"

---

### 3.5 Facilities Page

**Route:** `/facilities`

**Layout & UI Components:**

Section-by-section layout, each facility in its own section with:

- Facility name (heading)
- Description text
- Image gallery (horizontal scroll or grid)
- Operating hours (if applicable)
- Location within the resort (if relevant)

**Facilities to include:**

| Facility                           | Description Highlights                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Modern Mall**                    | Spa & sauna, e-learning library, gym, indoor arcade with cantilevered human glass facade, mini mart |
| **Recreation Park**                | Fitness lawn tennis court, mini soccer pitch                                                        |
| **Love Garden**                    | Tall shed umbrella trees, relaxation setting                                                        |
| **Movie Theater**                  | Screens Christian and heritage films                                                                |
| **Games Room**                     | Indoor games and entertainment                                                                      |
| **Swimming Pool**                  | Outdoor pool with lounging area                                                                     |
| **Fire Pit**                       | Outdoor gathering and relaxation space                                                              |
| **Village Mall & Village Cuisine** | Classic pattern design, diverse local and continental menu                                          |

**Data Requirements:**

- Facilities list: `GET /api/v1/facilities`

**SEO:**

- JSON-LD: `TouristAttraction` or `SportsActivityLocation` per facility
- Title: "Facilities — Grace Arena Resorts"

---

### 3.6 Restaurants & More

**Route:** `/restaurants`

**Layout & UI Components:**

For each restaurant/dining outlet:

- Name, description, cuisine type
- Photo gallery (carousel)
- Operating hours
- Menu — categorized: Starters, Mains, Desserts, Beverages — each item with name and price (₦)
- CTA: "Make a Reservation" (opens contact form or WhatsApp) and "Chat on WhatsApp"

**Restaurants:**

| Restaurant                 | Type                                 |
| -------------------------- | ------------------------------------ |
| **GAR Village Restaurant** | Local & continental cuisine          |
| **GAR Elysian Restaurant** | Fine dining                          |
| **Suya Hut**               | Grilled meats / Nigerian street food |
| **Shawarma Spot**          | Shawarma & wraps                     |

**Data Requirements:**

- Restaurant list: `GET /api/v1/restaurants`
- Menu items: `GET /api/v1/restaurants/{id}/menu`

**SEO:**

- JSON-LD: `Restaurant` schema per outlet with menu, price range, opening hours
- Title: "Restaurants & Dining — Grace Arena Resorts"

---

### 3.7 Off-Beat Gems (Things to Do)

**Route:** `/gems`

**Layout & UI Components:**

- Page title "Off-Beat Gems" with introductory text
- Category filter tabs: Nature, Culture, Adventure, Spiritual, All
- Card-based grid layout, each card: image, title, short description, distance/duration from resort, category badge
- "Learn More" or "Book This Experience" CTA per card

**Data Requirements:**

- Gems list: `GET /api/v1/gems?category={category}`

**SEO:**

- JSON-LD: `TouristAttraction` per gem
- Title: "Off-Beat Gems — Things to Do Near Grace Arena Resorts"

---

### 3.8 Events & Experiences

**Route:** `/events`

**Layout & UI Components:**

1. **Event Categories** — tabs or section anchors: Weddings, Photo/Video Shoots, Celebrations, Team Bonding

2. **Category Detail:** description, venue options within the resort, capacity info, sample packages (name, inclusions, indicative price range), photo gallery of past events

3. **Event Inquiry Form:**
   - Event type (dropdown: Weddings, Photo/Video Shoots, Celebrations, Team Bonding, Other)
   - Preferred date (date picker)
   - Estimated number of guests (number input)
   - Budget range (dropdown: ₦0–₦500k, ₦500k–₦1M, ₦1M–₦5M, ₦5M+)
   - Special requirements (textarea)
   - Contact details: name, email, phone
   - Submit button

4. **Past Events Showcase** — testimonial cards with quote, author name, event type, and accompanying photos

**Data Requirements:**

- Event categories and content: `GET /api/v1/events`
- Submit inquiry: `POST /api/v1/events/inquiries`

**SEO:**

- JSON-LD: `Event` schema per category
- Title: "Events & Experiences — Grace Arena Resorts"

---

### 3.9 Deals & Offers

**Route:** `/deals`

**Layout & UI Components:**

1. **Active Deals** — Card grid, each card: promotional image, title, validity dates, discount percentage or description, promo code (if applicable), "Book Now" CTA linking to `/booking?deal={dealId}`

2. **Filter Controls** — Category tabs: Room Deals, Dining Deals, Package Deals, Seasonal Offers

3. **Deal Detail** — Clicking a card expands or navigates to a detail view with full terms, conditions, and a prominent "Book With This Deal" CTA

4. **Newsletter Signup** — Inline form: "Get exclusive offers in your inbox." Email input + "Subscribe" button. GDPR-style consent checkbox.

**Data Requirements:**

- Active deals: `GET /api/v1/deals?active=true&category={category}`
- Subscribe to newsletter: `POST /api/v1/newsletter/subscribe`

**SEO:**

- JSON-LD: `Offer` schema per deal
- Title: "Deals & Offers — Grace Arena Resorts"

---

### 3.10 Contact Us

**Route:** `/contact`

**Layout & UI Components:**

1. **Contact Form:**
   - Name (required)
   - Email (required, validated)
   - Phone (optional)
   - Subject (dropdown: General Inquiry, Booking Assistance, Event Inquiry, Feedback, Other)
   - Message (required, textarea, max 1000 characters)
   - Submit button with loading state

2. **Embedded Google Map** — Interactive map with resort location pin. Below map: full physical address.

3. **Contact Information Cards:**
   - Phone numbers (clickable `tel:` links)
   - Email addresses (clickable `mailto:` links)
   - Physical address
   - Operating hours

4. **Google My Business Link** — "View on Google Maps" button

5. **Social Media Links** — Icon row: Facebook, Instagram, Twitter/X, YouTube, TikTok

6. **WhatsApp Direct Chat** — Prominent button: "Chat with Us on WhatsApp" (opens WhatsApp with pre-filled message)

**Data Requirements:**

- Submit contact form: `POST /api/v1/contact`
- Contact info (phone, email, address, hours): `GET /api/v1/content/contact`

**SEO:**

- JSON-LD: `ContactPage` and `LocalBusiness` with contact info
- Title: "Contact Us — Grace Arena Resorts"

---

## 4. Server-Side Functional Requirements

> **Design Note:** The backend is designed as a RESTful API (JSON over HTTPS) serving both the Next.js frontend (via SSR data fetching and client-side calls) and the admin CMS. All endpoints are versioned under `/api/v1/`. Authentication uses JWT tokens with short-lived access tokens and long-lived refresh tokens. The database is PostgreSQL for its relational integrity (critical for bookings and room inventory). Redis is used for session/cache storage and rate limiting. File storage uses an S3-compatible object store with CDN delivery.

### 4.1 Authentication & User Management

**Endpoints:**

| Method | Route                          | Description                                 |
| ------ | ------------------------------ | ------------------------------------------- |
| POST   | `/api/v1/auth/register`        | Guest registration (email + password)       |
| POST   | `/api/v1/auth/login`           | Login (returns JWT access + refresh tokens) |
| POST   | `/api/v1/auth/refresh`         | Refresh access token                        |
| POST   | `/api/v1/auth/logout`          | Invalidate refresh token                    |
| POST   | `/api/v1/auth/forgot-password` | Initiate password reset (sends email)       |
| POST   | `/api/v1/auth/reset-password`  | Complete password reset with token          |
| GET    | `/api/v1/auth/me`              | Get current user profile                    |
| PUT    | `/api/v1/auth/me`              | Update current user profile                 |

**Business Logic:**

- Passwords hashed with bcrypt (min cost factor 12)
- Email verification required before booking
- Password reset tokens expire after 1 hour
- JWT access tokens expire after 15 minutes; refresh tokens after 7 days
- Failed login attempts: lock account after 5 consecutive failures for 15 minutes
- Admin accounts created by Super Admin only (no self-registration for admin roles)

**Authorization Matrix:**

| Role             | Can Manage Users | Can Manage Content | Can Manage Bookings | Can Manage Rooms | System Config |
| ---------------- | ---------------- | ------------------ | ------------------- | ---------------- | ------------- |
| Registered Guest | Own profile only | No                 | Own bookings only   | No               | No            |
| Content Manager  | No               | Yes                | View only           | No               | No            |
| Resort Admin     | No               | Yes                | Yes                 | Yes              | No            |
| Super Admin      | Yes              | Yes                | Yes                 | Yes              | Yes           |

### 4.2 Room & Inventory Management

**Endpoints:**

| Method | Route                               | Description                                              |
| ------ | ----------------------------------- | -------------------------------------------------------- |
| GET    | `/api/v1/rooms`                     | List all room types (filterable by resort, tier, status) |
| GET    | `/api/v1/rooms/{id}`                | Get room type detail with full amenities                 |
| POST   | `/api/v1/rooms`                     | Create room type (admin)                                 |
| PUT    | `/api/v1/rooms/{id}`                | Update room type (admin)                                 |
| DELETE | `/api/v1/rooms/{id}`                | Soft-delete room type (admin)                            |
| GET    | `/api/v1/buildings`                 | List all buildings                                       |
| POST   | `/api/v1/buildings`                 | Create building (admin)                                  |
| PUT    | `/api/v1/buildings/{id}`            | Update building (admin)                                  |
| GET    | `/api/v1/rooms/{id}/units`          | List individual room units for a room type               |
| PUT    | `/api/v1/rooms/{id}/units/{unitId}` | Update unit status (admin)                               |

**Business Logic:**

- Each room type belongs to exactly one building, which belongs to exactly one resort campus
- Room availability is calculated from: total units - (confirmed bookings for date range) - (units under maintenance)
- Pricing supports: base price, seasonal pricing overrides (date ranges), and promotional pricing (linked to deals)
- Rooms with status "under_construction" are returned by the API but flagged — the frontend must not allow booking
- Amenities are stored as a structured JSON array on the room type, with each amenity having: `name`, `category` (in-room | resort-level), `isConditional` (subject to availability)
- Images are stored as references to the media library

### 4.3 Booking Engine

**Endpoints:**

| Method | Route                                 | Description                            |
| ------ | ------------------------------------- | -------------------------------------- |
| GET    | `/api/v1/availability`                | Check room availability for dates      |
| POST   | `/api/v1/bookings`                    | Create a new booking                   |
| GET    | `/api/v1/bookings/{ref}`              | Get booking by reference number        |
| GET    | `/api/v1/bookings`                    | List bookings (admin: all; guest: own) |
| PUT    | `/api/v1/bookings/{ref}/cancel`       | Cancel a booking                       |
| PUT    | `/api/v1/bookings/{ref}/status`       | Update booking status (admin)          |
| POST   | `/api/v1/bookings/{ref}/confirmation` | Resend confirmation email              |

**Booking Creation Request Schema (example):**

```json
{
  "checkInDate": "2026-05-15",
  "nights": 3,
  "rooms": [
    { "roomTypeId": "uuid-1", "quantity": 1 },
    { "roomTypeId": "uuid-2", "quantity": 2 }
  ],
  "adults": 4,
  "children": 1,
  "guest": {
    "fullName": "John Adeyemi",
    "email": "john@example.com",
    "phone": "+2348012345678",
    "specialRequests": "Late check-in please"
  },
  "dealId": "uuid-deal-1"
}
```

**Booking State Machine:**

```
Pending → Confirmed → Checked-In → Checked-Out
   ↓          ↓
Cancelled  Cancelled
              ↓
           No-Show
```

- **Pending** — Created but payment not yet received
- **Confirmed** — Payment verified successfully
- **Checked-In** — Guest has arrived (admin marks)
- **Checked-Out** — Guest has departed (admin marks)
- **Cancelled** — Cancelled by guest or admin (refund rules apply)
- **No-Show** — Guest did not arrive (admin marks after check-in date + grace period)

**Business Logic:**

- Booking reference: alphanumeric, 8 characters, prefixed with "GAR-" (e.g., GAR-A1B2C3D4)
- Availability is double-checked at booking creation (pessimistic locking or serialized transaction)
- Price calculation: `SUM(room_base_price × nights × quantity)` + tax rate (configurable, default 7.5% VAT) − deal discount (if applicable)
- Pending bookings expire after 30 minutes if payment is not completed
- Cancellation policy: full refund if cancelled ≥72 hours before check-in; 50% refund if 24–72 hours; no refund if <24 hours
- Confirmation email sent automatically on status change to Confirmed
- Multi-room bookings create one Booking record with multiple BookingLineItem records

### 4.4 Content Management (CMS)

**Endpoints:**

| Method | Route                           | Description                                      |
| ------ | ------------------------------- | ------------------------------------------------ |
| GET    | `/api/v1/content/{page}`        | Get page content (about, facilities, gems, etc.) |
| PUT    | `/api/v1/content/{page}`        | Update page content (admin)                      |
| GET    | `/api/v1/facilities`            | List facilities                                  |
| POST   | `/api/v1/facilities`            | Create facility (admin)                          |
| PUT    | `/api/v1/facilities/{id}`       | Update facility (admin)                          |
| DELETE | `/api/v1/facilities/{id}`       | Delete facility (admin)                          |
| GET    | `/api/v1/restaurants`           | List restaurants                                 |
| POST   | `/api/v1/restaurants`           | Create restaurant (admin)                        |
| PUT    | `/api/v1/restaurants/{id}`      | Update restaurant (admin)                        |
| GET    | `/api/v1/restaurants/{id}/menu` | Get restaurant menu                              |
| PUT    | `/api/v1/restaurants/{id}/menu` | Update restaurant menu (admin)                   |
| GET    | `/api/v1/gems`                  | List off-beat gems                               |
| POST   | `/api/v1/gems`                  | Create gem (admin)                               |
| PUT    | `/api/v1/gems/{id}`             | Update gem (admin)                               |
| DELETE | `/api/v1/gems/{id}`             | Delete gem (admin)                               |
| GET    | `/api/v1/deals`                 | List deals/offers                                |
| POST   | `/api/v1/deals`                 | Create deal (admin)                              |
| PUT    | `/api/v1/deals/{id}`            | Update deal (admin)                              |
| DELETE | `/api/v1/deals/{id}`            | Delete deal (admin)                              |
| GET    | `/api/v1/events`                | List event categories                            |
| POST   | `/api/v1/events/inquiries`      | Submit event inquiry                             |
| GET    | `/api/v1/events/inquiries`      | List inquiries (admin)                           |
| PUT    | `/api/v1/events/inquiries/{id}` | Update inquiry status (admin)                    |
| POST   | `/api/v1/media`                 | Upload media asset (admin)                       |
| GET    | `/api/v1/media`                 | List media assets (filterable)                   |
| DELETE | `/api/v1/media/{id}`            | Delete media asset (admin)                       |

**Business Logic:**

- Media uploads are validated for file type (JPEG, PNG, WebP, MP4) and max size (images: 10 MB, videos: 100 MB)
- Images are automatically optimized (resized, compressed, WebP conversion) on upload
- Media assets are served via CDN with cache headers
- Deals have `startDate`, `endDate`, and `isActive` flag; expired deals are auto-deactivated by a cron job
- Promo codes are unique, case-insensitive, and validated at booking time
- Event inquiries have statuses: New → In Review → Responded → Closed

### 4.5 Contact & Communication

**Endpoints:**

| Method | Route                            | Description                                  |
| ------ | -------------------------------- | -------------------------------------------- |
| POST   | `/api/v1/contact`                | Submit contact form                          |
| GET    | `/api/v1/contact`                | List submissions (admin)                     |
| PUT    | `/api/v1/contact/{id}`           | Mark submission status (admin)               |
| POST   | `/api/v1/newsletter/subscribe`   | Subscribe to newsletter                      |
| POST   | `/api/v1/newsletter/unsubscribe` | Unsubscribe from newsletter                  |
| POST   | `/api/v1/notify-me`              | Register interest in under-construction room |

**Business Logic:**

- Contact form submissions are stored in DB and forwarded to the resort's email address via SendGrid
- Rate limit contact form: max 3 submissions per IP per hour
- Newsletter subscription requires email confirmation (double opt-in)
- Unsubscribe link included in every newsletter email
- "Notify Me" registrations are stored with the room type ID and guest email; batch notification sent when room status changes from "under_construction" to "available"
- WhatsApp integration uses click-to-chat URLs for basic integration (`https://wa.me/{number}?text={prefilled_message}`); WhatsApp Business API used for automated booking confirmations if provisioned

### 4.6 Analytics & SEO

**Server-Side Implementation:**

- Next.js SSR/SSG for all public pages to ensure search engine crawlability
- JSON-LD structured data injected server-side per page (schemas: Hotel, LodgingBusiness, Restaurant, Event, Offer, TouristAttraction, Organization, ContactPage)
- Automatic `sitemap.xml` generation (updated on content change) and `robots.txt`
- Server-side Google Analytics / Tag Manager snippet injection

**Admin Dashboard Analytics:**

| Metric                 | Description                          |
| ---------------------- | ------------------------------------ |
| Total Bookings         | Count by status, date range          |
| Revenue                | Total and by room type, date range   |
| Occupancy Rate         | Booked units / total units per date  |
| Average Stay Duration  | Mean number of nights per booking    |
| Page Views             | Top pages, traffic sources (from GA) |
| Contact Submissions    | Count by status, subject             |
| Newsletter Subscribers | Total, growth rate                   |
| Deal Redemptions       | Promo code usage count               |

---

## 5. Non-Functional Requirements

> **Design Note:** As a resort website serving the Nigerian market, performance considerations must account for variable network quality (3G/4G), so aggressive asset optimization and progressive loading are essential. Security is critical because the system handles personal data and financial transactions. The system is not expected to handle massive concurrent traffic spikes but should comfortably serve several hundred concurrent users.

### 5.1 Performance

| Metric                              | Target                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| Largest Contentful Paint (LCP)      | < 2.5 seconds on 4G                                      |
| First Input Delay (FID)             | < 100 milliseconds                                       |
| Cumulative Layout Shift (CLS)       | < 0.1                                                    |
| Time to First Byte (TTFB)           | < 600 milliseconds                                       |
| API response time (95th percentile) | < 300 milliseconds                                       |
| Concurrent users supported          | 500+ simultaneous                                        |
| Image loading strategy              | Lazy loading with blur placeholder                       |
| Video loading strategy              | Lazy load, poster image, prefers-reduced-motion fallback |

### 5.2 Scalability

- Frontend: deployed on edge network (e.g., Vercel) with automatic scaling
- Backend API: horizontally scalable behind a load balancer; stateless design with external session store (Redis)
- Database: vertical scaling initially; read replicas for reporting queries if needed
- CDN: all static assets and media served via CDN (e.g., CloudFront, Cloudflare)
- Background jobs (email sending, image processing, cron tasks): message queue (e.g., BullMQ + Redis)

### 5.3 Security

| Requirement      | Implementation                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTPS            | Enforced on all endpoints; HSTS header                                                                                                                                                                                                    |
| Input Validation | Server-side validation on all inputs using schema validation (e.g., Zod, Joi)                                                                                                                                                             |
| SQL Injection    | Parameterized queries via ORM (e.g., Prisma, Drizzle)                                                                                                                                                                                     |
| XSS              | Output encoding; Content-Security-Policy header; sanitize user-generated content                                                                                                                                                          |
| CSRF             | SameSite cookies; CSRF token on mutating requests from browser                                                                                                                                                                            |
| Rate Limiting    | Per-IP and per-user rate limiting on auth and contact endpoints                                                                                                                                                                           |
| Authentication   | JWT with short-lived access tokens; refresh tokens stored in HttpOnly cookies                                                                                                                                                             |
| Password Storage | bcrypt (cost factor ≥ 12)                                                                                                                                                                                                                 |
| Data Encryption  | TLS 1.2+ in transit; AES-256 at rest for PII and payment data                                                                                                                                                                             |
| PCI-DSS          | Payment handled entirely via Paystack's hosted/inline checkout — no card data touches the server                                                                                                                                          |
| File Upload      | MIME type validation, file size limits, virus scanning recommended                                                                                                                                                                        |
| OWASP Top 10     | Mitigations for all categories (Injection, Broken Auth, Sensitive Data Exposure, XXE, Broken Access Control, Security Misconfiguration, XSS, Insecure Deserialization, Using Components with Known Vulnerabilities, Insufficient Logging) |
| Logging          | Centralized logging with no PII in logs; audit log for admin actions                                                                                                                                                                      |

### 5.4 Reliability & Availability

| Requirement          | Target                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Uptime               | 99.9% (excludes planned maintenance)                                                      |
| Database Backup      | Automated daily backups with 30-day retention                                             |
| Disaster Recovery    | Point-in-time recovery for database; infrastructure-as-code for redeployment              |
| Monitoring           | Application performance monitoring (e.g., Sentry for errors, uptime monitoring)           |
| Graceful Degradation | If payment gateway is down, show "Booking temporarily unavailable — contact via WhatsApp" |

### 5.5 Maintainability

- Code standards enforced via ESLint and Prettier
- TypeScript for type safety across frontend and backend
- Git-based version control with branch protection on main
- CI/CD pipeline: lint → test → build → deploy (staging → production)
- Automated test coverage target: ≥ 70% for backend business logic
- API documentation auto-generated (OpenAPI / Swagger)
- Database migrations managed via ORM migration tool

### 5.6 Internationalization

- English only in v1.0
- All user-facing strings externalized in translation files (e.g., JSON-based i18n)
- Currency formatting uses `Intl.NumberFormat` with NGN locale
- Date formatting uses `Intl.DateTimeFormat` or a library (dayjs)
- Architecture supports adding new locales without code changes

### 5.7 Accessibility

- WCAG 2.1 Level AA compliance
- Automated accessibility testing integrated in CI (e.g., axe-core)
- Manual accessibility audit before launch
- Screen reader testing on NVDA and VoiceOver
- Color contrast verified for all text and interactive elements
- All forms have associated labels and error messages
- Focus management for modals, dropdowns, and dynamic content

---

## 6. Data Model

> **Design Note:** The data model uses a relational schema in PostgreSQL. The Resort → Building → RoomType → Room (unit) hierarchy supports the multi-campus structure. Bookings reference RoomTypes (not individual units) at creation time; unit assignment happens at check-in. Amenities are stored as structured JSON on RoomType to avoid a complex many-to-many for what is essentially static descriptive data. All entities use UUIDs as primary keys and include `createdAt` / `updatedAt` timestamps.

### Entity-Relationship Summary

| Entity                   | Key Attributes                                                                                                                                                                                                                                                                                             | Relationships                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **User**                 | `id`, `email`, `passwordHash`, `fullName`, `phone`, `role` (guest/content_manager/resort_admin/super_admin), `isEmailVerified`, `isLocked`, `createdAt`                                                                                                                                                    | Has many Bookings; Has many ContactSubmissions                                                  |
| **Resort**               | `id`, `name` (e.g., "GAR Elysian"), `slug`, `description`, `heroImageId`, `features` (JSON)                                                                                                                                                                                                                | Has many Buildings                                                                              |
| **Building**             | `id`, `resortId` (FK), `name` (e.g., "The Fountain Haven"), `description`                                                                                                                                                                                                                                  | Belongs to Resort; Has many RoomTypes                                                           |
| **RoomType**             | `id`, `buildingId` (FK), `name`, `tier` (enum), `description`, `basePrice` (integer, NGN), `maxGuests`, `totalUnits`, `status` (available/under_construction), `amenities` (JSON array), `images` (JSON array of mediaAssetIds)                                                                            | Belongs to Building; Has many Rooms (units); Has many BookingLineItems; Has many SeasonalPrices |
| **Room**                 | `id`, `roomTypeId` (FK), `unitNumber`, `floor`, `status` (available/occupied/maintenance)                                                                                                                                                                                                                  | Belongs to RoomType                                                                             |
| **SeasonalPrice**        | `id`, `roomTypeId` (FK), `startDate`, `endDate`, `price` (integer, NGN), `label` (e.g., "Christmas Peak")                                                                                                                                                                                                  | Belongs to RoomType                                                                             |
| **Booking**              | `id`, `reference` (unique, e.g., "GAR-A1B2C3D4"), `userId` (FK, nullable for guest bookings), `guestName`, `guestEmail`, `guestPhone`, `checkInDate`, `checkOutDate`, `nights`, `adults`, `children`, `specialRequests`, `subtotal`, `tax`, `total`, `status` (enum), `dealId` (FK, nullable), `createdAt` | Belongs to User (optional); Has many BookingLineItems; Has one Payment; May reference Deal      |
| **BookingLineItem**      | `id`, `bookingId` (FK), `roomTypeId` (FK), `quantity`, `unitPrice`, `lineTotal`                                                                                                                                                                                                                            | Belongs to Booking; References RoomType                                                         |
| **Payment**              | `id`, `bookingId` (FK), `gateway` (e.g., "paystack"), `gatewayReference`, `amount`, `currency` ("NGN"), `status` (pending/success/failed/refunded), `paidAt`, `metadata` (JSON)                                                                                                                            | Belongs to Booking                                                                              |
| **Restaurant**           | `id`, `name`, `slug`, `description`, `cuisineType`, `operatingHours` (JSON), `images` (JSON array)                                                                                                                                                                                                         | Has many MenuItems                                                                              |
| **MenuItem**             | `id`, `restaurantId` (FK), `name`, `description`, `price` (integer, NGN), `category` (starter/main/dessert/beverage), `isAvailable`, `sortOrder`                                                                                                                                                           | Belongs to Restaurant                                                                           |
| **Facility**             | `id`, `name`, `slug`, `description`, `operatingHours` (JSON), `images` (JSON array), `isFeatured`, `sortOrder`                                                                                                                                                                                             | —                                                                                               |
| **Gem**                  | `id`, `name`, `slug`, `description`, `category` (nature/culture/adventure/spiritual), `distance`, `duration`, `images` (JSON array), `isFeatured`                                                                                                                                                          | —                                                                                               |
| **EventCategory**        | `id`, `name` (weddings/shoots/celebrations/team_bonding), `description`, `venueOptions` (JSON), `capacity`, `samplePackages` (JSON), `images` (JSON array)                                                                                                                                                 | Has many EventInquiries                                                                         |
| **EventInquiry**         | `id`, `eventCategoryId` (FK), `contactName`, `contactEmail`, `contactPhone`, `preferredDate`, `estimatedGuests`, `budgetRange`, `specialRequirements`, `status` (new/in_review/responded/closed), `assignedTo` (FK, nullable), `createdAt`                                                                 | Belongs to EventCategory                                                                        |
| **Deal**                 | `id`, `title`, `slug`, `description`, `discountType` (percentage/fixed), `discountValue`, `promoCode` (unique, nullable), `startDate`, `endDate`, `isActive`, `category` (room/dining/package/seasonal), `applicableRoomTypeIds` (JSON array), `images` (JSON array), `terms`                              | Referenced by Bookings                                                                          |
| **ContactSubmission**    | `id`, `userId` (FK, nullable), `name`, `email`, `phone`, `subject`, `message`, `status` (new/read/responded/closed), `createdAt`                                                                                                                                                                           | Belongs to User (optional)                                                                      |
| **NewsletterSubscriber** | `id`, `email` (unique), `isConfirmed`, `confirmedAt`, `unsubscribedAt`, `createdAt`                                                                                                                                                                                                                        | —                                                                                               |
| **NotifyMeRegistration** | `id`, `roomTypeId` (FK), `email`, `isNotified`, `createdAt`                                                                                                                                                                                                                                                | References RoomType                                                                             |
| **MediaAsset**           | `id`, `fileName`, `mimeType`, `sizeBytes`, `url`, `cdnUrl`, `altText`, `category` (gallery/room/facility/restaurant/event/deal), `uploadedBy` (FK), `createdAt`                                                                                                                                            | Uploaded by User                                                                                |
| **AuditLog**             | `id`, `userId` (FK), `action`, `entity`, `entityId`, `previousData` (JSON), `newData` (JSON), `ipAddress`, `createdAt`                                                                                                                                                                                     | Belongs to User                                                                                 |

---

## 7. API Endpoint Summary

> **Design Note:** All endpoints are prefixed with `/api/v1/`. Public endpoints are accessible without authentication. Guest-authenticated endpoints require a valid JWT from a registered guest. Admin endpoints require JWT + appropriate role. All responses use standard envelope: `{ "success": boolean, "data": {...}, "error": { "code": string, "message": string } }`. Pagination uses `?page=1&limit=20` with response headers `X-Total-Count` and `X-Total-Pages`.

| Method                     | Route                                 | Description                  | Auth | Role                      |
| -------------------------- | ------------------------------------- | ---------------------------- | ---- | ------------------------- |
| **Authentication**         |                                       |                              |      |                           |
| POST                       | `/api/v1/auth/register`               | Register guest               | No   | Public                    |
| POST                       | `/api/v1/auth/login`                  | Login                        | No   | Public                    |
| POST                       | `/api/v1/auth/refresh`                | Refresh JWT                  | No   | Public                    |
| POST                       | `/api/v1/auth/logout`                 | Logout                       | Yes  | Any                       |
| POST                       | `/api/v1/auth/forgot-password`        | Request password reset       | No   | Public                    |
| POST                       | `/api/v1/auth/reset-password`         | Reset password               | No   | Public                    |
| GET                        | `/api/v1/auth/me`                     | Get current user             | Yes  | Any                       |
| PUT                        | `/api/v1/auth/me`                     | Update profile               | Yes  | Any                       |
| **Rooms**                  |                                       |                              |      |                           |
| GET                        | `/api/v1/rooms`                       | List room types (filterable) | No   | Public                    |
| GET                        | `/api/v1/rooms/{id}`                  | Room type detail             | No   | Public                    |
| POST                       | `/api/v1/rooms`                       | Create room type             | Yes  | Resort Admin+             |
| PUT                        | `/api/v1/rooms/{id}`                  | Update room type             | Yes  | Resort Admin+             |
| DELETE                     | `/api/v1/rooms/{id}`                  | Soft-delete room type        | Yes  | Super Admin               |
| GET                        | `/api/v1/rooms/{id}/units`            | List individual units        | Yes  | Resort Admin+             |
| PUT                        | `/api/v1/rooms/{id}/units/{uid}`      | Update unit status           | Yes  | Resort Admin+             |
| GET                        | `/api/v1/buildings`                   | List buildings               | No   | Public                    |
| POST                       | `/api/v1/buildings`                   | Create building              | Yes  | Resort Admin+             |
| PUT                        | `/api/v1/buildings/{id}`              | Update building              | Yes  | Resort Admin+             |
| **Availability & Booking** |                                       |                              |      |                           |
| GET                        | `/api/v1/availability`                | Check availability           | No   | Public                    |
| POST                       | `/api/v1/bookings`                    | Create booking               | Yes  | Guest+                    |
| GET                        | `/api/v1/bookings`                    | List bookings                | Yes  | Guest (own) / Admin (all) |
| GET                        | `/api/v1/bookings/{ref}`              | Get booking detail           | Yes  | Guest (own) / Admin       |
| PUT                        | `/api/v1/bookings/{ref}/cancel`       | Cancel booking               | Yes  | Guest (own) / Admin       |
| PUT                        | `/api/v1/bookings/{ref}/status`       | Update booking status        | Yes  | Resort Admin+             |
| POST                       | `/api/v1/bookings/{ref}/confirmation` | Resend confirmation          | Yes  | Guest (own) / Admin       |
| **Payments**               |                                       |                              |      |                           |
| POST                       | `/api/v1/payments/initiate`           | Initiate payment             | Yes  | Guest+                    |
| POST                       | `/api/v1/payments/verify`             | Verify payment (webhook)     | No   | Paystack webhook          |
| GET                        | `/api/v1/payments/{id}`               | Get payment status           | Yes  | Guest (own) / Admin       |
| **Restaurants & Menus**    |                                       |                              |      |                           |
| GET                        | `/api/v1/restaurants`                 | List restaurants             | No   | Public                    |
| GET                        | `/api/v1/restaurants/{id}`            | Restaurant detail            | No   | Public                    |
| POST                       | `/api/v1/restaurants`                 | Create restaurant            | Yes  | Content Mgr+              |
| PUT                        | `/api/v1/restaurants/{id}`            | Update restaurant            | Yes  | Content Mgr+              |
| GET                        | `/api/v1/restaurants/{id}/menu`       | Get menu                     | No   | Public                    |
| PUT                        | `/api/v1/restaurants/{id}/menu`       | Update menu                  | Yes  | Content Mgr+              |
| **Facilities**             |                                       |                              |      |                           |
| GET                        | `/api/v1/facilities`                  | List facilities              | No   | Public                    |
| GET                        | `/api/v1/facilities/{id}`             | Facility detail              | No   | Public                    |
| POST                       | `/api/v1/facilities`                  | Create facility              | Yes  | Content Mgr+              |
| PUT                        | `/api/v1/facilities/{id}`             | Update facility              | Yes  | Content Mgr+              |
| DELETE                     | `/api/v1/facilities/{id}`             | Delete facility              | Yes  | Resort Admin+             |
| **Off-Beat Gems**          |                                       |                              |      |                           |
| GET                        | `/api/v1/gems`                        | List gems (filterable)       | No   | Public                    |
| POST                       | `/api/v1/gems`                        | Create gem                   | Yes  | Content Mgr+              |
| PUT                        | `/api/v1/gems/{id}`                   | Update gem                   | Yes  | Content Mgr+              |
| DELETE                     | `/api/v1/gems/{id}`                   | Delete gem                   | Yes  | Content Mgr+              |
| **Events**                 |                                       |                              |      |                           |
| GET                        | `/api/v1/events`                      | List event categories        | No   | Public                    |
| POST                       | `/api/v1/events/inquiries`            | Submit event inquiry         | No   | Public                    |
| GET                        | `/api/v1/events/inquiries`            | List inquiries               | Yes  | Resort Admin+             |
| PUT                        | `/api/v1/events/inquiries/{id}`       | Update inquiry               | Yes  | Resort Admin+             |
| **Deals & Offers**         |                                       |                              |      |                           |
| GET                        | `/api/v1/deals`                       | List active deals            | No   | Public                    |
| GET                        | `/api/v1/deals/{id}`                  | Deal detail                  | No   | Public                    |
| POST                       | `/api/v1/deals`                       | Create deal                  | Yes  | Content Mgr+              |
| PUT                        | `/api/v1/deals/{id}`                  | Update deal                  | Yes  | Content Mgr+              |
| DELETE                     | `/api/v1/deals/{id}`                  | Delete deal                  | Yes  | Resort Admin+             |
| GET                        | `/api/v1/deals/validate/{code}`       | Validate promo code          | No   | Public                    |
| **Contact & Newsletter**   |                                       |                              |      |                           |
| POST                       | `/api/v1/contact`                     | Submit contact form          | No   | Public                    |
| GET                        | `/api/v1/contact`                     | List submissions             | Yes  | Resort Admin+             |
| PUT                        | `/api/v1/contact/{id}`                | Update submission            | Yes  | Resort Admin+             |
| POST                       | `/api/v1/newsletter/subscribe`        | Subscribe                    | No   | Public                    |
| POST                       | `/api/v1/newsletter/unsubscribe`      | Unsubscribe                  | No   | Public                    |
| POST                       | `/api/v1/notify-me`                   | Register interest            | No   | Public                    |
| **Content (CMS)**          |                                       |                              |      |                           |
| GET                        | `/api/v1/content/{page}`              | Get page content             | No   | Public                    |
| PUT                        | `/api/v1/content/{page}`              | Update page content          | Yes  | Content Mgr+              |
| **Media**                  |                                       |                              |      |                           |
| POST                       | `/api/v1/media`                       | Upload media                 | Yes  | Content Mgr+              |
| GET                        | `/api/v1/media`                       | List media                   | Yes  | Content Mgr+              |
| DELETE                     | `/api/v1/media/{id}`                  | Delete media                 | Yes  | Content Mgr+              |
| **Amenities**              |                                       |                              |      |                           |
| GET                        | `/api/v1/amenities`                   | List all amenities           | No   | Public                    |
| **Analytics (Admin)**      |                                       |                              |      |                           |
| GET                        | `/api/v1/analytics/bookings`          | Booking statistics           | Yes  | Resort Admin+             |
| GET                        | `/api/v1/analytics/revenue`           | Revenue reports              | Yes  | Resort Admin+             |
| GET                        | `/api/v1/analytics/occupancy`         | Occupancy rates              | Yes  | Resort Admin+             |

---

## 8. Third-Party Integrations

> **Design Note:** All third-party integrations are abstracted behind service interfaces so that providers can be swapped without impacting business logic. API keys and secrets are stored in environment variables, never in code or client-side bundles.

### 8.1 Payment Gateway — Paystack

| Attribute          | Detail                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**        | Process online payments for bookings (NGN)                                                                                                          |
| **API/SDK**        | Paystack Inline JS (frontend), Paystack REST API (backend webhook verification)                                                                     |
| **Data Exchanged** | Amount, currency, email, booking reference → Transaction reference, status, payment method                                                          |
| **Fallback**       | Display "Online payment temporarily unavailable. Please contact us on WhatsApp to complete your booking." Pending booking is preserved for 2 hours. |

### 8.2 WhatsApp Business

| Attribute          | Detail                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------- |
| **Purpose**        | Primary guest communication channel; booking assistance; automated confirmations (optional) |
| **API/SDK**        | Click-to-chat URL (`wa.me`) for basic; WhatsApp Business Cloud API for automated messages   |
| **Data Exchanged** | Pre-filled message text (page context, room name) → Guest conversation                      |
| **Fallback**       | Click-to-chat URL always works; if Cloud API is down, fallback to email-only notifications  |

### 8.3 Google Maps Platform

| Attribute          | Detail                                                              |
| ------------------ | ------------------------------------------------------------------- |
| **Purpose**        | Embed interactive resort location map on Home and Contact pages     |
| **API/SDK**        | Maps Embed API (iframe) or Maps JavaScript API (for custom styling) |
| **Data Exchanged** | Resort coordinates, map style configuration                         |
| **Fallback**       | Static map image with "Open in Google Maps" link                    |

### 8.4 Email Service — SendGrid

| Attribute          | Detail                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| **Purpose**        | Transactional emails: booking confirmations, password resets, contact form forwards, newsletter |
| **API/SDK**        | SendGrid Web API v3                                                                             |
| **Data Exchanged** | Recipient email, subject, HTML template with merge variables                                    |
| **Fallback**       | Queue emails in database; retry via background job; alert admin if persistent failure           |

### 8.5 SMS Gateway (e.g., Termii)

| Attribute          | Detail                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| **Purpose**        | SMS notifications for booking confirmations (Nigerian phone numbers)             |
| **API/SDK**        | Termii REST API                                                                  |
| **Data Exchanged** | Phone number, message text                                                       |
| **Fallback**       | SMS is supplementary — if unavailable, email confirmation is the primary channel |

### 8.6 CDN — Cloudflare or AWS CloudFront

| Attribute          | Detail                                                                           |
| ------------------ | -------------------------------------------------------------------------------- |
| **Purpose**        | Serve static assets, media files, and optimized images globally with low latency |
| **API/SDK**        | CDN configuration via hosting platform; S3-compatible storage for origin         |
| **Data Exchanged** | Media files (images, videos)                                                     |
| **Fallback**       | Serve directly from origin server (degraded performance)                         |

### 8.7 Analytics — Google Analytics 4

| Attribute          | Detail                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------- |
| **Purpose**        | Track page views, user behavior, conversion events (bookings, contact form submissions) |
| **API/SDK**        | Google Tag Manager + GA4 measurement protocol                                           |
| **Data Exchanged** | Page views, events, user properties (anonymized)                                        |
| **Fallback**       | Site functions normally without analytics; data gap is non-critical                     |

---

## 9. Appendices

### 9.1 Glossary

| Term                  | Definition                                                                 |
| --------------------- | -------------------------------------------------------------------------- |
| **Ante Room**         | An entrance or waiting room preceding the main room                        |
| **Cabana**            | A premium building at GAR Elysian with private pool access                 |
| **Check-in Date**     | The date the guest arrives and occupies the room                           |
| **Check-out Date**    | The date the guest departs; calculated as check-in date + number of nights |
| **DStv**              | Digital Satellite Television — a Sub-Saharan African cable TV service      |
| **Executive Huts**    | Hut-style accommodation at GAR Village                                     |
| **Fountain Haven**    | A building at GAR Elysian housing Standard and Deluxe rooms                |
| **GAR**               | Grace Arena Resorts                                                        |
| **Kitchenette**       | A small kitchen area with basic cooking facilities                         |
| **Love Garden**       | A landscaped garden relaxation area within the resort                      |
| **Oasis Villa**       | A building at GAR Elysian housing Deluxe and Premium suites                |
| **Off-Beat Gems**     | GAR's branded term for curated local attractions and activities            |
| **Prayer Hut**        | A dedicated private prayer space — a key Christian-resort amenity          |
| **Presidential Huts** | Under-construction hut-style premium accommodation at GAR Village          |
| **Royal Huts**        | Under-construction hut-style top-tier accommodation at GAR Village         |
| **Suya**              | Nigerian grilled meat delicacy, typically spiced and skewered              |
| **Vanity Kit**        | Bath amenities package (soap, body cream, shampoo, etc.)                   |
| **Village Cuisine**   | Restaurant/dining area within the GAR Village campus                       |
| **Village Mall**      | Commercial/amenity area within the GAR Village campus                      |

### 9.2 Wireframe Reference

| Page                 | Key Layout Description                                                                                  | Reference Section |
| -------------------- | ------------------------------------------------------------------------------------------------------- | ----------------- |
| Home                 | Full-viewport hero video → resort category cards → amenities grid → facilities carousel → gallery → map | Section 3.1       |
| Rooms & Suites       | Resort toggle → hero + description → room cards grid with tier badges and CTAs                          | Section 3.2       |
| Booking              | Date/guest selectors → room selection cards → summary sidebar → guest form → payment → confirmation     | Section 3.3       |
| About GAR            | Hero → story section → mission/vision → timeline → leadership → CTA                                     | Section 3.4       |
| Facilities           | Section-based: facility name → description → image gallery → hours (repeating)                          | Section 3.5       |
| Restaurants & More   | Per-restaurant: header → gallery → hours → categorized menu with prices → CTAs                          | Section 3.6       |
| Off-Beat Gems        | Category filter tabs → card grid (image, title, description, distance)                                  | Section 3.7       |
| Events & Experiences | Category tabs → detail + gallery → inquiry form → past events testimonials                              | Section 3.8       |
| Deals & Offers       | Filter tabs → deal cards (image, title, dates, discount, CTA) → newsletter signup                       | Section 3.9       |
| Contact Us           | Contact form → map → contact info cards → social icons → WhatsApp button                                | Section 3.10      |

_Detailed wireframes to be produced in design phase based on these specifications._

### 9.3 Revision History

| Version | Date           | Author            | Changes           |
| ------- | -------------- | ----------------- | ----------------- |
| 1.0     | March 29, 2026 | Architecture Team | Initial SRS draft |
|         |                |                   |                   |
|         |                |                   |                   |

---

_End of Document_
