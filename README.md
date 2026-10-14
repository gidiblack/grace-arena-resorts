# Grace Arena Resorts (GAR)

A sanctuary of peace, luxury, and Christian hospitality located in Abuja, Nigeria.

## Architecture & Tech Stack

- **Framework:** Next.js 16 (Pages Router)
- **Language:** TypeScript (Strict mode)
- **UI & Styling:** Chakra UI v3 & Tailwind/CSS modules
- **State & Form Validation:** React Hook Form + Zod
- **Backend / Database:** Supabase (PostgreSQL, RLS, Storage, Auth)
- **Email Service:** SendGrid
- **Testing:** Vitest, Testing Library, Playwright

## Development Setup

### 1. Prerequisites

- Node.js 20+ (tested on Node 24)
- npm 10+

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

- `NEXT_PUBLIC_APP_URL`: App URL (e.g. `http://localhost:3000`)
- `NEXT_PUBLIC_WHATSAPP_NUMBER`: Official WhatsApp contact number without `+` (e.g. `2348123456789`)
- `SENDGRID_API_KEY`: SendGrid API key
- `SENDGRID_FROM_EMAIL`: Verified sender email address

### 3. Available Commands

```bash
# Run local development server
npm run dev

# Run TypeScript type check
npm run typecheck

# Run unit and integration tests with coverage
npm run test

# Run tests in watch mode
npm run test:watch

# Format code with Prettier
npm run format

# Verify code formatting
npm run format:check

# Run full CI validation suite
npm run ci
```

## Delivery Milestones

- **Milestone 1:** Marketing Site (Foundations, Global Shell, Public Pages, Rooms Catalog)
- **Milestone 2:** Booking Engine & Accounts (Supabase Schema, Auth, Payment Integration, Booking Wizard)
- **Milestone 3:** Admin & Operations (Admin Portal, RBAC, Background Jobs, Observability)
