import { ConvexTestingHelper } from 'convex-test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '@/convex/_generated/api';
import { create, upsert, archive } from '@/convex/tenant/mutation'; // Using alias path
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
  let t: ConvexTestingHelper<typeof api>;

  beforeEach(() => {
    t = new ConvexTestingHelper(api);
    vi.clearAllMocks(); // Clear mocks before each test
  });

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

      const result = await t.run(create, args);

      expect(validateStringLength).toHaveBeenCalledWith(args.user_id, 'user_id');
      expect(validateStringLength).toHaveBeenCalledWith(args.user_email, 'user_email');
      expect(validateStringLength).toHaveBeenCalledWith(args.stripe_customer_id, 'stripe_customer_id');
      // ... add checks for all validated fields
      expect(createRecord).toHaveBeenCalledWith(expect.anything(), 'tenant', args);
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
      await t.run(upsert, baseArgs);
      expect(checkAuth).toHaveBeenCalled();
      expect(validateStringLength).toHaveBeenCalledWith(baseArgs.user_id, 'user_id');
      expect(validateStringLength).toHaveBeenCalledWith(baseArgs.user_email, 'user_email');
      expect(validateStringLength).toHaveBeenCalledWith(baseArgs.stripe_customer_id, 'stripe_customer_id');
    });

    it('should call createRecord if tenant does not exist', async () => {
      t.db.query('tenant').withIndex('by_user_archive').returnsOnce([]); // Mock no existing record
      (createRecord as vi.Mock).mockResolvedValue({ _id: 'new_tenant_id', ...baseArgs });
      
      const result = await t.run(upsert, baseArgs);

      expect(createRecord).toHaveBeenCalledWith(expect.anything(), 'tenant', baseArgs);
      expect(updateRecord).not.toHaveBeenCalled();
      expect(result).toEqual({ _id: 'new_tenant_id', ...baseArgs });
    });

    it('should call updateRecord if tenant exists', async () => {
      const existingTenant = { _id: 'existing_tenant_id', ...baseArgs, is_archive: false };
      t.db.query('tenant').withIndex('by_user_archive').returnsOnce([existingTenant]); // Mock existing record
      (updateRecord as vi.Mock).mockResolvedValue({ ...existingTenant, user_email: 'updated@example.com' });

      const updatedArgs = { ...baseArgs, user_email: 'updated@example.com' };
      const result = await t.run(upsert, updatedArgs);

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

      await t.run(archive, args);

      expect(checkAuth).toHaveBeenCalled();
      expect(archiveRecord).toHaveBeenCalledWith(expect.anything(), args.tenant_id);
    });
  });
});
