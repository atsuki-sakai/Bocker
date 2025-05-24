import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths'; // To resolve path aliases like @/

export default defineConfig({
  plugins: [
    tsconfigPaths(), // Add this plugin to resolve TypeScript path aliases
  ],
  test: {
    globals: true, // Use global APIs (describe, it, expect, etc.)
    environment: 'node', // Or 'jsdom' if you need browser APIs for some unit tests
    setupFiles: ['./tests/unit/setupUnit.ts'], // Global setup for unit tests
    include: ['tests/unit/**/*.test.ts'], // Pattern for unit test files
    // E2E tests might need a different setup or environment,
    // or can be run as a separate Vitest project/config if complexity grows.
    // For now, we'll rely on the --run tests/e2e flag in the npm script for E2E.
    // Alternatively, you can define separate named configurations here.

    // Optional: Configure coverage
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['convex/**/*.ts'], // Specify files to include in coverage
      exclude: [ // Specify files/patterns to exclude from coverage
        'convex/_generated/**',
        'convex/**/types.ts', // Example: exclude type definition files
        'tests/**',
        '**/*.config.ts',
        '**/*.config.mts',
      ],
    },

    // Optional: If E2E tests require a different environment or longer timeouts
    // You could define a separate "e2e" test configuration within this file
    // or use a separate vitest.config.e2e.mts file.
    // For simplicity, this config primarily targets unit tests, and E2E specifics
    // are handled by the script `vitest --run tests/e2e`.
    // If `child_process` or other Node.js specific features in E2E setup cause issues,
    // ensure the environment is 'node'.
  },
});
