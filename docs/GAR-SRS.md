# Software Requirements Specification — Grace Arena Resorts (GAR) Website

**Version:** 1.2
**Date:** March 29, 2026
**Status:** Draft (Revised)
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

- **Public-Facing Guest Site** — a responsive, SEO-optimized website with 14 primary pages (10 content pages + authentication pages + guest account page + privacy policy) enabling guests to explore the resort, browse rooms, make bookings, and contact staff
- **Admin / CMS Panel** — a secured dashboard for resort staff to manage rooms, bookings, content, restaurants, deals, and event inquiries (specified in Section 3.14)
- **Booking Engine** — a multi-room reservation system with calendar availability, price calculation, and payment processing
- **API Layer** — a RESTful backend serving data to the frontend and integrating with third-party services (payment, WhatsApp, maps, email, SMS)

Out of scope for v1.0: native mobile applications, loyalty/rewards program, multi-language support (architecture will support future localization).

### 1.3 Definitions & Acronyms

| Term              | Definition                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **GAR**           | Grace Arena Resorts — the resort brand                                                             |
| **GAR Elysian**   | The premium/luxury tier resort campus (buildings: Fountain Haven, Oasis Villa, The Cabana)         |
| **GAR Village**   | The rustic/hut-style resort campus (buildings: Executive Huts, Presidential Huts, Royal Huts)      |
| **SRS**           | Software Requirements Specification                                                                |
| **CMS**           | Content Management System                                                                          |
| **API**           | Application Programming Interface                                                                  |
| **NGN**           | Nigerian Naira (₦)                                                                                 |
| **Off-Beat Gems** | GAR's branded term for curated local attractions and things to do                                  |
| **Prayer Hut**    | A distinguishing Christian-resort amenity — a dedicated private prayer space available to guests   |
| **Room Tier**     | Classification hierarchy: Standard → Deluxe → Premium → Executive → Presidential → Royal           |
| **OG Tags**       | Open Graph meta tags for social media previews                                                     |
| **LCP**           | Largest Contentful Paint (Core Web Vital)                                                          |
| **WCAG**          | Web Content Accessibility Guidelines                                                               |
| **NDPR/NDPA**     | Nigeria Data Protection Regulation / Nigeria Data Protection Act (2023) — primary data privacy law |
| **CAPTCHA**       | Completely Automated Public Turing test to tell Computers and Humans Apart                         |

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
- **Hosting:** Vercel (Next.js frontend + API routes as serverless functions)
- **Database:** Supabase (managed PostgreSQL with built-in Auth, Storage, and Realtime)
- **Runtime:** Node.js 20 LTS or later (Vercel serverless runtime)

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

### 2.7 Technology Stack

> **Design Note:** This stack is selected to minimize operational complexity for a small team with limited backend experience, while still satisfying all SRS requirements. Every component uses TypeScript end-to-end. Supabase is chosen over a custom backend because it provides managed PostgreSQL, authentication, storage, and auto-generated APIs — removing the need to build, host, and maintain these services independently.

#### 2.7.1 Frontend

| Concern               | Technology                              | Version / Detail                                                                                            |
| --------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Framework**         | Next.js (Pages Router)                  | v16.x — SSR/SSG for SEO pages, CSR for interactive flows (booking wizard). Deployed on Vercel.              |
| **UI Library**        | Chakra UI                               | v3.x — component library for accessible, responsive UI. Reduces custom CSS and enforces design consistency. |
| **Language**          | TypeScript                              | Strict mode. Shared types between frontend and API routes.                                                  |
| **State Management**  | React Context + `useState`/`useReducer` | No external state library needed for v1.0. Booking wizard state managed via React context.                  |
| **Forms**             | React Hook Form + Zod                   | Schema-based validation shared between client and server.                                                   |
| **Date Handling**     | dayjs                                   | Lightweight date manipulation and formatting (`Intl.DateTimeFormat` for display).                           |
| **Icons**             | react-icons                             | Already installed. Provides icon sets for UI elements.                                                      |
| **Charts (Admin)**    | Recharts                                | Lightweight charting for admin dashboard (booking trends, revenue, occupancy heatmap).                      |
| **Rich Text (Admin)** | Tiptap or React-Quill                   | CMS content editing for About, Privacy Policy, and other managed pages.                                     |

#### 2.7.2 Backend & Database

| Concern                 | Technology                                   | Detail                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database**            | Supabase (managed PostgreSQL)                | Hosted PostgreSQL instance. Web dashboard for table management, SQL editor, and data inspection. Free tier sufficient for development; Pro tier for production.                                               |
| **API Layer**           | Next.js API Routes (`/pages/api/`)           | All backend logic lives in `src/pages/api/v1/`. No separate server process. API routes run as serverless functions on Vercel. Each route file maps to one REST endpoint.                                      |
| **Database Client**     | Supabase JS Client (`@supabase/supabase-js`) | Typed query builder for PostgreSQL. Used in API routes for all database operations. Supports filtering, joins, pagination, and RPC (stored procedures) for complex queries like availability calculations.    |
| **Authentication**      | Supabase Auth                                | Handles registration, login, email verification, password reset, JWT issuance, and refresh tokens. Row-Level Security (RLS) policies enforce the authorization matrix (Section 4.1). Custom claims for roles. |
| **File Storage**        | Supabase Storage                             | S3-compatible object storage for media assets (images, videos, PDFs). Bucket policies control access. Serves files via built-in CDN. Maps to the `MediaAsset` entity.                                         |
| **Background Jobs**     | Supabase Edge Functions + pg_cron            | Cron-based tasks: expire stale pending bookings (every 5 min), retry failed email sends. `pg_cron` runs inside PostgreSQL; Edge Functions handle webhook processing and async tasks.                          |
| **Realtime (optional)** | Supabase Realtime                            | WebSocket subscriptions for admin dashboard live updates (new bookings, status changes). Optional for v1.0.                                                                                                   |
| **Schema Validation**   | Zod                                          | Runtime validation on all API route inputs. Schemas shared with React Hook Form on the frontend for consistent validation rules.                                                                              |
| **PDF Generation**      | @react-pdf/renderer or jsPDF                 | Server-side PDF generation for booking confirmations. Called from `GET /api/v1/bookings/{ref}/pdf`.                                                                                                           |

#### 2.7.3 Third-Party Services

| Concern                 | Provider                   | Integration Method                                                                                         |
| ----------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Payments**            | Paystack                   | Paystack Inline JS (frontend popup) + REST API (backend webhook verification). NGN only.                   |
| **Transactional Email** | SendGrid                   | SendGrid Web API v3 from API routes. Supabase Auth handles verification/reset emails automatically.        |
| **WhatsApp**            | WhatsApp Business          | `wa.me` click-to-chat URLs (v1.0). WhatsApp Cloud API for automated messages (future).                     |
| **Maps**                | Google Maps                | Maps Embed API (iframe) on Home and Contact pages. Coordinates stored in SystemSetting entity.             |
| **Analytics**           | Google Analytics 4         | GA4 via Google Tag Manager. Loaded conditionally based on cookie consent.                                  |
| **CAPTCHA**             | Google reCAPTCHA           | reCAPTCHA v3 (invisible) on all public forms (contact, event inquiry, newsletter, login after 3 failures). |
| **CDN**                 | Vercel Edge + Supabase CDN | Static assets via Vercel; media files via Supabase Storage CDN.                                            |

#### 2.7.4 Development & DevOps

| Concern                 | Technology                         | Detail                                                                                              |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Language**            | TypeScript (strict mode)           | Single language across frontend, API routes, and database types.                                    |
| **Package Manager**     | npm                                | Lockfile committed. No Yarn/pnpm migration needed.                                                  |
| **Linting**             | ESLint + eslint-config-next        | Already configured. Enforces code quality and Next.js best practices.                               |
| **Formatting**          | Prettier                           | Consistent code formatting across the codebase.                                                     |
| **Version Control**     | Git + GitHub                       | Branch protection on `main`. PR-based workflow.                                                     |
| **CI/CD**               | Vercel (auto-deploy)               | Push to `main` → build → deploy (production). Push to feature branches → preview deployments.       |
| **Environment Vars**    | Vercel Environment Variables       | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `SENDGRID_API_KEY`. |
| **Database Migrations** | Supabase CLI + SQL migration files | Migrations in `supabase/migrations/`. Applied via `supabase db push` or CI pipeline.                |
| **Local Development**   | Supabase CLI (local)               | `supabase start` runs local PostgreSQL, Auth, and Storage. Mirrors production environment.          |
| **Testing**             | Vitest + React Testing Library     | Unit tests for business logic, component tests for UI. Coverage target ≥ 70% for API routes.        |
| **Error Monitoring**    | Sentry                             | Error tracking and performance monitoring in production.                                            |
| **API Documentation**   | Swagger / OpenAPI                  | Auto-generated from Zod schemas. Served at `/api/docs` in development.                              |

---

## 3. Pages & Client-Side Functional Requirements

> **Design Note:** The frontend is built with Next.js (App Router or Pages Router, based on team preference) to leverage SSR/SSG for SEO-critical pages (Home, Rooms, About) and client-side rendering for interactive flows (Booking). Each page must be independently deployable as a static page where possible, falling back to SSR for dynamic data (availability, prices). All pages share a common layout: sticky navbar, footer, WhatsApp floating action button (bottom-right), and cookie consent banner.

**Global UI Elements (all pages):**

- Sticky top navbar with logo, navigation links, "Book Now" CTA button, and mobile hamburger menu
- Footer with resort address, quick links, social media icons, newsletter signup, and copyright
- Floating WhatsApp button (bottom-right corner, always visible)
- Cookie consent banner on first visit (see details below)
- Page transition loading indicator

**Cookie Consent Banner:**

The cookie consent banner appears on a user's first visit and must comply with NDPR (Nigeria Data Protection Regulation) and follow GDPR best practices for any EU visitors.

- **Banner Position:** Fixed bottom bar overlaying page content, dismissible only by explicit action
- **Cookie Categories:**
  - **Essential** (always on, non-toggleable): session management, authentication, security tokens
  - **Analytics** (opt-in): Google Analytics 4 tracking scripts
  - **Marketing** (opt-in): any future remarketing or advertising pixels
- **User Actions:** "Accept All", "Reject Non-Essential", and "Manage Preferences" (opens a modal with toggles per category)
- **Consent Storage:** Stored in a first-party cookie (`gar_cookie_consent`) with a 12-month expiry. Cookie value records the consent state per category and the consent timestamp.
- **Enforcement:** If analytics cookies are declined, GA4 scripts must not be loaded. If consent is not yet given, only essential cookies may be set.
- **Footer Link:** A "Cookie Settings" link in the footer allows users to modify their consent at any time.

**Global Error, Empty, and Loading States:**

All pages must handle the following states consistently:

- **Loading State:** Skeleton loaders (content-shaped placeholder blocks with shimmer animation) displayed while data is being fetched. No blank pages or raw spinners without context.
- **Error State (API failure):** A contextual inline error message with a "Try Again" button. Example: "Unable to load rooms. Please try again." For full-page failures, display a centered error card with an illustration, error message, "Try Again" button, and "Contact Us on WhatsApp" fallback link. Do **not** display raw error codes or stack traces.
- **Empty State:** When a data set returns zero results (e.g., no active deals, no gems in a category, no search results), display a friendly placeholder message with an optional CTA. Examples:
  - Deals page with no active deals: "No deals available right now. Check back soon or subscribe to our newsletter for updates."
  - Gems page with empty category filter: "No activities found in this category. Try browsing all Off-Beat Gems."
  - Booking page with no available rooms for selected dates: "No rooms available for your selected dates. Try different dates or contact us on WhatsApp for assistance."
- **Network Offline:** If the browser detects no network connectivity, display a top banner: "You appear to be offline. Some features may be unavailable."

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

5. **Photo Gallery** — Masonry or grid layout of resort photos. Clicking any photo opens a lightbox overlay with navigation arrows. Images are lazy-loaded with placeholder blur. Lightbox must support keyboard navigation (left/right arrow keys to navigate, Escape to close), trap focus within the overlay while open, and announce image alt text to screen readers.

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

- Hero section uses a static poster image on mobile devices (viewport width < 768px) for performance on Nigerian 3G/4G networks. On desktop, the video loads lazily after the poster image renders as the LCP element. Users with `prefers-reduced-motion: reduce` always see the static image regardless of device.
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
| Executive Huts    | Executive Suite    | Executive    | 10    | ₦100,000    | 2          | Available          |
| Presidential Huts | Presidential Suite | Presidential | 10    | TBD         | TBD        | Under Construction |
| Royal Huts        | Royal Suite        | Royal        | 10    | TBD         | TBD        | Under Construction |

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
- Up to 2 Guests

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
**Query Parameters:**

- `?room={roomTypeId}` (optional pre-selection — pre-selects this room type in Step 2)
- `?deal={dealId}` (optional deal pre-selection — auto-applies the deal discount, filters rooms to applicable room types, and displays a deal banner at the top of the page)

**Flow Structure:** The booking page is a multi-step wizard with a visible step indicator (stepper UI). Users can navigate back to previous steps to modify selections. The steps are:

- **Step 1: Dates & Guests** — Date selection and guest count
- **Step 2: Select Rooms** — Room browsing, filtering, and adding rooms to booking
- **Step 3: Guest Information** — Contact details and special requests
- **Step 4: Review & Payment** — Summary review and payment

**Layout & UI Components:**

1. **Step Indicator** — Horizontal stepper bar at the top showing all 4 steps with current step highlighted. Completed steps are clickable to navigate back. On mobile, shows current step label and step number (e.g., "Step 2 of 4: Select Rooms").

2. **Step 1 — Date Selector** — Check-in date picker (blocks past dates) + number of nights dropdown/stepper (1–30). Check-out date is auto-calculated and displayed. Fully-booked dates are **not** blocked at this stage (room-level availability is checked in Step 2 after date selection).

3. **Step 1 — Guest Selector** — Number of adults (1–10), number of children (0–10) via stepper inputs.

4. **Step 2 — Room Selection Area:**
   - Filter controls: resort type (Elysian/Village), room tier
   - Available rooms displayed as selectable cards with name, price (per-night, reflecting seasonal pricing for the selected dates), thumbnail, key amenities
   - Rooms with zero availability for the selected dates are shown greyed out with "Unavailable" label
   - "Add Room" button on each available card — supports adding multiple rooms to a single booking
   - Under-construction rooms are not displayed in this selector
   - Selected rooms appear in the booking summary sidebar

5. **Booking Summary Sidebar** (sticky on desktop, collapsible bottom sheet on mobile):
   - Itemized list of selected rooms with per-room price (per night × number of nights)
   - Dates and duration
   - Guest count
   - Subtotal
   - Deal discount (if applicable, showing deal name and discount amount)
   - Taxes and fees (itemized: VAT at configured rate)
   - **Total (NGN)**
   - "Remove" action per room line item

6. **Step 3 — Guest Information Form:**
   - Full name (required)
   - Email address (required, validated)
   - Phone number (required, Nigerian format validated: +234XXXXXXXXXX)
   - Special requests (optional, textarea, max 500 characters)

7. **Step 4 — Review & Payment Section:**
   - Full booking summary (read-only review of all details from previous steps)
   - "Edit" links next to each section to navigate back to the relevant step
   - Payment gateway integration (Paystack inline checkout)
   - Displays total amount before initiating payment
   - Handles success, failure, and timeout states with clear user-facing messages:
     - **Success:** Transitions to Confirmation Screen
     - **Failure:** "Payment could not be processed. Please try again or contact us on WhatsApp."
     - **Timeout:** "Payment session timed out. Your booking has been saved — please try again within 30 minutes."

8. **Confirmation Screen** (post-payment, replaces the wizard):
   - Booking reference number (prominently displayed, large font)
   - Full booking summary (rooms, dates, guests, total paid)
   - "Download Confirmation" (PDF) and "Email Confirmation" buttons
   - "Contact Us on WhatsApp" CTA
   - "View My Bookings" link (to `/account/bookings`)
   - "Return to Home" link

9. **WhatsApp CTA** — Persistent banner or button: "Need help booking? Chat with us on WhatsApp"

**PDF Confirmation Specification:**

The downloadable PDF is generated server-side via a dedicated endpoint (`GET /api/v1/bookings/{ref}/pdf`). The PDF contains:

- Resort logo and name
- Booking reference number
- Guest name, email, phone
- Check-in date, check-out date, number of nights
- Itemized list of rooms booked with per-room pricing
- Subtotal, taxes, deals discount (if any), total paid
- Resort address and contact information
- Check-in time and check-out time
- Cancellation policy summary

**Business Logic:**

- Prevent booking dates in the past
- Validate guest count does not exceed combined max guests of selected rooms
- Real-time availability check before payment initiation (re-validated server-side at booking creation)
- Price is calculated on a **per-night basis**: for each room, each night uses the applicable rate (base price or seasonal override for that specific date). The formula is: `SUM(per_night_rate × quantity for each night across all rooms)` + tax rate − deal discount (if applicable)
- Deal discounts are applied to the **effective nightly rate** (seasonal or base) before summing. Percentage discounts are calculated per-room-per-night; fixed discounts are applied to the booking subtotal after summing all rooms and nights.
- Booking is only confirmed upon successful payment callback

**Data Requirements:**

- Availability calendar: `GET /api/v1/availability/calendar?month={YYYY-MM}&roomTypeId={id}` (returns per-day availability count for a month)
- Availability check: `GET /api/v1/availability?checkIn={date}&nights={n}&resort={type}`
- Validate deal: `GET /api/v1/deals/validate/{code}` or `GET /api/v1/deals/{dealId}`
- Create booking: `POST /api/v1/bookings`
- Initiate payment: `POST /api/v1/payments/initiate`
- Verify payment: `POST /api/v1/payments/verify`
- Download PDF: `GET /api/v1/bookings/{ref}/pdf`

**SEO:**

- Title: "Book Your Stay — Grace Arena Resorts"
- `noindex` meta tag (transactional page, not indexed)

**Responsive Behavior:**

- Wizard step indicator collapses to a compact format on mobile (current step label + "Step X of 4")
- Summary sidebar collapses to a fixed bottom sheet on mobile with a "View Summary" toggle
- Date picker uses native mobile date input on touch devices
- Form fields stack vertically on mobile
- Room selection cards stack to single column on mobile

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
- CTA: "Make a Reservation" (opens WhatsApp with pre-filled message including restaurant name) and "Chat on WhatsApp"

> **Note:** Dining reservations in v1.0 are handled entirely via WhatsApp or the contact form. There is no in-app dining reservation system.

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
   - reCAPTCHA v3 (invisible) challenge
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

4. **Newsletter Signup** — Inline form: "Get exclusive offers in your inbox." Email input + "Subscribe" button. NDPR/GDPR-compliant consent checkbox: "I agree to receive marketing emails from Grace Arena Resorts. You can unsubscribe at any time." reCAPTCHA v3 (invisible) on submission.

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
   - reCAPTCHA v3 (invisible) challenge
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

### 3.11 Authentication Pages

> **Design Note:** Authentication is required before a guest can create a booking (Section 4.1). These pages handle account creation, login, and password recovery. Guest checkout without an account is **not** supported in v1.0 — the `userId` field on the `Booking` entity is nullable to support bookings created by admin on behalf of walk-in guests (admin-initiated bookings via CMS), but all online bookings require a registered account.

#### 3.11.1 Registration Page

**Route:** `/register`

**Layout & UI Components:**

- Page title "Create Your Account"
- Registration form:
  - Full name (required)
  - Email address (required, validated)
  - Phone number (required, Nigerian format: +234XXXXXXXXXX)
  - Password (required, minimum 8 characters, at least one uppercase, one lowercase, one number)
  - Confirm password (required, must match)
  - NDPR consent checkbox: "I agree to the [Privacy Policy](/privacy) and consent to the processing of my personal data." (required)
  - "Create Account" submit button
- "Already have an account? [Log in](/login)" link
- Social proof text: "Join thousands of guests who book directly with Grace Arena Resorts"

**Post-Registration Flow:**

- On successful registration, redirect to an "Email Verification" interstitial page
- Interstitial shows: "We've sent a verification link to {email}. Please check your inbox to verify your account."
- "Resend Verification Email" link (rate-limited: 1 per 60 seconds)
- Email verification link (in the email) redirects to `/login?verified=true` with a success toast message

**Data Requirements:**

- Register: `POST /api/v1/auth/register`
- Resend verification: `POST /api/v1/auth/resend-verification`

**SEO:**

- Title: "Create an Account — Grace Arena Resorts"
- `noindex` meta tag

#### 3.11.2 Login Page

**Route:** `/login`
**Query Parameters:** `?redirect={url}` (optional — redirects to this URL after successful login, e.g., `/booking?room=xyz`)

**Layout & UI Components:**

- Page title "Welcome Back"
- Login form:
  - Email address (required)
  - Password (required)
  - "Remember me" checkbox (extends refresh token to 30 days)
  - "Log In" submit button
- "Forgot your password?" link → `/forgot-password`
- "Don't have an account? [Register](/register)" link
- Error states:
  - Invalid credentials: "Incorrect email or password. Please try again."
  - Account locked: "Your account has been temporarily locked due to too many failed attempts. Please try again in 15 minutes or reset your password."
  - Email not verified: "Please verify your email before logging in. [Resend verification email](/register)"

**Data Requirements:**

- Login: `POST /api/v1/auth/login`

**SEO:**

- Title: "Log In — Grace Arena Resorts"
- `noindex` meta tag

#### 3.11.3 Forgot Password Page

**Route:** `/forgot-password`

**Layout & UI Components:**

- Page title "Reset Your Password"
- Email input (required) + "Send Reset Link" button
- Success message: "If an account exists for {email}, we've sent a password reset link. Please check your inbox."
- "Back to [Log In](/login)" link

**Data Requirements:**

- Forgot password: `POST /api/v1/auth/forgot-password`

#### 3.11.4 Reset Password Page

**Route:** `/reset-password`
**Query Parameters:** `?token={resetToken}` (required)

**Layout & UI Components:**

- Page title "Set a New Password"
- New password field (required, same rules as registration)
- Confirm new password field (required)
- "Reset Password" submit button
- On success, redirect to `/login` with a success toast: "Your password has been reset. Please log in."
- If token is expired or invalid: "This reset link has expired or is invalid. Please [request a new one](/forgot-password)."

**Data Requirements:**

- Reset password: `POST /api/v1/auth/reset-password`

---

### 3.12 Guest Account & Booking Management

**Route:** `/account` (requires authentication — redirects unauthenticated users to `/login?redirect=/account`)

> **Design Note:** This page provides registered guests with self-service access to their profile and booking history. It is the primary interface for post-booking interactions.

**Layout & UI Components:**

1. **Account Navigation** — Sidebar (desktop) or tab bar (mobile) with sections:
   - My Bookings (default view)
   - Profile Settings

2. **My Bookings** (`/account/bookings`):
   - List of bookings sorted by check-in date (most recent first)
   - Each booking card shows: booking reference (e.g., GAR-A1B2C3D4), status badge (color-coded: Confirmed=green, Pending=yellow, Cancelled=red, Checked-In=blue, Checked-Out=grey), check-in/out dates, room names and quantities, total paid
   - Clicking a booking card expands or navigates to a detail view showing full booking information, payment details, and available actions
   - **Actions per booking (by status):**
     - **Pending:** "Complete Payment" (resumes Paystack checkout), "Cancel Booking"
     - **Confirmed:** "Cancel Booking", "Download Confirmation (PDF)", "Resend Confirmation Email", "Contact Us on WhatsApp"
     - **Cancelled:** "Refund Status" (shows refund amount and timeline)
     - **Checked-Out:** "Download Receipt (PDF)"
   - **Cancel Booking Flow:** Clicking "Cancel Booking" opens a confirmation modal showing:
     - Booking reference and rooms
     - Applicable refund amount based on cancellation policy (calculated server-side)
     - Policy text (e.g., "Cancelling more than 72 hours before check-in qualifies for a full refund.")
     - "Confirm Cancellation" and "Keep My Booking" buttons
     - After cancellation, booking status updates to "Cancelled" and refund status is displayed

3. **Profile Settings** (`/account/profile`):
   - Editable fields: full name, phone number
   - Read-only field: email (with note: "Contact support to change your email address")
   - "Change Password" section: current password, new password, confirm new password
   - "Save Changes" button

**Data Requirements:**

- List my bookings: `GET /api/v1/bookings` (authenticated, returns own bookings)
- Get booking detail: `GET /api/v1/bookings/{ref}`
- Cancel booking: `PUT /api/v1/bookings/{ref}/cancel`
- Download PDF: `GET /api/v1/bookings/{ref}/pdf`
- Resend confirmation: `POST /api/v1/bookings/{ref}/confirmation`
- Update profile: `PUT /api/v1/auth/me`

**SEO:**

- Title: "My Account — Grace Arena Resorts"
- `noindex` meta tag

---

### 3.13 Privacy Policy

**Route:** `/privacy`

**Layout & UI Components:**

- Page title "Privacy Policy"
- Effective date displayed prominently
- Structured sections covering:
  - What personal data is collected (name, email, phone, booking history, payment metadata — no card data)
  - How personal data is used (booking fulfillment, communication, analytics)
  - Legal basis for processing (consent, contractual necessity)
  - Third parties data is shared with (Paystack for payments, SendGrid for email, Google Analytics for anonymized analytics)
  - Data retention periods (bookings: 7 years for tax/legal; inactive accounts: 2 years; contact submissions: 1 year)
  - Guest rights under NDPR/NDPA (access, rectification, erasure, objection)
  - How to exercise data rights (contact email for data subject access requests)
  - Cookie policy summary (cross-reference to cookie consent banner categories)
  - Contact information for the Data Protection Officer or responsible staff
- "Last Updated: {date}" at the bottom

**Data Requirements:**

- Privacy policy content: `GET /api/v1/content/privacy` (CMS-managed)

**SEO:**

- Title: "Privacy Policy — Grace Arena Resorts"
- Canonical URL

---

### 3.14 Admin CMS Panel

**Route Prefix:** `/admin` (all admin routes require authentication + appropriate role; unauthenticated users are redirected to `/login?redirect=/admin`)

> **Design Note:** The Admin CMS is built within the same Next.js application as protected routes under `/admin`. It uses a distinct layout (sidebar navigation, no public navbar/footer). The CMS is designed for desktop-first usage but must remain functional on tablet devices (≥ 768px). Mobile optimization is not required for admin pages.

#### 3.14.1 Admin Layout

- **Sidebar Navigation** (collapsible): Dashboard, Rooms & Buildings, Bookings, Restaurants & Menus, Facilities, Off-Beat Gems, Events & Inquiries, Deals & Offers, Contact Submissions, Newsletter, Media Library, Content Pages, Users (Super Admin only), System Settings (Super Admin only)
- **Top Bar:** Admin user name, role badge, "View Site" link (opens public site in new tab), logout button, notification bell (for new bookings, inquiries, contact submissions)
- **Breadcrumb Trail:** For navigation context within nested pages

#### 3.14.2 Dashboard

**Route:** `/admin`

- **Key Metrics Cards:** Total bookings (today/this week/this month), revenue (today/this week/this month), occupancy rate (today), pending bookings count, new contact submissions (unread), new event inquiries (unread)
- **Bookings Chart:** Line or bar chart showing booking count and revenue over last 30 days
- **Occupancy Heatmap:** Calendar heatmap showing occupancy rates for the current and next month
- **Recent Activity Feed:** Last 10 actions (new bookings, cancellations, inquiries, contact submissions) with timestamps
- **Quick Actions:** "Create Booking" (admin-initiated), "Add Deal", "Upload Media"

**Data Requirements:**

- `GET /api/v1/analytics/bookings`
- `GET /api/v1/analytics/revenue`
- `GET /api/v1/analytics/occupancy`

#### 3.14.3 Rooms & Buildings Management

**Route:** `/admin/rooms`

- **Buildings List:** Table showing all buildings with resort campus, name, number of room types. "Add Building" button opens a create form (name, resort campus dropdown, description).
- **Room Types List:** Table showing all room types with columns: name, building, tier, base price, total units, status, actions (Edit, View Units). Filterable by resort campus, tier, status.
- **Room Type Edit Form:** All fields from the `RoomType` entity — name, tier (dropdown), description (rich text), base price (number input), max guests, total units, status (dropdown: available/under_construction), amenities editor (structured list with name, category, isConditional toggles), image gallery (multi-upload with drag-to-reorder).
- **Room Units View** (`/admin/rooms/{id}/units`): Table of individual room units with unit number, floor, status (available/occupied/maintenance). Status is editable inline.
- **Seasonal Pricing** (`/admin/rooms/{id}/pricing`): Table of seasonal price overrides for the room type. Add/edit/delete seasonal price records (label, start date, end date, price). Validation: date ranges must not overlap for the same room type.

#### 3.14.4 Bookings Management

**Route:** `/admin/bookings`

- **Bookings Table:** Paginated table with columns: reference, guest name, check-in, check-out, rooms, total, status, created date. Filterable by status, date range, resort. Searchable by reference, guest name, or email.
- **Booking Detail View** (`/admin/bookings/{ref}`): Full booking details including guest info, rooms, pricing breakdown, payment status, deal applied, special requests, and status history (audit trail of status changes with timestamps and who changed it).
- **Status Actions:** Buttons to change booking status according to the state machine: Mark as Checked-In, Mark as Checked-Out, Mark as No-Show, Cancel Booking (with refund amount calculator displayed).
- **Admin-Initiated Booking:** "Create Booking" form for walk-in guests (same fields as public booking but without payment — marks booking as Confirmed directly, `userId` remains null). Used for phone/WhatsApp bookings processed by staff.
- **Refund Management:** When cancelling a confirmed booking, display calculated refund amount per policy. "Process Refund" button initiates Paystack refund API call. Refund status tracked: Pending → Processed → Failed.

#### 3.14.5 Content Pages Management

**Route:** `/admin/content`

- List of CMS-managed pages: About, Facilities (intro text), Gems (intro text), Events (category descriptions), Contact Info, Privacy Policy
- Each page opens a rich text editor with structured fields matching the page's content requirements
- "Preview" button to see changes before publishing
- "Publish" button saves and invalidates SSG cache for the page

#### 3.14.6 Restaurants & Menus Management

**Route:** `/admin/restaurants`

- **Restaurant List:** Cards or table showing all restaurants with name, cuisine type, status
- **Restaurant Edit Form:** Name, cuisine type, description (rich text), operating hours (structured JSON editor: day of week → open/close time), image gallery
- **Menu Editor** (`/admin/restaurants/{id}/menu`): Categorized menu items (Starters, Mains, Desserts, Beverages). Each item: name, description, price (NGN), isAvailable toggle, sort order (drag-to-reorder). Add/edit/delete items.

#### 3.14.7 Facilities, Gems, Events, Deals Management

Each follows a standard CRUD pattern:

- **List View:** Paginated table with key columns, search, and filters. "Add New" button.
- **Edit Form:** All entity fields with appropriate input types (text, rich text, number, date pickers, dropdowns, image upload, JSON editors for structured data like operating hours or venue options).
- **Delete:** Soft-delete with confirmation modal. Deleted items are hidden from public pages but retained in the database.

**Deals-specific features:**

- Start/end date pickers with validation (end must be after start)
- Promo code generator (auto-generate or manual entry, uniqueness validated)
- "Applicable Room Types" multi-select dropdown
- "Active" toggle with warning if toggling off an unexpired deal

**Events Inquiries sub-view** (`/admin/events/inquiries`):

- Table of all inquiries with columns: contact name, event type, preferred date, status, assigned to, created date
- Status update dropdown (New → In Review → Responded → Closed)
- "Assign To" dropdown to assign an admin staff member
- Inquiry detail view with all submitted information and an internal notes textarea

#### 3.14.8 Contact Submissions

**Route:** `/admin/contact`

- Paginated table: name, email, subject, status (New/Read/Responded/Closed), date
- Click to view full message
- Status update dropdown
- "Reply via Email" button (opens pre-filled email in default mail client or sends via SendGrid)

#### 3.14.9 Newsletter Subscribers

**Route:** `/admin/newsletter`

- Table of subscribers: email, confirmed (yes/no), subscribed date, unsubscribed date
- Export to CSV button
- Subscriber count and growth metrics

#### 3.14.10 Media Library

**Route:** `/admin/media`

- Grid view of all uploaded media (images and videos) with thumbnails
- Filter by category (gallery, room, facility, restaurant, event, deal)
- Upload area: drag-and-drop or file picker. Accepts JPEG, PNG, WebP (max 10 MB), MP4 (max 100 MB)
- Each asset shows: thumbnail, file name, dimensions, size, upload date, alt text
- Edit alt text inline
- Delete with confirmation (checks for references in rooms, facilities, etc. before deleting; warns if asset is in use)

#### 3.14.11 User Management (Super Admin only)

**Route:** `/admin/users`

- Table of all users: name, email, role, email verified, locked, created date
- "Create Admin User" button (form: name, email, role dropdown — Content Manager / Resort Admin / Super Admin). Sends invitation email with temporary password.
- Edit user role
- Lock/unlock user account
- Cannot delete own Super Admin account

#### 3.14.12 System Settings (Super Admin only)

**Route:** `/admin/settings`

- **Tax Configuration:** VAT rate (percentage input, default 7.5%)
- **Booking Settings:** Pending booking expiry time (minutes, default 30), cancellation policy thresholds (hours)
- **Check-in/Check-out Times:** Configurable (default: check-in 14:00, check-out 11:00)
- **Resort Contact Info:** Phone numbers, email addresses, physical address, social media URLs
- **WhatsApp Number:** Phone number used for wa.me links
- **Google Maps Coordinates:** Latitude and longitude for map embed

**Data Requirements:**

- `GET /api/v1/admin/settings`
- `PUT /api/v1/admin/settings`

---

## 4. Server-Side Functional Requirements

> **Design Note:** The backend is implemented as Next.js API Routes (`src/pages/api/v1/`) deployed as serverless functions on Vercel. All database operations use the Supabase JS Client (`@supabase/supabase-js`) to query the managed PostgreSQL instance. Authentication is handled by Supabase Auth with JWT tokens (short-lived access tokens, long-lived refresh tokens) and Row-Level Security (RLS) policies for authorization. File storage uses Supabase Storage (S3-compatible with CDN delivery). Background jobs (pending booking expiry, email retries) use Supabase Edge Functions and `pg_cron`. All endpoints are versioned under `/api/v1/`. Redis is used for rate limiting (via Vercel KV or Upstash).

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
- JWT access tokens expire after 15 minutes; refresh tokens after 7 days (30 days if "Remember me" is selected)
- Failed login attempts: lock account after 5 consecutive failures for 15 minutes. Lockout auto-expires after 15 minutes (time-based). The failed attempt counter resets on successful login. The user is shown a clear error message: "Your account has been temporarily locked due to too many failed attempts. Please try again in 15 minutes or reset your password." reCAPTCHA v3 is triggered after 3 failed attempts (before lockout threshold).
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

| Method | Route                                 | Description                                                |
| ------ | ------------------------------------- | ---------------------------------------------------------- |
| GET    | `/api/v1/availability`                | Check room availability for a specific date range          |
| GET    | `/api/v1/availability/calendar`       | Get per-day availability map for a month (for date picker) |
| POST   | `/api/v1/bookings`                    | Create a new booking                                       |
| GET    | `/api/v1/bookings/{ref}`              | Get booking by reference number                            |
| GET    | `/api/v1/bookings`                    | List bookings (admin: all; guest: own)                     |
| PUT    | `/api/v1/bookings/{ref}/cancel`       | Cancel a booking                                           |
| PUT    | `/api/v1/bookings/{ref}/status`       | Update booking status (admin)                              |
| POST   | `/api/v1/bookings/{ref}/confirmation` | Resend confirmation email                                  |
| GET    | `/api/v1/bookings/{ref}/pdf`          | Download booking confirmation / receipt as PDF             |

**Calendar Availability Endpoint:**

`GET /api/v1/availability/calendar?month={YYYY-MM}&roomTypeId={id}`

Returns an array of objects, one per day in the requested month:

```json
[
  { "date": "2026-05-01", "available": 8, "total": 10, "price": 60000 },
  { "date": "2026-05-02", "available": 5, "total": 10, "price": 60000 },
  ...
]
```

The `price` field reflects the applicable rate for that date (base or seasonal override). If `roomTypeId` is omitted, returns aggregate availability across all room types.

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
- Availability is double-checked at booking creation using a serialized database transaction (SELECT ... FOR UPDATE on the room type's unit count for the requested date range) to prevent double-booking

**Check-in / Check-out Times:**

- **Check-in time:** 2:00 PM (14:00) on the check-in date
- **Check-out time:** 11:00 AM (11:00) on the check-out date
- These times are configurable via System Settings (Section 3.14.12) and stored in the `SystemSetting` entity
- Check-in/out times are displayed on the booking confirmation page, confirmation email, and PDF receipt

**Inventory Locking (Pending Bookings):**

- When a booking is created (status: Pending), the requested room inventory is **temporarily held** — the available count is reduced for the requested date range.
- Pending bookings expire after 30 minutes if payment is not completed. Upon expiry, the hold is released and inventory becomes available again. A background job runs every 5 minutes to expire stale pending bookings.
- To handle race conditions: if a user completes payment for a booking that is in the process of expiring, the payment verification handler checks if the booking is still in `Pending` status before confirming. If it has already been expired, the payment is automatically refunded via Paystack and the user is notified: "Your booking session expired. Your payment has been refunded. Please try again."
- If only 1 unit remains and two users attempt to book simultaneously, the serialized transaction ensures only one succeeds — the second receives an "This room is no longer available for your selected dates" error.

**Price Calculation:**

- Price is calculated on a **per-night basis**. For each room in the booking, for each night of the stay, the applicable rate is determined:
  1. Check if a `SeasonalPrice` record exists for this `roomTypeId` where the night's date falls within `startDate`–`endDate`. If multiple seasonal prices overlap, the one with the latest `createdAt` takes precedence.
  2. If no seasonal price applies, use the room type's `basePrice`.
- Formula: `SUM(applicable_nightly_rate × quantity)` for each night, across all rooms = **subtotal**
- Tax: `subtotal × tax_rate` (configurable, default 7.5% VAT, stored in `SystemSetting`)
- Deal discount (if applicable):
  - **Percentage discounts** are applied to the subtotal (after summing all rooms and nights) before tax. The discount only applies to room types listed in the deal's `applicableRoomTypeIds`. If a booking contains both applicable and non-applicable rooms, only the applicable rooms' subtotal is discounted.
  - **Fixed discounts** are subtracted from the subtotal (after summing all rooms and nights) before tax.
  - Deals apply within their valid date range regardless of seasonal pricing — the discount is always calculated on the effective (seasonal or base) price.
- Total: `subtotal − deal_discount + tax`

**Cancellation Policy & Refunds:**

- Full refund if cancelled ≥72 hours before check-in time (14:00 on check-in date)
- 50% refund if cancelled 24–72 hours before check-in time
- No refund if cancelled <24 hours before check-in time
- Refunds are processed automatically via the Paystack Refunds API upon cancellation by guest or admin
- For partial refunds (50%), the Paystack Refunds API supports partial refund amounts
- Refund processing timeline: initiated immediately, reflected in guest's account within 5–10 business days (per Paystack's processing time)
- Guest is notified via email when a refund is initiated (with refund amount and estimated timeline) and again when the refund is completed (via Paystack webhook notification)
- The `Payment` entity status is updated to `refunded` (full) or `partially_refunded` upon successful refund webhook

**No-Show Policy:**

- Admin can mark a booking as "No-Show" starting 24 hours after the scheduled check-in time
- No-show bookings are not eligible for refund

**Additional Rules:**

- Confirmation email (with PDF attachment) sent automatically on status change to Confirmed
- Multi-room bookings create one Booking record with multiple BookingLineItem records
- Admin-initiated bookings (walk-in, phone, WhatsApp) bypass payment flow — created with status "Confirmed" directly, `userId` is null, payment record is optional (marked as "cash" or "pos" gateway)

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
- Rate limit event inquiries: max 5 submissions per IP per hour
- reCAPTCHA v3 (invisible) is required on all public form submissions: contact form, event inquiry form, newsletter signup, and notify-me registration. Server-side verification of the reCAPTCHA token is mandatory — submissions with a score below 0.5 are rejected.
- Newsletter subscription requires email confirmation (double opt-in)
- Unsubscribe link included in every newsletter email
- "Notify Me" lifecycle:
  - Registration endpoint (`POST /api/v1/notify-me`) accepts `email` and `roomTypeId`. Duplicate registrations (same email + same roomTypeId) are silently ignored (return 200 OK without creating a duplicate record).
  - When an admin changes a room type's status from `under_construction` to `available` via the CMS, the system automatically triggers a batch notification email to all registered email addresses for that room type.
  - The notification email subject: "Great News — {Room Type Name} is Now Available at Grace Arena Resorts!"
  - The notification email body includes: room name, tier, new pricing (₦ per night), a hero image of the room, a brief description, and a prominent "Book Now" CTA button linking to `/booking?room={roomTypeId}`.
  - After notification, the `NotifyMeRegistration` record's `isNotified` field is set to `true` and a `notifiedAt` timestamp is recorded. Records are retained for analytics purposes (not deleted).
  - If the email fails to send for any record, it is retried via the background job queue (up to 3 retries with exponential backoff).
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

| Requirement      | Implementation                                                                                                                                                                                                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTPS            | Enforced on all endpoints; HSTS header                                                                                                                                                                                                                                                                                                 |
| Input Validation | Server-side validation on all inputs using schema validation (e.g., Zod, Joi)                                                                                                                                                                                                                                                          |
| SQL Injection    | Parameterized queries via Supabase JS Client (uses parameterized PostgREST queries internally). No raw SQL concatenation.                                                                                                                                                                                                              |
| XSS              | Output encoding; Content-Security-Policy header; sanitize user-generated content                                                                                                                                                                                                                                                       |
| CSRF             | SameSite cookies; CSRF token on mutating requests from browser                                                                                                                                                                                                                                                                         |
| Rate Limiting    | Per-IP and per-user rate limiting on auth, contact, event inquiry, newsletter, and notify-me endpoints. reCAPTCHA v3 on all public form submissions.                                                                                                                                                                                   |
| Authentication   | JWT with short-lived access tokens; refresh tokens stored in HttpOnly cookies                                                                                                                                                                                                                                                          |
| Password Storage | bcrypt (cost factor ≥ 12)                                                                                                                                                                                                                                                                                                              |
| Data Encryption  | TLS 1.2+ in transit; AES-256 at rest for PII and payment data                                                                                                                                                                                                                                                                          |
| PCI-DSS          | Payment handled entirely via Paystack's hosted/inline checkout — no card data touches the server                                                                                                                                                                                                                                       |
| Webhook Security | Paystack webhook endpoint (`POST /api/v1/payments/verify`) MUST validate the `x-paystack-signature` header by computing HMAC-SHA512 of the raw request body using the Paystack secret key. Requests with invalid or missing signatures must be rejected with HTTP 401. No booking status should change based on an unverified webhook. |
| File Upload      | MIME type validation, file size limits, virus scanning recommended                                                                                                                                                                                                                                                                     |
| OWASP Top 10     | Mitigations for all categories (Injection, Broken Auth, Sensitive Data Exposure, XXE, Broken Access Control, Security Misconfiguration, XSS, Insecure Deserialization, Using Components with Known Vulnerabilities, Insufficient Logging)                                                                                              |
| Logging          | Centralized logging with no PII in logs; audit log for admin actions                                                                                                                                                                                                                                                                   |

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
- Database migrations managed via Supabase CLI (`supabase/migrations/` directory)

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

> **Design Note:** The data model uses a relational schema in PostgreSQL. The Resort → Building → RoomType → Room (unit) hierarchy supports the multi-campus structure. Bookings reference RoomTypes (not individual units) at creation time; unit assignment happens at check-in. Amenities on rooms are stored as structured JSON on RoomType to avoid a complex many-to-many for what is essentially static descriptive data. Resort-level amenities are managed as a separate `Amenity` entity for the Home Page amenities section. All entities use UUIDs as primary keys and include `createdAt` / `updatedAt` timestamps (both fields are present on every entity, even where not explicitly listed below).

### Entity-Relationship Summary

| Entity                   | Key Attributes                                                                                                                                                                                                                                                                                                                                                                                                          | Relationships                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **User**                 | `id`, `email`, `passwordHash`, `fullName`, `phone`, `role` (guest/content_manager/resort_admin/super_admin), `isEmailVerified`, `isLocked`, `failedLoginAttempts`, `lockedUntil`, `createdAt`, `updatedAt`                                                                                                                                                                                                              | Has many Bookings; Has many ContactSubmissions                                                  |
| **Resort**               | `id`, `name` (e.g., "GAR Elysian"), `slug`, `description`, `heroImageId`, `features` (JSON), `createdAt`, `updatedAt`                                                                                                                                                                                                                                                                                                   | Has many Buildings; Has many Facilities; Has many Restaurants                                   |
| **Building**             | `id`, `resortId` (FK), `name` (e.g., "The Fountain Haven"), `description`                                                                                                                                                                                                                                                                                                                                               | Belongs to Resort; Has many RoomTypes                                                           |
| **RoomType**             | `id`, `buildingId` (FK), `name`, `tier` (enum), `description`, `basePrice` (integer, NGN), `maxGuests`, `totalUnits`, `status` (available/under_construction), `amenities` (JSON array), `images` (JSON array of mediaAssetIds)                                                                                                                                                                                         | Belongs to Building; Has many Rooms (units); Has many BookingLineItems; Has many SeasonalPrices |
| **Room**                 | `id`, `roomTypeId` (FK), `unitNumber`, `floor`, `status` (available/occupied/maintenance)                                                                                                                                                                                                                                                                                                                               | Belongs to RoomType                                                                             |
| **SeasonalPrice**        | `id`, `roomTypeId` (FK), `startDate`, `endDate`, `price` (integer, NGN), `label` (e.g., "Christmas Peak")                                                                                                                                                                                                                                                                                                               | Belongs to RoomType                                                                             |
| **Booking**              | `id`, `reference` (unique, e.g., "GAR-A1B2C3D4"), `userId` (FK, nullable — null for admin-initiated walk-in/phone bookings only; all online bookings require authentication), `guestName`, `guestEmail`, `guestPhone`, `checkInDate`, `checkOutDate`, `nights`, `adults`, `children`, `specialRequests`, `subtotal`, `dealDiscount`, `tax`, `total`, `status` (enum), `dealId` (FK, nullable), `createdAt`, `updatedAt` | Belongs to User (optional); Has many BookingLineItems; Has one Payment; May reference Deal      |
| **BookingLineItem**      | `id`, `bookingId` (FK), `roomTypeId` (FK), `quantity`, `unitPrice`, `lineTotal`                                                                                                                                                                                                                                                                                                                                         | Belongs to Booking; References RoomType                                                         |
| **Payment**              | `id`, `bookingId` (FK), `gateway` (e.g., "paystack", "cash", "pos"), `gatewayReference`, `amount`, `currency` ("NGN"), `status` (pending/success/failed/refunded/partially_refunded), `refundAmount` (integer, nullable), `refundedAt` (nullable), `paidAt`, `metadata` (JSON), `createdAt`, `updatedAt`                                                                                                                | Belongs to Booking                                                                              |
| **Restaurant**           | `id`, `resortId` (FK, nullable — null if shared across campuses), `name`, `slug`, `description`, `cuisineType`, `operatingHours` (JSON), `images` (JSON array), `createdAt`, `updatedAt`                                                                                                                                                                                                                                | Belongs to Resort (optional); Has many MenuItems                                                |
| **MenuItem**             | `id`, `restaurantId` (FK), `name`, `description`, `price` (integer, NGN), `category` (starter/main/dessert/beverage), `isAvailable`, `sortOrder`                                                                                                                                                                                                                                                                        | Belongs to Restaurant                                                                           |
| **Facility**             | `id`, `resortId` (FK, nullable — null if shared across campuses), `name`, `slug`, `description`, `operatingHours` (JSON), `images` (JSON array), `isFeatured`, `sortOrder`, `createdAt`, `updatedAt`                                                                                                                                                                                                                    | Belongs to Resort (optional)                                                                    |
| **Gem**                  | `id`, `name`, `slug`, `description`, `category` (nature/culture/adventure/spiritual), `distance`, `duration`, `images` (JSON array), `isFeatured`                                                                                                                                                                                                                                                                       | —                                                                                               |
| **EventCategory**        | `id`, `name` (weddings/shoots/celebrations/team_bonding), `description`, `venueOptions` (JSON), `capacity`, `samplePackages` (JSON), `images` (JSON array)                                                                                                                                                                                                                                                              | Has many EventInquiries                                                                         |
| **EventInquiry**         | `id`, `eventCategoryId` (FK), `contactName`, `contactEmail`, `contactPhone`, `preferredDate`, `estimatedGuests`, `budgetRange`, `specialRequirements`, `status` (new/in_review/responded/closed), `assignedTo` (FK, nullable), `createdAt`                                                                                                                                                                              | Belongs to EventCategory                                                                        |
| **Deal**                 | `id`, `title`, `slug`, `description`, `discountType` (percentage/fixed), `discountValue`, `promoCode` (unique, nullable), `startDate`, `endDate`, `isActive`, `category` (room/dining/package/seasonal), `applicableRoomTypeIds` (JSON array), `images` (JSON array), `terms`                                                                                                                                           | Referenced by Bookings                                                                          |
| **ContactSubmission**    | `id`, `userId` (FK, nullable), `name`, `email`, `phone`, `subject`, `message`, `status` (new/read/responded/closed), `createdAt`                                                                                                                                                                                                                                                                                        | Belongs to User (optional)                                                                      |
| **NewsletterSubscriber** | `id`, `email` (unique), `isConfirmed`, `confirmedAt`, `unsubscribedAt`, `createdAt`                                                                                                                                                                                                                                                                                                                                     | —                                                                                               |
| **NotifyMeRegistration** | `id`, `roomTypeId` (FK), `email`, `isNotified`, `notifiedAt` (nullable), `createdAt`                                                                                                                                                                                                                                                                                                                                    | References RoomType                                                                             |
| **Amenity**              | `id`, `name`, `icon` (mediaAssetId, FK, nullable), `category` (enum: general/bathroom/entertainment/outdoor — resort-level amenities), `sortOrder`, `createdAt`, `updatedAt`                                                                                                                                                                                                                                            | Referenced by RoomTypeAmenity (many-to-many)                                                    |
| **RoomTypeAmenity**      | `roomTypeId` (FK), `amenityId` (FK) — composite PK                                                                                                                                                                                                                                                                                                                                                                      | Junction table: RoomType ↔ Amenity                                                              |
| **SystemSetting**        | `id`, `key` (unique, e.g., `tax_rate`, `checkin_time`, `checkout_time`, `pending_booking_expiry_minutes`, `whatsapp_number`, `contact_email`, `contact_phone`, `map_coordinates`), `value` (text), `updatedAt`, `updatedBy` (FK, nullable)                                                                                                                                                                              | Updated by Admin                                                                                |
| **MediaAsset**           | `id`, `fileName`, `mimeType`, `sizeBytes`, `url`, `cdnUrl`, `altText`, `category` (gallery/room/facility/restaurant/event/deal), `uploadedBy` (FK), `createdAt`                                                                                                                                                                                                                                                         | Uploaded by User                                                                                |
| **AuditLog**             | `id`, `userId` (FK), `action`, `entity`, `entityId`, `previousData` (JSON), `newData` (JSON), `ipAddress`, `createdAt`                                                                                                                                                                                                                                                                                                  | Belongs to User                                                                                 |

---

## 7. API Endpoint Summary

> **Design Note:** All endpoints are prefixed with `/api/v1/`. Public endpoints are accessible without authentication. Guest-authenticated endpoints require a valid JWT from a registered guest. Admin endpoints require JWT + appropriate role. All responses use standard envelope: `{ "success": boolean, "data": {...}, "error": { "code": string, "message": string } }`. Pagination uses `?page=1&limit=20` with response headers `X-Total-Count` and `X-Total-Pages`.

| Method                     | Route                                 | Description                  | Auth | Role                       |
| -------------------------- | ------------------------------------- | ---------------------------- | ---- | -------------------------- |
| **Authentication**         |                                       |                              |      |                            |
| POST                       | `/api/v1/auth/register`               | Register guest               | No   | Public                     |
| POST                       | `/api/v1/auth/login`                  | Login                        | No   | Public                     |
| POST                       | `/api/v1/auth/refresh`                | Refresh JWT                  | No   | Public                     |
| POST                       | `/api/v1/auth/logout`                 | Logout                       | Yes  | Any                        |
| POST                       | `/api/v1/auth/forgot-password`        | Request password reset       | No   | Public                     |
| POST                       | `/api/v1/auth/reset-password`         | Reset password               | No   | Public                     |
| POST                       | `/api/v1/auth/resend-verification`    | Resend email verification    | No   | Public                     |
| PUT                        | `/api/v1/auth/me/password`            | Change password              | Yes  | Any                        |
| GET                        | `/api/v1/auth/me`                     | Get current user             | Yes  | Any                        |
| PUT                        | `/api/v1/auth/me`                     | Update profile               | Yes  | Any                        |
| **Rooms**                  |                                       |                              |      |                            |
| GET                        | `/api/v1/rooms`                       | List room types (filterable) | No   | Public                     |
| GET                        | `/api/v1/rooms/{id}`                  | Room type detail             | No   | Public                     |
| POST                       | `/api/v1/rooms`                       | Create room type             | Yes  | Resort Admin+              |
| PUT                        | `/api/v1/rooms/{id}`                  | Update room type             | Yes  | Resort Admin+              |
| DELETE                     | `/api/v1/rooms/{id}`                  | Soft-delete room type        | Yes  | Super Admin                |
| GET                        | `/api/v1/rooms/{id}/units`            | List individual units        | Yes  | Resort Admin+              |
| PUT                        | `/api/v1/rooms/{id}/units/{uid}`      | Update unit status           | Yes  | Resort Admin+              |
| GET                        | `/api/v1/buildings`                   | List buildings               | No   | Public                     |
| POST                       | `/api/v1/buildings`                   | Create building              | Yes  | Resort Admin+              |
| PUT                        | `/api/v1/buildings/{id}`              | Update building              | Yes  | Resort Admin+              |
| **Availability & Booking** |                                       |                              |      |                            |
| GET                        | `/api/v1/availability`                | Check availability           | No   | Public                     |
| GET                        | `/api/v1/availability/calendar`       | Calendar-view availability   | No   | Public                     |
| POST                       | `/api/v1/bookings`                    | Create booking               | Yes  | Guest+ (Admin for walk-in) |
| GET                        | `/api/v1/bookings`                    | List bookings                | Yes  | Guest (own) / Admin (all)  |
| GET                        | `/api/v1/bookings/{ref}`              | Get booking detail           | Yes  | Guest (own) / Admin        |
| PUT                        | `/api/v1/bookings/{ref}/cancel`       | Cancel booking               | Yes  | Guest (own) / Admin        |
| PUT                        | `/api/v1/bookings/{ref}/status`       | Update booking status        | Yes  | Resort Admin+              |
| POST                       | `/api/v1/bookings/{ref}/confirmation` | Resend confirmation          | Yes  | Guest (own) / Admin        |
| GET                        | `/api/v1/bookings/{ref}/pdf`          | Download PDF confirmation    | Yes  | Guest (own) / Admin        |
| **Payments**               |                                       |                              |      |                            |
| POST                       | `/api/v1/payments/initiate`           | Initiate payment             | Yes  | Guest+                     |
| POST                       | `/api/v1/payments/verify`             | Verify payment (webhook)     | No   | Paystack webhook           |
| GET                        | `/api/v1/payments/{id}`               | Get payment status           | Yes  | Guest (own) / Admin        |
| **Restaurants & Menus**    |                                       |                              |      |                            |
| GET                        | `/api/v1/restaurants`                 | List restaurants             | No   | Public                     |
| GET                        | `/api/v1/restaurants/{id}`            | Restaurant detail            | No   | Public                     |
| POST                       | `/api/v1/restaurants`                 | Create restaurant            | Yes  | Content Mgr+               |
| PUT                        | `/api/v1/restaurants/{id}`            | Update restaurant            | Yes  | Content Mgr+               |
| GET                        | `/api/v1/restaurants/{id}/menu`       | Get menu                     | No   | Public                     |
| PUT                        | `/api/v1/restaurants/{id}/menu`       | Update menu                  | Yes  | Content Mgr+               |
| **Facilities**             |                                       |                              |      |                            |
| GET                        | `/api/v1/facilities`                  | List facilities              | No   | Public                     |
| GET                        | `/api/v1/facilities/{id}`             | Facility detail              | No   | Public                     |
| POST                       | `/api/v1/facilities`                  | Create facility              | Yes  | Content Mgr+               |
| PUT                        | `/api/v1/facilities/{id}`             | Update facility              | Yes  | Content Mgr+               |
| DELETE                     | `/api/v1/facilities/{id}`             | Delete facility              | Yes  | Resort Admin+              |
| **Off-Beat Gems**          |                                       |                              |      |                            |
| GET                        | `/api/v1/gems`                        | List gems (filterable)       | No   | Public                     |
| POST                       | `/api/v1/gems`                        | Create gem                   | Yes  | Content Mgr+               |
| PUT                        | `/api/v1/gems/{id}`                   | Update gem                   | Yes  | Content Mgr+               |
| DELETE                     | `/api/v1/gems/{id}`                   | Delete gem                   | Yes  | Content Mgr+               |
| **Events**                 |                                       |                              |      |                            |
| GET                        | `/api/v1/events`                      | List event categories        | No   | Public                     |
| POST                       | `/api/v1/events/inquiries`            | Submit event inquiry         | No   | Public                     |
| GET                        | `/api/v1/events/inquiries`            | List inquiries               | Yes  | Resort Admin+              |
| PUT                        | `/api/v1/events/inquiries/{id}`       | Update inquiry               | Yes  | Resort Admin+              |
| **Deals & Offers**         |                                       |                              |      |                            |
| GET                        | `/api/v1/deals`                       | List active deals            | No   | Public                     |
| GET                        | `/api/v1/deals/{id}`                  | Deal detail                  | No   | Public                     |
| POST                       | `/api/v1/deals`                       | Create deal                  | Yes  | Content Mgr+               |
| PUT                        | `/api/v1/deals/{id}`                  | Update deal                  | Yes  | Content Mgr+               |
| DELETE                     | `/api/v1/deals/{id}`                  | Delete deal                  | Yes  | Resort Admin+              |
| GET                        | `/api/v1/deals/validate/{code}`       | Validate promo code          | No   | Public                     |
| **Contact & Newsletter**   |                                       |                              |      |                            |
| POST                       | `/api/v1/contact`                     | Submit contact form          | No   | Public                     |
| GET                        | `/api/v1/contact`                     | List submissions             | Yes  | Resort Admin+              |
| PUT                        | `/api/v1/contact/{id}`                | Update submission            | Yes  | Resort Admin+              |
| POST                       | `/api/v1/newsletter/subscribe`        | Subscribe                    | No   | Public                     |
| POST                       | `/api/v1/newsletter/unsubscribe`      | Unsubscribe                  | No   | Public                     |
| POST                       | `/api/v1/notify-me`                   | Register interest            | No   | Public                     |
| **Content (CMS)**          |                                       |                              |      |                            |
| GET                        | `/api/v1/content/{page}`              | Get page content             | No   | Public                     |
| PUT                        | `/api/v1/content/{page}`              | Update page content          | Yes  | Content Mgr+               |
| **Media**                  |                                       |                              |      |                            |
| POST                       | `/api/v1/media`                       | Upload media                 | Yes  | Content Mgr+               |
| GET                        | `/api/v1/media`                       | List media                   | Yes  | Content Mgr+               |
| DELETE                     | `/api/v1/media/{id}`                  | Delete media                 | Yes  | Content Mgr+               |
| **Amenities**              |                                       |                              |      |                            |
| GET                        | `/api/v1/amenities`                   | List all amenities           | No   | Public                     |
| POST                       | `/api/v1/amenities`                   | Create amenity               | Yes  | Content Mgr+               |
| PUT                        | `/api/v1/amenities/{id}`              | Update amenity               | Yes  | Content Mgr+               |
| DELETE                     | `/api/v1/amenities/{id}`              | Delete amenity               | Yes  | Resort Admin+              |
| **Admin Settings**         |                                       |                              |      |                            |
| GET                        | `/api/v1/admin/settings`              | List system settings         | Yes  | Super Admin                |
| PUT                        | `/api/v1/admin/settings`              | Update system settings       | Yes  | Super Admin                |
| **Admin Users**            |                                       |                              |      |                            |
| GET                        | `/api/v1/admin/users`                 | List all users               | Yes  | Super Admin                |
| PUT                        | `/api/v1/admin/users/{id}/role`       | Change user role             | Yes  | Super Admin                |
| PUT                        | `/api/v1/admin/users/{id}/status`     | Activate/deactivate user     | Yes  | Super Admin                |
| **Analytics (Admin)**      |                                       |                              |      |                            |
| GET                        | `/api/v1/analytics/bookings`          | Booking statistics           | Yes  | Resort Admin+              |
| GET                        | `/api/v1/analytics/revenue`           | Revenue reports              | Yes  | Resort Admin+              |
| GET                        | `/api/v1/analytics/occupancy`         | Occupancy rates              | Yes  | Resort Admin+              |

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

> **v1.0 Scope Note:** SMS integration is **deferred to post-v1.0**. For v1.0, email is the sole automated notification channel. This section is retained to document the planned integration for a future release.

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
| Authentication       | Login form with redirect support → Register with NDPR consent → Forgot/Reset password flows             | Section 3.11      |
| Guest Account        | My Bookings list (status-filtered) → Booking detail with actions → Profile settings → Change password   | Section 3.12      |
| Privacy Policy       | Data collection → Usage → Legal basis → Third parties → Retention → NDPR rights → Cookie policy         | Section 3.13      |
| Admin CMS            | Sidebar nav → Dashboard metrics → CRUD modules for all entities → Media library → System settings       | Section 3.14      |

_Detailed wireframes to be produced in design phase based on these specifications._

### 9.3 Revision History

| Version | Date           | Author            | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | -------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | March 29, 2026 | Architecture Team | Initial SRS draft                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1.1     | —              | Architecture Team | Revised per BA critique: added cookie consent banner; global error/loading/empty states; fixed hero video mobile spec; fixed Village max-guests; rewrote booking page as 4-step wizard with per-night pricing; added Auth pages (3.11), Guest Account (3.12), Privacy Policy (3.13), Admin CMS panel (3.14); expanded auth lockout & booking engine specs; added Amenity, RoomTypeAmenity, SystemSetting entities; added calendar availability & PDF endpoints; added SMS deferral note; added CAPTCHA & webhook verification mandates; resolved guest-checkout vs. required-auth contradiction |
| 1.2     | March 29, 2026 | Architecture Team | Added Section 2.7 Technology Stack specifying concrete implementation choices: Supabase (managed PostgreSQL + Auth + Storage), Next.js API Routes, Chakra UI v3, Paystack, SendGrid, Vercel deployment. Updated Sections 2.4, 4, 5.3, and 5.5 to align with chosen stack.                                                                                                                                                                                                                                                                                                                       |

---

_End of Document_
