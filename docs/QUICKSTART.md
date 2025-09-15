# Bocker Quick Start Guide

**Last Updated**: 2025-07-25  
**Estimated Time**: 15 minutes to full deployment

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- Git and terminal access
- Accounts: Vercel, Convex, Supabase, Clerk, Stripe

### 1. Clone & Install (2 minutes)

```bash
git clone https://github.com/your-org/bocker.git
cd bocker
pnpm install
```

### 2. Environment Configuration (5 minutes)

```bash
# Copy environment template
cp .env.example .env.local

# Configure required variables
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STRIPE_SECRET_KEY=sk_test_...
```

### 3. Database Setup (3 minutes)

```bash
# Initialize Convex
npx convex dev

# Setup Supabase (in new terminal)
pnpm migrate:supabase
```

### 4. Start Development (1 minute)

```bash
# Start all services
pnpm dev

# Or individual services
pnpm dev:frontend  # Next.js on :3000
pnpm dev:backend   # Convex dashboard
```

## User Quick Start

### For Salon Owners

#### 1. Account Setup (5 minutes)

1. **Sign up**: Visit app.bocker.jp and create account
2. **Organization**: Create your salon organization
3. **Verification**: Verify email and phone number

#### 2. Basic Configuration (10 minutes)

```
Store Settings:
├── Basic Info (name, address, phone)
├── Business Hours (daily schedules + exceptions)
├── Services Menu (name, duration, price)
└── Staff Profiles (name, skills, availability)
```

#### 3. Start Taking Reservations (Immediate)

- **Reservation URL**: Shareable booking link generated automatically
- **Calendar View**: Drag-and-drop appointment management
- **Customer Portal**: Self-service booking for repeat customers

### For Developers

#### Core Architecture

```
Frontend (Next.js)
    ↓
Multi-tenant Auth (Clerk)
    ↓
Real-time Database (Convex) ←→ Analytics Database (Supabase)
    ↓
External Services (Stripe, GCS, LINE)
```

#### Key Concepts

- **Multi-tenancy**: All data isolated by `tenant_id` + `org_id`
- **Optimistic inventory**: Immediate slot reservation prevents double-booking
- **Hybrid database**: Hot data in Convex, cold data migrated to Supabase
- **Event-driven**: Convex actions handle async operations

#### First API Call

```typescript
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

// Get reservations for current tenant
const reservations = useQuery(api.reservations.list, {
  tenant_id: 'current_tenant',
  org_id: 'current_org',
  date_range: { start: Date.now(), end: Date.now() + 86400000 },
})
```

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### E2E Tests

```bash
# Run Playwright tests
pnpm test:e2e

# With browser UI
pnpm test:e2e:ui

# Specific test file
pnpm test:e2e -- tests/reservation-flow.spec.ts
```

### Test Data Setup

```bash
# Generate test data (development only)
npx convex run testing:seedData --tenantId "test-tenant"
```

## Deployment

### Vercel Deployment (5 minutes)

```bash
# Deploy to staging
vercel --env=staging

# Deploy to production
vercel --prod

# Environment variables (required)
NEXT_PUBLIC_CONVEX_URL=https://your-prod-deployment.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
# ... additional production keys
```

### Convex Deployment

```bash
# Deploy database functions
npx convex deploy --prod

# Run initial migrations
npx convex run migrations:initialSetup --prod
```

### Supabase Setup

```bash
# Apply database migrations
supabase db push --linked

# Setup Row Level Security
supabase db reset --linked
```

## Common Development Patterns

### Creating New Features

#### 1. Database Schema (Convex)

```typescript
// convex/schema.ts
export default defineSchema({
  new_feature: defineTable({
    tenant_id: v.string(),
    org_id: v.string(),
    name: v.string(),
    is_archive: v.boolean(),
    // ... feature-specific fields
  })
    .index('by_tenant_org', ['tenant_id', 'org_id'])
    .index('by_tenant_name', ['tenant_id', 'name']),
})
```

#### 2. API Functions (Convex)

```typescript
// convex/new_feature.ts
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    tenant_id: v.string(),
    org_id: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tenant access
    await validateTenantAccess(ctx, args.tenant_id)

    return await ctx.db.insert('new_feature', {
      ...args,
      is_archive: false,
      created_at: Date.now(),
    })
  },
})

export const list = query({
  args: { tenant_id: v.string(), org_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('new_feature')
      .withIndex('by_tenant_org', (q) =>
        q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id)
      )
      .filter((q) => q.eq(q.field('is_archive'), false))
      .collect()
  },
})
```

#### 3. Frontend Component

```typescript
// components/feature/NewFeatureList.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTenant } from "@/hooks/useTenant";

export function NewFeatureList() {
  const { tenantId, orgId } = useTenant();

  const features = useQuery(api.new_feature.list, {
    tenant_id: tenantId,
    org_id: orgId
  });

  const createFeature = useMutation(api.new_feature.create);

  const handleCreate = async (name: string) => {
    await createFeature({
      tenant_id: tenantId,
      org_id: orgId,
      name
    });
  };

  return (
    <div className="space-y-4">
      {features?.map(feature => (
        <FeatureCard key={feature._id} feature={feature} />
      ))}
    </div>
  );
}
```

### Multi-tenant Data Access

#### Required Pattern (Every Query)

```typescript
// ✅ Correct - Always include tenant filters
const data = await ctx.db
  .query('table_name')
  .withIndex('by_tenant_org', (q) => q.eq('tenant_id', args.tenant_id).eq('org_id', args.org_id))
  .filter((q) => q.eq(q.field('is_archive'), false))
  .collect()

// ❌ Incorrect - Missing tenant isolation
const data = await ctx.db.query('table_name').collect()
```

#### Soft Deletes

```typescript
// Mark as archived instead of deleting
export const softDelete = mutation({
  handler: async (ctx, { id, tenant_id }) => {
    await validateTenantAccess(ctx, tenant_id)

    await ctx.db.patch(id, {
      is_archive: true,
      archived_at: Date.now(),
    })
  },
})
```

## Performance Best Practices

### Database Optimization

```typescript
// Use compound indexes for common query patterns
.index("by_tenant_status_date", ["tenant_id", "status", "scheduled_at"])

// Batch operations when possible
const updates = reservations.map(r => ctx.db.patch(r._id, { status: "confirmed" }));
await Promise.all(updates);

// Paginate large result sets
const PAGE_SIZE = 50;
const results = await ctx.db
  .query("reservations")
  .withIndex("by_tenant_date", q => q.eq("tenant_id", tenantId))
  .order("desc")
  .take(PAGE_SIZE);
```

### Frontend Optimization

```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});

// Debounce search inputs
const [searchTerm, setSearchTerm] = useState("");
const debouncedSearch = useMemo(
  () => debounce(setSearchTerm, 300),
  []
);
```

## Troubleshooting

### Common Issues

#### 1. "Unauthorized" Errors

- **Cause**: Missing tenant validation or incorrect auth setup
- **Solution**: Ensure all Convex functions call `validateTenantAccess()`

#### 2. Slow Queries

- **Cause**: Missing database indexes or inefficient query patterns
- **Solution**: Add appropriate compound indexes, check query plans

#### 3. Memory Issues (Development)

- **Cause**: Large datasets in Convex during development
- **Solution**: Run data migration to Supabase: `npx convex run migrations:migrateOldData`

#### 4. Build Failures

- **Cause**: TypeScript errors or missing environment variables
- **Solution**: Run `pnpm lint` and `pnpm type-check`, verify `.env.local`

### Getting Help

- **Documentation**: Check `/docs` folder for detailed guides
- **GitHub Issues**: Report bugs and feature requests
- **Development Team**: Internal Slack #bocker-dev channel
- **User Support**: bocker.help@gmail.com for user-facing issues

## Next Steps

### For Development

1. Read [System Design](./architecture/system-design.md) for architecture details
2. Review [Core Features](./implementation/core-features.md) for implementation patterns
3. Set up [Monitoring](./operations/monitoring.md) for production deployments

### For Business Use

1. Complete [Setup Guide](./operations/setup.md) for production deployment
2. Review [User Guide](./business/user-guide.md) for feature documentation
3. Configure [Admin Manual](./guides/admin-manual.md) for staff training

---

**Need immediate help?** Check [CLAUDE.md](../CLAUDE.md) for AI development assistance or [troubleshooting](./operations/monitoring.md#troubleshooting) for common solutions.
