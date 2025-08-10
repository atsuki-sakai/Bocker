# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup & Development
```bash
# Install dependencies
pnpm install

# Start development server (Next.js + Convex)
pnpm dev

# Start individual services
pnpm dev:frontend     # Next.js only
pnpm dev:backend      # Convex only
pnpm predev          # Open Convex dashboard

# Environment management
pnpm env:dev         # Set development environment and start
pnpm env:staging     # Set staging environment
pnpm env:prod        # Set production environment
pnpm env:validate    # Validate environment variables
```

### Build & Quality
```bash
# Build
pnpm build           # Production build
pnpm build:t         # Build with Turbo
pnpm start           # Start production server

# Code quality
pnpm lint            # ESLint
pnpm analyze         # Bundle analyzer

# Testing
pnpm test            # Vitest unit tests
pnpm test:unit       # Run unit tests once
pnpm test:watch      # Watch mode
pnpm test:coverage   # Coverage report
pnpm test:e2e        # Playwright E2E tests
pnpm test:e2e:ui     # E2E tests with UI
pnpm test:e2e:headed # E2E tests in headed mode
pnpm test:all        # Run all tests
```

### Database & Infrastructure
```bash
# Convex
npx convex dev       # Start Convex development
npx convex deploy    # Deploy to production

# Supabase
pnpm migrate:supabase # Run Supabase migrations

# Internationalization
pnpm sync-lang-en    # Sync English language files
```

## Architecture Overview

**Bocker** is a comprehensive SaaS reservation management platform for beauty salons built with a hybrid database architecture optimized for both real-time operations and long-term analytics.

### Tech Stack
- **Frontend**: Next.js 15.3.3 + React 19 + TypeScript (strict mode)
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **Real-time DB**: Convex 1.23.0 (active data - future reservations, staff, menus)
- **Analytics DB**: Supabase PostgreSQL (historical data - completed reservations, customer history)
- **Auth**: Clerk 6.11.2 (multi-tenant with organization management)
- **Payments**: Stripe Connect (marketplace-style payments)
- **External APIs**: LINE Bot SDK, Google Cloud Storage, Google Gemini AI

### Hybrid Database Design
The application uses a unique dual-database architecture:
- **Convex**: Handles real-time data (future reservations, staff schedules, menus, settings)
- **Supabase**: Stores historical data (completed reservations, customer analytics, long-term metrics)
- **Nightly Batch Jobs**: Migrate old data from Convex to Supabase for cost optimization

### Directory Structure

#### Frontend (`/app/[locale]/`)
- `(auth)/` - Authentication flows (sign-in, sign-up, staff invitations)
- `(dashboard)/` - Admin panel (reservation management, customer/staff management, analytics)
- `(reservation)/` - Customer-facing booking system with LINE integration
- `(customer)/` - Customer portal (profile, history, points)
- `(home)/` - Marketing pages and landing
- `api/` - Next.js API routes (auth, payments, AI, webhooks)

#### Backend
- `/convex/` - Real-time database functions (queries, mutations, actions)
- `/services/` - External service integrations (Stripe, LINE, GCP, Supabase)
- `/components/` - Reusable UI components
- `/lib/` - Utilities, validation schemas, helpers
- `/hooks/` - Custom React hooks

## Multi-tenant Architecture

All database entities follow strict multi-tenant design:
- Every table has `tenant_id` and `org_id` fields
- Complete data isolation between tenants
- All queries MUST include tenant/org filters
- Soft deletes using `is_archive` flag

## Key Convex Patterns

### Function Definition (New Syntax)
```typescript
// Use the new Convex function syntax
export const createReservation = mutation({
  args: { /* validator */ },
  handler: async (ctx, args) => {
    // Implementation
  }
})
```

### Multi-tenant Queries
```typescript
// Always include tenant/org filters
const reservations = await ctx.db
  .query("reservations")
  .withIndex("by_tenant_org", (q) => 
    q.eq("tenant_id", args.tenant_id).eq("org_id", args.org_id)
  )
  .filter((q) => q.eq(q.field("is_archive"), false))
  .collect()
```

## Testing Setup

### Vitest (Unit Tests)
- Environment: jsdom with React Testing Library
- Coverage: 70% thresholds for branches, functions, lines, statements
- Fork-based execution for isolation
- Setup file: `vitest.setup.ts`

### Playwright (E2E Tests)
- Multi-browser: Chrome, Firefox, Safari, Mobile
- Test environment setup with `.env.test`
- Retry policies and parallel execution
- Rich reporting (HTML, JUnit, JSON)

### Running Single Tests
```bash
# Vitest single test
pnpm test -- filename.test.tsx

# Playwright single test
pnpm test:e2e -- tests/specific-test.spec.ts
```

## External Service Integration

### Stripe Connect
- Marketplace-style payments for multi-tenant SaaS
- Webhook handling with proper idempotency
- Subscription management (Lite/Pro plans)

### LINE Integration
- LIFF (LINE Front-end Framework) for customer authentication
- Flex Messages for rich notifications
- Bot messaging for reservation confirmations

### AI Features
- Google Gemini API for menu description generation
- Proper rate limiting and error handling

## Development Best Practices

### Code Style
- TypeScript strict mode is enforced
- Use new Convex function syntax (`export const func = query({...})`)
- Prefer Server Components, minimize "use client"
- Follow existing shadcn/ui patterns

### Error Handling
```typescript
// Use structured error handling
import { ValidationError } from '@/lib/errors'
throw new ValidationError('Invalid input', { field: 'email' })
```

### Security
- All customer data MUST include tenant/org isolation
- Use HTTPOnly cookies for session management
- Validate all inputs with Zod schemas
- Never expose internal IDs to frontend

## Known Issues & Limitations

### Critical Issue: Stripe Webhook Handler
The Stripe `checkout.session.completed` event handler is not fully implemented. Credit card payments will remain in "pending" status until this is resolved.

**Required Implementation**: `/services/webhook/stripe/handlers.connect.ts`
```typescript
export async function handleCheckoutSessionCompleted(
  evt: Stripe.CheckoutSessionCompletedEvent,
  eventId: string,
  deps: WebhookDependencies,
  metrics: WebhookMetricsCollector
): Promise<EventProcessingResult> {
  // 1. Extract reservation ID from metadata
  // 2. Update reservation status to 'confirmed' in Convex
  // 3. Update payment_status to 'completed'
  // 4. Send confirmation email/LINE message
  // 5. Create point reward queue entry
}
```

### Performance Notes
- Batch processes are currently disabled in production
- Consider enabling cron jobs in `convex/crons.ts` for data migration
- Large datasets should use Supabase for analytics queries

## Business Context

This is a commercial SaaS product targeting Japanese beauty salons with:
- **Pricing**: Lite (¥8,000/month), Pro (¥12,000/month)
- **Target Scale**: 3,000+ concurrent salon operations
- **Revenue Model**: Monthly subscriptions with 30-day trials
- **Market Focus**: LINE integration for Japanese market penetration

The codebase is production-ready for small to medium deployments and designed to scale to enterprise levels with planned optimizations.