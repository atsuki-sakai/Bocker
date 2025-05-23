import { ConvexTestingHelper } from 'convex-test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '@/convex/_generated/api';
import { findById, findByUserId, findByStripeCustomerId } from '@/convex/tenant/query'; // Adjust path as necessary
import { validateStringLength } from '@/convex/utils/validations';

// Mock dependencies
vi.mock('@/convex/utils/validations', () => ({
  validateStringLength: vi.fn(),
}));

describe('Tenant Queries', () => {
  let t: ConvexTestingHelper<typeof api>;

  beforeEach(() => {
    t = new ConvexTestingHelper(api);
    vi.clearAllMocks(); // Clear mocks before each test

    // Setup mock database responses.
    // Note: The exact API for mocking with convex-test might involve
    // t.stubQuery(api.myFunctions.myQuery, returnValue) or similar.
    // The .returnsOnce() or .mockReturnValue() approach is a general Vitest mocking pattern
    // that needs to be adapted to how `convex-test` expects db interactions to be mocked.
    // For now, we assume direct mocking of db methods if t.db is accessible and mockable.
    // If `convex-test` wraps db access in a way that these direct mocks don't work,
    // this will need adjustment based on `convex-test` documentation.

    // Mock for findById
    const mockTenant = { 
      _id: 'tenant123', 
      user_id: 'user123', 
      user_email: 'test@example.com', 
      is_archive: false 
    };
    t.db.get = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'tenant123') {
        return mockTenant;
      }
      return null;
    });

    // Mock for findByUserId and findByStripeCustomerId
    // These use query().withIndex().eq().first()
    // We'll mock the behavior of first() based on the query conditions.
    const mockQuery = {
      withIndex: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      first: vi.fn(),
    };
    t.db.query = vi.fn().mockReturnValue(mockQuery as any);

    // Setup specific mock returns for different queries if needed within tests,
    // or provide a generic one here.
    // For findByUserId:
    (mockQuery.first as vi.Mock).mockImplementation(async () => {
      // This is a simplified mock. In a real scenario, you might inspect
      // the 'eq' calls to differentiate between findByUserId and findByStripeCustomerId.
      // For this example, let's assume it returns mockTenant if the user_id matches.
      // This part will likely need refinement based on how `eq` calls are made.
      const queryMatcher = (t.db.query as vi.Mock).mock.calls[0][0]; // 'tenant'
      const indexMatcher = (mockQuery.withIndex as vi.Mock).mock.calls[0][0]; // 'by_user_archive' or 'by_stripe_customer_archive'
      const valueMatcher = (mockQuery.eq as vi.Mock).mock.calls[0][1]; // the actual id or stripe_id

      if (indexMatcher === 'by_user_archive' && valueMatcher === 'user123') {
        return mockTenant;
      }
      if (indexMatcher === 'by_stripe_customer_archive' && valueMatcher === 'stripe_cust_123') {
        return mockTenant;
      }
      return null;
    });
  });

  // Tests for 'findById' query
  describe('findById', () => {
    it('should return a tenant if found', async () => {
      const args = { id: 'tenant123' as any }; // Cast if Id type needs it
      const result = await t.run(findById, args);
      expect(t.db.get).toHaveBeenCalledWith(args.id);
      expect(result).toEqual(expect.objectContaining({ _id: 'tenant123' }));
    });

    it('should return null if tenant not found', async () => {
      const args = { id: 'nonexistent_id' as any };
      const result = await t.run(findById, args);
      expect(t.db.get).toHaveBeenCalledWith(args.id);
      expect(result).toBeNull();
    });
  });

  // Tests for 'findByUserId' query
  describe('findByUserId', () => {
    it('should call validateStringLength and return a tenant if found', async () => {
      const args = { user_id: 'user123' };
      // Reset and re-configure mock for this specific test if necessary for clarity
      (t.db.query('tenant').withIndex('by_user_archive').eq('user_id', args.user_id) as any).first.mockResolvedValueOnce({ _id: 'tenant123', ...args });


      const result = await t.run(findByUserId, args);
      
      expect(validateStringLength).toHaveBeenCalledWith(args.user_id, 'user_id');
      // expect(t.db.query).toHaveBeenCalledWith('tenant');
      // expect((t.db.query as any)().withIndex).toHaveBeenCalledWith('by_user_archive', expect.any(Function));
      // More detailed assertions on the query chain can be added if needed
      expect(result).toEqual(expect.objectContaining({ user_id: 'user123' }));
    });

    it('should return null if tenant not found by user_id', async () => {
      const args = { user_id: 'nonexistent_user' };
       (t.db.query('tenant').withIndex('by_user_archive').eq('user_id', args.user_id) as any).first.mockResolvedValueOnce(null);

      const result = await t.run(findByUserId, args);
      expect(validateStringLength).toHaveBeenCalledWith(args.user_id, 'user_id');
      expect(result).toBeNull();
    });
  });

  // Tests for 'findByStripeCustomerId' query
  describe('findByStripeCustomerId', () => {
    it('should call validateStringLength and return a tenant if found', async () => {
      const args = { stripe_customer_id: 'stripe_cust_123' };
      (t.db.query('tenant').withIndex('by_stripe_customer_archive').eq('stripe_customer_id', args.stripe_customer_id) as any).first.mockResolvedValueOnce({ _id: 'tenant123', ...args });

      const result = await t.run(findByStripeCustomerId, args);

      expect(validateStringLength).toHaveBeenCalledWith(args.stripe_customer_id, 'stripe_customer_id');
      expect(result).toEqual(expect.objectContaining({ stripe_customer_id: 'stripe_cust_123' }));
    });

    it('should return null if tenant not found by stripe_customer_id', async () => {
      const args = { stripe_customer_id: 'nonexistent_stripe_id' };
      (t.db.query('tenant').withIndex('by_stripe_customer_archive').eq('stripe_customer_id', args.stripe_customer_id) as any).first.mockResolvedValueOnce(null);

      const result = await t.run(findByStripeCustomerId, args);
      expect(validateStringLength).toHaveBeenCalledWith(args.stripe_customer_id, 'stripe_customer_id');
      expect(result).toBeNull();
    });
  });
});
