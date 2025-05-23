import { convexTest } from 'convex-test';
import { beforeEach, vi } from 'vitest';
import schema from '../../convex/schema'; // Adjusted path to schema
import { type ApiFromModules, type FunctionLocator } from 'convex/server'; // For typing 't' correctly
import { api as RpcApi } from '@/convex/_generated/api'; // Keep for potential specific API object use or type comparison

// Define a more precise type for 't' based on convexTest usage
// This is a generic way to get the type, specific to your project's api structure.
// If your `api` object from `@/convex/_generated/api` is already the fully typed one, you might use that.
// However, `convexTest` itself often infers this. For explicit typing:
type ConvexTestClient = ReturnType<typeof convexTest<typeof schema>>;

// Mock Convex client
let t: ConvexTestClient;

beforeEach(() => {
  t = convexTest(schema);
  // Optional: If you need to mock specific Convex functions or modules, do it here.
  // vi.mock('@/convex/utils/auth', () => ({
  //   checkAuth: vi.fn().mockResolvedValue({ user: { id: 'test_user_id' } })
  // }));
  vi.clearAllMocks();
});

export { t, RpcApi }; // Export RpcApi as well if it's used by tests directly
