import { ConvexTestingHelper } from 'convex-test';
import { beforeEach, vi } from 'vitest';
import { api } from '@/convex/_generated/api'; // Assuming this is the correct path to your API type definitions

// Mock Convex client
let t: ConvexTestingHelper<typeof api>;

beforeEach(() => {
  t = new ConvexTestingHelper(api);
  // Optional: If you need to mock specific Convex functions or modules, do it here.
  // For example, mocking auth:
  // vi.mock('@/convex/utils/auth', () => ({
  //   checkAuth: vi.fn().mockResolvedValue({ user: { id: 'test_user_id' } }) // Adjust mock as needed
  // }));

  // Optional: Clear any other mocks or reset states if necessary
  vi.clearAllMocks();
});

// Export the testing helper instance if you need to use it directly in tests,
// though often it's used implicitly or through specific test utilities.
export { t };
