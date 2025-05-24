import { describe, it, expect, vi } from 'vitest'; // Removed beforeEach from here
import { t, RpcApi } from '../setupUnit'; // Use t and RpcApi from setupUnit
import { validateStringLength } from '@/convex/utils/validations';
import { checkAuth } from '@/convex/utils/auth';
import { createRecord, updateRecord, archiveRecord } from '@/convex/utils/helpers';

// Mock the dependencies
vi.mock('@/convex/utils/validations', () => ({
  validateStringLength: vi.fn(),
}));

vi.mock('@/convex/utils/auth', () => ({
  checkAuth: vi.fn(),
}));

vi.mock('@/convex/utils/helpers', () => ({
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  archiveRecord: vi.fn(),
}));

describe('Tenant Mutations', () => {
  // 't' is now available from setupUnit.ts
  // The beforeEach block that was here has been removed as it was empty of active code.

  // Tests for 'create' mutation
  describe('create', () => {
    it('should call validateStringLength for all string arguments and createRecord', async () => {
      const args = {
        user_id: 'user123',
        user_email: 'test@example.com',
        stripe_customer_id: 'stripe_cust_123',
        subscription_id: 'sub_123',
        subscription_status: 'active',
        plan_name: 'pro',
        price_id: 'price_123',
        billing_period: 'monthly' as any, // Cast if type requires specific enum
      };
      (createRecord as vi.Mock).mockResolvedValue({ _id: 'tenant_id_123', ...args });

      const result = await t.mutation(RpcApi["tenant/mutation"].create, args);

      expect(validateStringLength).toHaveBeenCalledWith(args.user_id, 'user_id');
      expect(validateStringLength).toHaveBeenCalledWith(args.user_email, 'user_email');
      expect(validateStringLength).toHaveBeenCalledWith(args.stripe_customer_id, 'stripe_customer_id');
      expect(validateStringLength).toHaveBeenCalledWith(args.subscription_id, 'subscription_id');
      expect(validateStringLength).toHaveBeenCalledWith(args.subscription_status, 'subscription_status');
      expect(validateStringLength).toHaveBeenCalledWith(args.plan_name, 'plan_name');
      expect(validateStringLength).toHaveBeenCalledWith(args.price_id, 'price_id');
      
      expect(createRecord).toHaveBeenCalledWith(expect.anything(), 'tenant', args); // expect.anything() for ctx
      expect(result).toEqual({ _id: 'tenant_id_123', ...args });
    });
  });

  // Tests for 'upsert' mutation
  describe('upsert', () => {
    const baseArgs = {
      user_id: 'user123',
      user_email: 'test@example.com',
      stripe_customer_id: 'stripe_cust_123',
    };

    it('should call checkAuth and validateStringLength', async () => {
      // Mock the db.query chain for the existence check within upsert
      t.db.query('tenant')
        .withIndex('by_user_archive', q => q.eq('user_id', baseArgs.user_id).eq('is_archive', false))
        .returnsOnce(null); // Or [] if your code expects an array from .collect() before .first()

      await t.mutation(RpcApi["tenant/mutation"].upsert, baseArgs);

      expect(checkAuth).toHaveBeenCalled();
      expect(validateStringLength).toHaveBeenCalledWith(baseArgs.user_id, 'user_id');
      expect(validateStringLength).toHaveBeenCalledWith(baseArgs.user_email, 'user_email');
      expect(validateStringLength).toHaveBeenCalledWith(baseArgs.stripe_customer_id, 'stripe_customer_id');
    });

    it('should call createRecord if tenant does not exist', async () => {
      // Mock the specific query for this test case
      t.db.query('tenant')
        .withIndex('by_user_archive', q => q.eq('user_id', baseArgs.user_id).eq('is_archive', false))
        .returnsOnce(null); // Simulate tenant not found
      
      (createRecord as vi.Mock).mockResolvedValue({ _id: 'new_tenant_id', ...baseArgs });
      
      const result = await t.mutation(RpcApi["tenant/mutation"].upsert, baseArgs);

      expect(createRecord).toHaveBeenCalledWith(expect.anything(), 'tenant', baseArgs);
      expect(updateRecord).not.toHaveBeenCalled();
      expect(result).toEqual({ _id: 'new_tenant_id', ...baseArgs });
    });

    it('should call updateRecord if tenant exists', async () => {
      const existingTenant = { _id: 'existing_tenant_id' as any, ...baseArgs, is_archive: false };
      // Mock the specific query for this test case
      t.db.query('tenant')
        .withIndex('by_user_archive', q => q.eq('user_id', baseArgs.user_id).eq('is_archive', false))
        .returnsOnce(existingTenant); // Simulate tenant found
        
      (updateRecord as vi.Mock).mockResolvedValue({ ...existingTenant, user_email: 'updated@example.com' });

      const updatedArgs = { ...baseArgs, user_email: 'updated@example.com' };
      const result = await t.mutation(RpcApi["tenant/mutation"].upsert, updatedArgs);

      expect(updateRecord).toHaveBeenCalledWith(expect.anything(), existingTenant._id, updatedArgs);
      expect(createRecord).not.toHaveBeenCalled();
      expect(result).toEqual({ ...existingTenant, user_email: 'updated@example.com' });
    });
  });

  // Tests for 'archive' mutation
  describe('archive', () => {
    it('should call checkAuth and archiveRecord', async () => {
      const args = { tenant_id: 'tenant_to_archive_id' as any }; // Cast if Id type needs it
      (archiveRecord as vi.Mock).mockResolvedValue(undefined); // archiveRecord might not return anything significant

      await t.mutation(RpcApi["tenant/mutation"].archive, args);

      expect(checkAuth).toHaveBeenCalled();
      expect(archiveRecord).toHaveBeenCalledWith(expect.anything(), args.tenant_id);
    });
  });
});
