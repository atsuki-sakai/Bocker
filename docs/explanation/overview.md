# Bocker - Business Overview

**Last Updated**: 2025-07-25  
**Consolidated from**: product-overview.md, summary.md, market-analysis.md

## Executive Summary

Bocker is a comprehensive SaaS reservation management platform for beauty salons featuring hybrid database architecture, optimistic inventory management, and LINE integration. Targeting Japanese beauty salons with 99.9% uptime and 50ms response times.

**Key Differentiators**:
- **Zero double-booking guarantee** via optimistic inventory management
- **Hybrid database design** (Convex + Supabase) for cost optimization
- **Industry-lowest operating cost**: ¥126/store/month at scale

## Market & Business Model

### Target Market
- **Primary**: Beauty salons, nail salons, esthetics (Japan)
- **Scale**: Small (≤3 staff) to medium (≤10 staff) establishments
- **Market size**: 25万店舗 (~¥2.5T annual market)
- **Growth rate**: 15-20% annual for salon IT solutions

### Revenue Model

#### Subscription Plans

**Lite Plan** - ¥6,000/month (¥60,000/year)
- Max 3 staff, 10 menus, 200 reservations/month
- Basic reservation calendar, customer management

**Pro Plan** - ¥10,000/month (¥100,000/year)  
- Max 10 staff, 20 menus, 500 reservations/month
- Advanced features: points/coupons, detailed analytics, carte management

**Key Features**:
- 30-day free trial for all plans
- No cancellation fees, plan changes anytime
- Annual plans: 16.7% discount (10 months price for 12 months)

### ROI Analysis

**Quantified Benefits**:
- **Labor cost reduction**: ¥100,000/month (83% reduction in phone booking time)
- **Revenue increase**: 15% conversion rate improvement + 20% repeat rate
- **Operational efficiency**: 40% no-show reduction, 10% capacity utilization improvement

**Investment Recovery**: Immediate (first month ROI positive)

## Product Architecture

### Core Technical Advantages

#### 1. Optimistic Inventory Management
- **Problem solved**: Eliminates double-booking in distributed systems
- **Implementation**: Immediate inventory reservation → payment processing → auto-rollback on failure  
- **Result**: 100% booking consistency guarantee

#### 2. Hybrid Database Design
```
Convex (Real-time)     →  Daily Migration  →  Supabase (Analytics)
- Future reservations                        - Completed reservations  
- Active customer data                       - Historical data
- Real-time inventory                        - Business intelligence
```

**Benefits**:
- **Performance**: <50ms response times
- **Cost efficiency**: 60% storage cost reduction vs single DB
- **Scalability**: 30,000 stores capacity

#### 3. Technology Stack
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Real-time DB**: Convex 1.23.0  
- **Analytics DB**: Supabase PostgreSQL
- **Auth**: Clerk (multi-tenant + organizations)
- **Payments**: Stripe Connect (marketplace payments)
- **Storage**: Google Cloud Storage + CDN
- **AI**: Google Gemini (content generation)

### Multi-tenant Architecture
- Complete data isolation per tenant/organization
- Soft deletes with `is_archive` flag
- All queries include `tenant_id` + `org_id` filters

## Feature Overview

### Reservation Management
- **Calendar interface**: Drag-and-drop scheduling
- **Timeline view**: Multi-staff visualization  
- **Smart scheduling**: Automatic time slot optimization
- **Flexible hours**: Custom business hours + exceptions
- **Conflict prevention**: Real-time availability checking

### Customer Management  
- **360° customer view**: Complete interaction history
- **Behavioral analytics**: LTV calculation, churn prediction
- **Segmentation**: Tag-based customer classification
- **Communication**: Automated reminders via LINE/email

### Staff Management
- **Role-based access**: Granular permission system
- **Performance tracking**: Revenue, booking, satisfaction metrics
- **Skill management**: Service capability mapping
- **Schedule optimization**: AI-powered shift recommendations

### Financial Management
- **Stripe integration**: Credit card processing + automatic settlements
- **Revenue analytics**: Real-time dashboards, trend analysis
- **Tax handling**: Automatic calculation and reporting
- **Multi-currency**: Supports yen and international payments

### Points & Loyalty (Pro Plan)
- **Flexible point rules**: Percentage or fixed-point rewards
- **Expiration management**: 1-5 year validity periods  
- **Bonus systems**: Visit frequency, birthday bonuses
- **Coupon campaigns**: Discount codes, targeted promotions

## Scaling Strategy

### Phase 1: ~3,000 stores (Current)
- **Status**: Production ready, no bottlenecks
- **Resources**: Convex 2.25M docs, Supabase <1TB
- **Actions**: Monitor metrics, optimize batch processes

### Phase 2: 3,000-10,000 stores  
- **Bottlenecks**: Convex document limits, Supabase query performance
- **Solutions**: 6-hour data migration, monthly partitioning, BRIN indexes

### Phase 3: 10,000-30,000 stores
- **Bottlenecks**: PostgreSQL I/O limits, Convex rate limits  
- **Solutions**: Database sharding, workload separation, CDN optimization

### Phase 4: 30,000+ stores
- **Requirement**: Architectural redesign to microservices + event-driven

## Competitive Advantages

| Feature | Bocker | SALON BOARD | Reservia | Square |
|---------|--------|-------------|----------|---------|
| Double-booking prevention | ◎ Guaranteed | △ Manual check | △ Manual | ○ Auto check |
| Point system | ◎ Fully automated | ○ Manual setup | ○ Manual | × None |
| LINE integration | ◎ LIFF native | △ External | ○ Basic | × None |
| Real-time inventory | ◎ Sub-second | × None | △ Basic | × None |
| Monthly cost | ¥6,000~ | Free* | ¥8,000~ | ¥3,000~ |

*Requires paid Hot Pepper Beauty listing

## Success Metrics & KPIs

### Technical Performance
- **Uptime**: 99.9% SLA guarantee
- **Response time**: <50ms average API response
- **Scalability**: 1,000 concurrent reservations/second
- **Data consistency**: Zero double-bookings achieved

### Business Impact
- **Customer retention**: 85% annual retention rate target
- **Revenue per customer**: ¥120,000 annual LTV
- **Market penetration**: 5% of target market by 2027
- **Support satisfaction**: >90% CSAT score

## Implementation Timeline

### Immediate (0-30 days)
1. **Account creation** (5 min)
2. **Store setup** (10 min) 
3. **Menu configuration** (10 min)
4. **Staff onboarding** (5 min)
5. **Go live** (immediate)

### Short-term optimization (1-3 months)
- Advanced analytics setup
- Marketing automation configuration  
- Third-party integrations
- Staff training completion

## Risk Management

### Technical Risks
- **Database bottlenecks**: Mitigated by hybrid architecture
- **Third-party dependencies**: Multiple providers, fallback systems
- **Security**: SOC2 compliance, regular penetration testing

### Business Risks  
- **Market competition**: Differentiated by technical advantages
- **Economic downturn**: Proven ROI makes service essential
- **Regulatory changes**: Proactive compliance monitoring

## Future Roadmap

### Short-term (3-6 months)
- **AI optimization**: Predictive scheduling, demand forecasting
- **Mobile apps**: Native iOS/Android applications
- **Advanced analytics**: Cohort analysis, predictive LTV

### Medium-term (6-12 months)
- **Multi-language**: English, Chinese localization
- **Global payments**: Multi-currency, regional payment methods
- **Enterprise features**: Advanced reporting, API access

### Long-term (1+ years)
- **Platform marketplace**: Third-party integrations
- **AI-driven insights**: Automated business recommendations
- **Industry expansion**: Adjacent service industries

---

**Related Documents**:
- [User Guide](./user-guide.md) - End-user manual
- [System Design](../architecture/system-design.md) - Technical architecture
- [Setup Guide](../operations/setup.md) - Implementation guide