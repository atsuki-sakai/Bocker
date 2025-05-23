import { describe, it, expect, beforeEach, vi } from 'vitest';
import { t, RpcApi } from '../setupUnit'; // Use t and RpcApi from setupUnit
import { validateStringLength } from '@/convex/utils/validations'; // Keep this mock

// Mock dependencies
vi.mock('@/convex/utils/validations', () => ({
  validateStringLength: vi.fn(),
}));

describe('Tenant Queries', () => {
  // 't' is now available from setupUnit

  beforeEach(() => {
    // t is initialized by setupUnit's beforeEach.
    // vi.clearAllMocks() is also called in setupUnit's beforeEach.
    // Calling it again here ensures mocks are cleared specifically for this test suite's context,
    // which can be useful if setupUnit's clearAllMocks is too broad or if other suites
    // might interact. It's generally safe.
    vi.clearAllMocks();

    const mockTenant = { 
      _id: 'tenant123' as any, // Assuming Id type might need casting for tests
      user_id: 'user123', 
      user_email: 'test@example.com', 
      is_archive: false 
    };

    // Ensure t.db.get is a Vitest mock function if not already by setupUnit
    // (convex-test might not make t.db.* methods mock functions by default)
    if (!vi.isMockFunction(t.db.get)) {
      t.db.get = vi.fn();
    }
    (t.db.get as vi.Mock).mockImplementation(async (id: string) => {
      if (id === 'tenant123') return mockTenant;
      return null;
    });

    // Ensure t.db.query is a Vitest mock function
    if (!vi.isMockFunction(t.db.query)) {
      t.db.query = vi.fn();
    }
    const mockQueryChain = {
      withIndex: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      first: vi.fn(),
    };
    (t.db.query as vi.Mock).mockReturnValue(mockQueryChain);
    
    // Simplified generic mock for .first()
    // Specific tests might override this or set more specific conditions
    (mockQueryChain.first as vi.Mock).mockImplementation(async () => {
        const eqMock = mockQueryChain.eq as vi.Mock;
        if (eqMock.mock.calls.length > 0) {
            // Get the arguments from the last call to eq()
            const lastEqCallArgs = eqMock.mock.calls[eqMock.mock.calls.length - 1];
            const valuePassedToEq = lastEqCallArgs[1]; // Second argument to eq (the value)
            
            if (valuePassedToEq === 'user123' || valuePassedToEq === 'stripe_cust_123') {
                return mockTenant;
            }
        }
        return null; // Default to null if no matching conditions
    });
  });

  describe('findById', () => {
    it('should return a tenant if found', async () => {
      const args = { id: 'tenant123' as any };
      const result = await t.query(RpcApi["tenant/query"].findById, args);
      expect(t.db.get).toHaveBeenCalledWith(args.id);
      expect(result).toEqual(expect.objectContaining({ _id: 'tenant123' }));
    });

    it('should return null if tenant not found', async () => {
      const args = { id: 'nonexistent_id' as any };
      // More specific mock for this test case if the generic one is not sufficient
      (t.db.get as vi.Mock).mockResolvedValueOnce(null); 
      const result = await t.query(RpcApi["tenant/query"].findById, args);
      expect(t.db.get).toHaveBeenCalledWith(args.id);
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should call validateStringLength and return a tenant if found', async () => {
      const args = { user_id: 'user123' };
      const expectedTenant = { _id: 'tenant123' as any, user_id: 'user123', is_archive: false, user_email: 'test@example.com' };
      
      // Mock specific chain for this test
      // Ensure the mock for 'first' is set up for the specific query chain
      const mockFirst = vi.fn().mockResolvedValueOnce(expectedTenant);
      const mockEq = vi.fn().mockReturnValue({ first: mockFirst });
      const mockWithIndex = vi.fn().mockReturnValue({ eq: mockEq });
      // If t.db.query is already a mock, we adjust its behavior for this call path
      (t.db.query as vi.Mock).mockImplementation((tableName: string) => {
        if (tableName === 'tenant') {
          return {
            withIndex: mockWithIndex,
          };
        }
        return { withIndex: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), first: vi.fn() }; // Default for other tables
      });

      const result = await t.query(RpcApi["tenant/query"].findByUserId, args);
      
      expect(validateStringLength).toHaveBeenCalledWith(args.user_id, 'user_id');
      expect(t.db.query).toHaveBeenCalledWith('tenant');
      expect(mockWithIndex).toHaveBeenCalledWith('by_user_archive'); // Adjust index name if different
      expect(mockEq).toHaveBeenCalledWith('user_id', args.user_id); // Adjust field name if different
      expect(mockFirst).toHaveBeenCalled();
      expect(result).toEqual(expectedTenant);
    });

    it('should return null if tenant not found by user_id', async () => {
      const args = { user_id: 'nonexistent_user' };
      
      const mockFirst = vi.fn().mockResolvedValueOnce(null);
      const mockEq = vi.fn().mockReturnValue({ first: mockFirst });
      const mockWithIndex = vi.fn().mockReturnValue({ eq: mockEq });
      (t.db.query as vi.Mock).mockImplementation((tableName: string) => {
        if (tableName === 'tenant') return { withIndex: mockWithIndex };
        return { withIndex: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), first: vi.fn() };
      });

      const result = await t.query(RpcApi["tenant/query"].findByUserId, args);
      expect(validateStringLength).toHaveBeenCalledWith(args.user_id, 'user_id');
      expect(result).toBeNull();
    });
  });

  describe('findByStripeCustomerId', () => {
    it('should call validateStringLength and return a tenant if found', async () => {
      const args = { stripe_customer_id: 'stripe_cust_123' };
      const expectedTenant = { _id: 'tenant123' as any, stripe_customer_id: 'stripe_cust_123', is_archive: false, user_email: 'test@example.com', user_id: 'user123' };
      
      const mockFirst = vi.fn().mockResolvedValueOnce(expectedTenant);
      const mockEq = vi.fn().mockReturnValue({ first: mockFirst });
      const mockWithIndex = vi.fn().mockReturnValue({ eq: mockEq });
      (t.db.query as vi.Mock).mockImplementation((tableName: string) => {
        if (tableName === 'tenant') return { withIndex: mockWithIndex };
        return { withIndex: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), first: vi.fn() };
      });
      
      const result = await t.query(RpcApi["tenant/query"].findByStripeCustomerId, args);

      expect(validateStringLength).toHaveBeenCalledWith(args.stripe_customer_id, 'stripe_customer_id');
      expect(t.db.query).toHaveBeenCalledWith('tenant');
      expect(mockWithIndex).toHaveBeenCalledWith('by_stripe_customer_archive'); // Adjust index name
      expect(mockEq).toHaveBeenCalledWith('stripe_customer_id', args.stripe_customer_id); // Adjust field name
      expect(mockFirst).toHaveBeenCalled();
      expect(result).toEqual(expectedTenant);
    });

    it('should return null if tenant not found by stripe_customer_id', async () => {
      const args = { stripe_customer_id: 'nonexistent_stripe_id' };

      const mockFirst = vi.fn().mockResolvedValueOnce(null);
      const mockEq = vi.fn().mockReturnValue({ first: mockFirst });
      const mockWithIndex = vi.fn().mockReturnValue({ eq: mockEq });
      (t.db.query as vi.Mock).mockImplementation((tableName: string) => {
        if (tableName === 'tenant') return { withIndex: mockWithIndex };
        return { withIndex: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), first: vi.fn() };
      });

      const result = await t.query(RpcApi["tenant/query"].findByStripeCustomerId, args);
      expect(validateStringLength).toHaveBeenCalledWith(args.stripe_customer_id, 'stripe_customer_id');
      expect(result).toBeNull();
    });
  });
});
