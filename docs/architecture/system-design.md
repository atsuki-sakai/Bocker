# System Architecture & Design

**Last Updated**: 2025-07-25  
**Consolidated from**: database-design.md, design-system.md, scaling-analysis.md

## Architecture Overview

Bocker employs a hybrid database architecture optimized for both real-time operations and cost-effective historical data storage, designed to scale from hundreds to 30,000+ salon operations.

### Core Design Principles

1. **Multi-tenant isolation**: Complete data segregation per tenant/organization
2. **Real-time performance**: <50ms API response times, optimistic concurrency control
3. **Cost optimization**: Intelligent data lifecycle management  
4. **Scalability**: Horizontal scaling without service interruption
5. **Reliability**: 99.9% uptime SLA with automatic failover

## Hybrid Database Architecture

### Two-Tier Data Strategy

```
┌─────────────────┐    Daily Migration    ┌──────────────────┐
│   Convex DB     │ ──────────────────→   │   Supabase DB    │
│  (Real-time)    │                       │   (Analytics)    │
├─────────────────┤                       ├──────────────────┤
│ • Future reserv │                       │ • Completed res  │
│ • Active menus  │                       │ • Customer hist  │
│ • Staff sched   │                       │ • Analytics data │
│ • Live inventory│                       │ • Long-term logs │
└─────────────────┘                       └──────────────────┘
```

### Convex (Primary Real-time Database)

**Role**: Handles all active operational data requiring real-time updates

**Schema Design**:
```typescript
// Core entities with multi-tenant isolation
interface BaseEntity {
  tenant_id: string;    // Organization identifier
  org_id: string;       // Sub-organization identifier  
  is_archive: boolean;  // Soft delete flag
  created_at: number;
  updated_at: number;
}

interface Reservation extends BaseEntity {
  customer_id: Id<"customers">;
  staff_id: Id<"staff">;
  menu_items: MenuSelection[];
  status: "pending" | "confirmed" | "completed" | "cancelled";
  scheduled_at: number;
  total_amount: number;
  payment_status: "pending" | "completed" | "refunded";
}
```

**Query Patterns**:
```typescript
// All queries MUST include tenant/org filters
const reservations = await ctx.db
  .query("reservations")
  .withIndex("by_tenant_org", (q) => 
    q.eq("tenant_id", args.tenant_id).eq("org_id", args.org_id)
  )
  .filter((q) => q.eq(q.field("is_archive"), false))
  .collect();
```

**Performance Characteristics**:
- **Document capacity**: 75M documents/project
- **API throughput**: 500k operations/day
- **Response time**: <50ms average
- **Concurrent connections**: 10k+ WebSocket connections

### Supabase (Historical Analytics Database)

**Role**: Long-term storage, business intelligence, compliance data

**Schema Design**:
```sql
-- Monthly partitioned tables for scalability
CREATE TABLE reservations_2025_01 PARTITION OF reservations
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Optimized indexes for analytics queries
CREATE INDEX CONCURRENTLY idx_reservations_tenant_date 
ON reservations USING BRIN (tenant_id, created_at);

-- Full-text search for customer data
CREATE INDEX idx_customers_search 
ON customers USING GIN (to_tsvector('japanese', name || ' ' || email));
```

**Migration Strategy**:
```typescript
// Nightly batch migration (6-hour intervals at scale)
export const migrateCompletedReservations = internalMutation({
  handler: async (ctx) => {
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    
    const completedReservations = await ctx.db
      .query("reservations")
      .filter(q => q.and(
        q.eq(q.field("status"), "completed"),
        q.lt(q.field("completed_at"), cutoffDate)
      ))
      .collect();
      
    // Bulk transfer to Supabase
    await supabase.from('reservations').insert(completedReservations);
    
    // Remove from Convex
    for (const reservation of completedReservations) {
      await ctx.db.delete(reservation._id);
    }
  }
});
```

## Optimistic Inventory Management

### Problem Statement
Traditional reservation systems suffer from race conditions causing double-bookings, especially under high concurrency.

### Solution: Atomic Inventory Operations

```typescript
export const createReservation = mutation({
  args: { /* reservation details */ },
  handler: async (ctx, args) => {
    return await ctx.db.system.isolation("serializable", async () => {
      // 1. Immediately reserve inventory
      const inventory = await ctx.db.get(args.inventorySlotId);
      if (inventory.available_slots <= 0) {
        throw new Error("No availability");
      }
      
      // 2. Atomically decrement availability
      await ctx.db.patch(args.inventorySlotId, {
        available_slots: inventory.available_slots - 1,
        reserved_until: Date.now() + (30 * 60 * 1000) // 30min hold
      });
      
      // 3. Create reservation
      const reservationId = await ctx.db.insert("reservations", {
        ...args,
        status: "inventory_held",
        created_at: Date.now()
      });
      
      // 4. Schedule payment processing
      await ctx.scheduler.runAfter(0, internal.payments.processPayment, {
        reservationId,
        inventorySlotId: args.inventorySlotId
      });
      
      return reservationId;
    });
  }
});

// Automatic rollback on payment failure
export const processPayment = internalMutation({
  handler: async (ctx, { reservationId, inventorySlotId }) => {
    try {
      const paymentResult = await processStripePayment(/* ... */);
      
      if (paymentResult.status === "succeeded") {
        // Confirm reservation
        await ctx.db.patch(reservationId, { 
          status: "confirmed",
          payment_status: "completed" 
        });
        
        // Make inventory permanent
        await ctx.db.patch(inventorySlotId, {
          reserved_until: null
        });
      } else {
        throw new Error("Payment failed");
      }
    } catch (error) {
      // Auto-rollback: restore inventory
      const inventory = await ctx.db.get(inventorySlotId);
      await ctx.db.patch(inventorySlotId, {
        available_slots: inventory.available_slots + 1,
        reserved_until: null
      });
      
      // Cancel reservation
      await ctx.db.patch(reservationId, { 
        status: "cancelled",
        cancellation_reason: "payment_failed" 
      });
    }
  }
});
```

**Benefits**:
- **Zero double-bookings**: Atomic operations prevent race conditions
- **Automatic recovery**: Failed payments release inventory within 30 minutes
- **High throughput**: 1,000+ concurrent reservations supported

## Scaling Architecture

### Scaling Phases & Bottlenecks

| Phase | Store Count | Primary Bottlenecks | Required Actions |
|-------|-------------|-------------------|------------------|
| **Phase 1** | ~3,000 | None (current capacity) | Monitor metrics, optimize queries |
| **Phase 2** | 3k-10k | Convex doc limits, PostgreSQL seq scans | Hourly migration, monthly partitioning |
| **Phase 3** | 10k-30k | Database I/O, rate limits | Sharding, workload separation |
| **Phase 4** | 30k+ | Fundamental architectural limits | Microservices redesign |

### Phase 2 Optimizations (3k-10k stores)

#### Database Optimization
```sql
-- Monthly partitioning strategy
CREATE TABLE reservations (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- ... other columns
) PARTITION BY RANGE (created_at);

-- BRIN indexes for time-series data
CREATE INDEX idx_reservations_brin 
ON reservations USING BRIN (tenant_id, created_at)
WITH (pages_per_range = 128);

-- Automated partition management
SELECT partman.create_parent(
  p_parent_table => 'public.reservations',
  p_control => 'created_at',
  p_type => 'range',
  p_interval => 'monthly'
);
```

#### Migration Frequency
```typescript
// Increase migration frequency to 6-hour intervals
export const frequentMigration = cronJobs.interval(
  "migrate data",
  { hours: 6 }, // Instead of daily
  internal.migration.migrateToSupabase
);
```

### Phase 3 Optimizations (10k-30k stores)

#### Database Sharding
```typescript
// Tenant-based sharding strategy
const getShardId = (tenantId: string): number => {
  return parseInt(tenantId.slice(-2), 16) % 4; // 4 shards
};

const getSupabaseClient = (tenantId: string) => {
  const shardId = getShardId(tenantId);
  return supabaseClients[shardId];
};
```

#### Convex Workload Separation
```
Project 1: Reservation Operations     Project 2: Analytics & Reports
├── reservations/                    ├── analytics/
├── inventory/                       ├── reports/  
├── payments/                        ├── customer_insights/
└── real_time/                       └── business_intelligence/
```

## Security Architecture

### Multi-tenant Data Isolation

#### Row-Level Security (Supabase)
```sql
-- Enable RLS on all tables
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON reservations
FOR ALL TO authenticated
USING (tenant_id = current_setting('app.current_tenant_id'));

-- Organization-level access control
CREATE POLICY org_access ON reservations
FOR ALL TO authenticated  
USING (
  org_id = current_setting('app.current_org_id') OR
  EXISTS (
    SELECT 1 FROM user_org_memberships 
    WHERE user_id = auth.uid() 
    AND org_id = reservations.org_id
    AND role IN ('admin', 'manager')
  )
);
```

#### Convex Security Rules
```typescript
// Convex auth rules - every function must validate tenant access
export const createReservation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    
    // Validate tenant membership
    const userTenant = await ctx.db
      .query("user_tenants")
      .withIndex("by_user_tenant", q => 
        q.eq("user_id", identity.subject).eq("tenant_id", args.tenant_id)
      )
      .unique();
      
    if (!userTenant) throw new Error("Access denied");
    
    // Proceed with operation...
  }
});
```

### Data Encryption & Compliance

**Encryption at Rest**:
- Supabase: AES-256 encryption enabled
- Convex: Built-in encryption for all data
- GCS: Customer-managed encryption keys (CMEK)

**Encryption in Transit**:
- TLS 1.3 for all API communications
- WebSocket connections over WSS
- Certificate pinning for mobile apps

**Compliance**:
- **GDPR**: Right to erasure, data portability, consent management
- **CCPA**: California Consumer Privacy Act compliance
- **SOC 2 Type II**: Annual third-party security audits
- **HIPAA**: Ready for health-related salon services

## Performance Optimization

### Caching Strategy

#### Multi-layer Caching
```typescript
// 1. Browser cache (static assets)
// Next.js static generation + CDN
export const getStaticProps: GetStaticProps = async () => {
  return {
    props: { /* ... */ },
    revalidate: 3600 // 1 hour cache
  };
};

// 2. Application cache (Convex queries)  
const cachedMenus = useQuery(api.menus.list, 
  { tenant_id }, 
  { cache: { ttl: 300_000 } } // 5 minute cache
);

// 3. Database query cache (Supabase)
const { data } = await supabase
  .from('customer_analytics')
  .select('*')
  .eq('tenant_id', tenantId)
  .cache(600); // 10 minute cache
```

#### CDN Configuration
```typescript
// Google Cloud CDN settings
const cdnConfig = {
  cacheMode: 'CACHE_ALL_STATIC',
  defaultTtl: 3600,
  maxTtl: 86400,
  // Optimize for images
  compressionMode: 'AUTOMATIC',
  enableCompression: true,
  // Regional cache for better performance
  regions: ['asia-northeast1', 'us-central1']
};
```

### Database Query Optimization

#### Convex Optimization
```typescript
// Use compound indexes for multi-field queries
db.reservations.index("by_tenant_status_date", [
  "tenant_id", 
  "status", 
  "scheduled_at"
]);

// Batch operations to reduce round trips
const reservationUpdates = reservations.map(r => 
  ctx.db.patch(r._id, { status: "confirmed" })
);
await Promise.all(reservationUpdates);
```

#### PostgreSQL Optimization  
```sql
-- Partial indexes for common query patterns
CREATE INDEX idx_active_reservations 
ON reservations (tenant_id, scheduled_at)
WHERE status IN ('confirmed', 'pending') AND is_archive = false;

-- Materialized views for analytics
CREATE MATERIALIZED VIEW monthly_revenue AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', completed_at) as month,
  SUM(total_amount) as revenue,
  COUNT(*) as reservation_count
FROM reservations 
WHERE status = 'completed'
GROUP BY tenant_id, DATE_TRUNC('month', completed_at);

-- Refresh every hour
SELECT cron.schedule('refresh-monthly-revenue', '0 * * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue');
```

## Monitoring & Observability

### Key Metrics Dashboard

#### Real-time Operational Metrics
```typescript
// Convex function performance
const reservationMetrics = {
  latency_p50: "< 25ms",
  latency_p95: "< 100ms", 
  error_rate: "< 0.1%",
  throughput: "1000 ops/min"
};

// Database health
const databaseMetrics = {
  convex_docs: "< 70M documents",
  convex_ops: "< 400k/day",
  supabase_connections: "< 8k concurrent",
  supabase_iops: "< 3200 IOPS"
};
```

#### Business Intelligence Metrics
```sql
-- Customer analytics
SELECT 
  tenant_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(DISTINCT customer_id) as active_customers,
  AVG(total_amount) as avg_transaction,
  SUM(total_amount) / COUNT(DISTINCT customer_id) as revenue_per_customer
FROM reservations 
WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY tenant_id, DATE_TRUNC('month', created_at);
```

### Alerting Strategy

#### Critical Alerts (PagerDuty)
- API response time > 500ms (5 min average)
- Error rate > 1% (10 min average) 
- Database connection failure
- Payment processing failure > 5%

#### Warning Alerts (Slack)
- Convex document count > 60M
- Supabase IOPS > 80%
- CDN cache hit rate < 95%
- Unusual traffic patterns

## Design System

### UI Component Architecture

#### Design Tokens
```typescript
// Color palette optimized for salon industry
export const colors = {
  primary: {
    50: '#fdf2f8',   // Light pink for backgrounds
    500: '#ec4899',  // Main brand pink
    900: '#831843'   // Dark pink for text
  },
  neutral: {
    50: '#f8fafc',   // Light gray
    500: '#64748b',  // Medium gray
    900: '#0f172a'   // Dark gray/black
  },
  semantic: {
    success: '#10b981',  // Green for confirmed
    warning: '#f59e0b',  // Orange for pending
    error: '#ef4444'     // Red for cancelled
  }
};

// Typography scale
export const typography = {
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem'     // 20px
  },
  weights: {
    normal: '400',
    medium: '500', 
    semibold: '600',
    bold: '700'
  }
};
```

#### Component Library Structure
```
components/
├── ui/                    # Base components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   └── calendar.tsx
├── feature/               # Feature-specific components
│   ├── reservation/
│   ├── customer/
│   └── staff/
└── layout/               # Layout components
    ├── sidebar.tsx
    ├── header.tsx
    └── dashboard-layout.tsx
```

#### Responsive Design Breakpoints
```css
/* Mobile-first responsive design */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

---

**Related Documents**:
- [API Reference](./api-reference.md) - Detailed API documentation
- [Core Features](../implementation/core-features.md) - Feature implementation details
- [Monitoring Guide](../operations/monitoring.md) - Operational monitoring setup