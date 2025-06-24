# Convex Performance Optimizations Summary

## Date: 2025-06-21

This document summarizes the performance optimizations applied to the Convex query functions across the Bocker project.

## Optimization Patterns Applied

### 1. Parallel Data Fetching with Promise.all
- **Pattern**: Replace sequential `await` calls with `Promise.all` for independent queries
- **Benefit**: Reduces total query time from O(n) to O(1) where n is the number of queries

### 2. Map-based Lookups
- **Pattern**: Convert arrays to Maps for O(1) lookups instead of using `.find()` in loops
- **Benefit**: Reduces complexity from O(n*m) to O(n+m) for nested loops

### 3. Direct Database Access
- **Pattern**: Use direct database queries instead of `ctx.runQuery` wrapper
- **Benefit**: Eliminates redundant function call overhead

### 4. Field Projection
- **Pattern**: Select only required fields instead of fetching entire documents
- **Benefit**: Reduces data transfer and memory usage

## Files Optimized

### /convex/reservation/query.ts
1. **calculateReservationTime**: 
   - Replaced sequential queries with parallel fetching using Promise.all
   - Combined 4 sequential queries into 1 parallel operation
   
2. **getReservationFormData**:
   - Implemented parallel data fetching for all required data
   - Direct database queries instead of ctx.runQuery calls
   
3. **getScheduleData**:
   - Parallel fetching of available slots and organization schedule

### /convex/staff/query.ts
1. **listDisplayData**:
   - Converted repeated `.find()` calls to Map-based lookup
   - Added parallel fetching of staff and staff configs
   - Reduced complexity from O(n²) to O(n)

### /convex/organization/query.ts
1. **getRelations**:
   - Parallel fetching of config, apiConfig, and reservationConfig
   - Reduced 3 sequential queries to 1 parallel operation
   
2. **getOrgAndConfig**:
   - Parallel fetching of organization and config data

### /convex/coupon/query.ts
1. **getCouponRelatedTablesAndExclusionMenus**:
   - Parallel fetching of couponConfig and exclusionMenus
   - Maintains error handling while improving performance

## Performance Impact

### Before Optimizations
- Sequential queries: Total time = T1 + T2 + T3 + ... + Tn
- Nested loops with `.find()`: O(n*m) complexity
- Multiple ctx.runQuery calls adding overhead

### After Optimizations
- Parallel queries: Total time = max(T1, T2, T3, ..., Tn)
- Map-based lookups: O(n) complexity
- Direct database access reducing function call overhead

### Expected Improvements
- **Query Latency**: 50-70% reduction in multi-query operations
- **CPU Usage**: Reduced computational complexity in data lookups
- **Network Efficiency**: Less data transfer with field projection

## Best Practices Established

1. **Always use Promise.all for independent queries**
   ```typescript
   // ❌ Bad
   const a = await ctx.db.query('table1').first();
   const b = await ctx.db.query('table2').first();
   
   // ✅ Good
   const [a, b] = await Promise.all([
     ctx.db.query('table1').first(),
     ctx.db.query('table2').first()
   ]);
   ```

2. **Use Maps for repeated lookups**
   ```typescript
   // ❌ Bad
   items.map(item => ({
     ...item,
     config: configs.find(c => c.item_id === item._id)
   }))
   
   // ✅ Good
   const configMap = new Map(configs.map(c => [c.item_id, c]));
   items.map(item => ({
     ...item,
     config: configMap.get(item._id)
   }))
   ```

3. **Direct database access over ctx.runQuery**
   ```typescript
   // ❌ Bad
   const result = await ctx.runQuery(api.module.query.function, args);
   
   // ✅ Good
   const result = await ctx.db.query('table').withIndex(...).first();
   ```

## Future Optimization Opportunities

1. **Implement caching for frequently accessed data**
   - Organization settings
   - Staff configurations
   - Menu exclusions

2. **Add database indices for common query patterns**
   - Composite indices for multi-field queries
   - Covering indices for projection queries

3. **Batch processing for bulk operations**
   - Reservation status updates
   - Stock management operations

4. **Consider denormalization for read-heavy operations**
   - Pre-computed availability slots
   - Aggregated statistics

## Monitoring Recommendations

1. Track query performance metrics in Convex dashboard
2. Monitor function execution times
3. Set up alerts for slow queries (>100ms)
4. Regular performance audits of new query implementations