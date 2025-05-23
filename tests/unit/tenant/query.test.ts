import { describe, it, expect, vi } from 'vitest'; // Removed beforeEach from here
import { t, RpcApi } from '../setupUnit';
import { validateStringLength } from '@/convex/utils/validations';

vi.mock('@/convex/utils/validations', () => ({
  validateStringLength: vi.fn(),
}));

describe('Tenant Queries', () => {
  // The beforeEach block that was here (containing only vi.clearAllMocks()) has been removed.
  // Mock clearing is handled by setupUnit.ts.

  describe('findById', () => {
    const mockTenant = { _id: 'tenant123' as any, user_id: 'user123', is_archive: false, user_email: 'test@example.com' };
    const argsFound = { id: 'tenant123' as any };
    const argsNotFound = { id: 'nonexistent_id' as any };

    it('should return a tenant if found', async () => {
      t.db.get(argsFound.id).returnsOnce(mockTenant);

      const result = await t.query(RpcApi["tenant/query"].findById, argsFound);
      expect(result).toEqual(mockTenant);
    });

    it('should return null if tenant not found', async () => {
      t.db.get(argsNotFound.id).returnsOnce(null);

      const result = await t.query(RpcApi["tenant/query"].findById, argsNotFound);
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    const userId = 'user123';
    const mockTenant = { _id: 'tenant123' as any, user_id: userId, is_archive: false, user_email: 'test@example.com' }; 
    const argsFound = { user_id: userId };
    const argsNotFound = { user_id: 'nonexistent_user' };

    it('should call validateStringLength and return a tenant if found', async () => {
      t.db.query('tenant')
        .withIndex('by_user_archive', q => q.eq('user_id', userId).eq('is_archive', false))
        .returnsOnce(mockTenant);

      const result = await t.query(RpcApi["tenant/query"].findByUserId, argsFound);
      
      expect(validateStringLength).toHaveBeenCalledWith(userId, 'user_id');
      expect(result).toEqual(mockTenant);
    });

    it('should return null if tenant not found by user_id', async () => {
      t.db.query('tenant')
        .withIndex('by_user_archive', q => q.eq('user_id', argsNotFound.user_id).eq('is_archive', false))
        .returnsOnce(null);

      const result = await t.query(RpcApi["tenant/query"].findByUserId, argsNotFound);
      expect(validateStringLength).toHaveBeenCalledWith(argsNotFound.user_id, 'user_id');
      expect(result).toBeNull();
    });
  });

  describe('findByStripeCustomerId', () => {
    const stripeCustomerId = 'stripe_cust_123';
    const mockTenant = { _id: 'tenant123' as any, stripe_customer_id: stripeCustomerId, is_archive: false, user_id: 'user123', user_email: 'test@example.com' }; 
    const argsFound = { stripe_customer_id: stripeCustomerId };
    const argsNotFound = { stripe_customer_id: 'nonexistent_stripe_id' };

    it('should call validateStringLength and return a tenant if found', async () => {
      t.db.query('tenant')
        .withIndex('by_stripe_customer_archive', q => q.eq('stripe_customer_id', stripeCustomerId).eq('is_archive', false))
        .returnsOnce(mockTenant);
        
      const result = await t.query(RpcApi["tenant/query"].findByStripeCustomerId, argsFound);

      expect(validateStringLength).toHaveBeenCalledWith(stripeCustomerId, 'stripe_customer_id');
      expect(result).toEqual(mockTenant);
    });

    it('should return null if tenant not found by stripe_customer_id', async () => {
      t.db.query('tenant')
        .withIndex('by_stripe_customer_archive', q => q.eq('stripe_customer_id', argsNotFound.stripe_customer_id).eq('is_archive', false))
        .returnsOnce(null);

      const result = await t.query(RpcApi["tenant/query"].findByStripeCustomerId, argsNotFound);
      expect(validateStringLength).toHaveBeenCalledWith(argsNotFound.stripe_customer_id, 'stripe_customer_id');
      expect(result).toBeNull();
    });
  });
});
