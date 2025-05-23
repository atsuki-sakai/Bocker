import { ConvexHttpClient } from 'convex/browser';
import { exec } from 'child_process';
import { promisify } from 'util';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { api } from '@/convex/_generated/api'; // Assuming this is the correct path

const execAsync = promisify(exec);

// URL of your Convex deployment, typically from an environment variable
const convexUrl = process.env.CONVEX_URL || 'http://localhost:8765'; // Default to a common local dev URL

export const client = new ConvexHttpClient(convexUrl);

let convexProcess: any; // To store the child process instance

beforeAll(async () => {
  try {
    console.log('Starting Convex dev server for E2E tests...');
    // Start npx convex dev. Adjust command if your project uses a different package manager or script
    convexProcess = exec('npx convex dev --once'); // --once might be useful if it runs migrations and then exits or stays running

    convexProcess.stdout?.on('data', (data: any) => {
      console.log(`Convex dev stdout: ${data}`);
      // You might want to look for a specific message indicating the server is ready
    });

    convexProcess.stderr?.on('data', (data: any) => {
      console.error(`Convex dev stderr: ${data}`);
    });

    // Wait for a bit for the server to start.
    // A more robust solution would be to poll an endpoint or check logs.
    await new Promise(resolve => setTimeout(resolve, 10000)); // Adjust timeout as needed
    console.log('Convex dev server should be running.');
  } catch (error) {
    console.error('Failed to start Convex dev server:', error);
    // Optionally, throw the error to fail the test suite if the server can't start
    // throw error; 
  }
});

afterAll(async () => {
  if (convexProcess) {
    console.log('Stopping Convex dev server...');
    convexProcess.kill('SIGINT'); // Send SIGINT to gracefully shut down
    // You might need to use SIGKILL if SIGINT doesn't work: convexProcess.kill('SIGKILL');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Give it time to shut down
    console.log('Convex dev server stopped.');
  }
});

beforeEach(async () => {
  try {
    // Example: Call a Convex action to clear database tables.
    // Replace 'clearAllTables' with the actual name of your cleanup action.
    // Ensure this action exists in your Convex backend.
    // await client.action(api.database.clearAllTables, {}); 
    console.log('Clearing database for new E2E test...');
    // If you don't have a specific action, you might need to manually delete data
    // or ensure your tests are idempotent / clean up after themselves.
    // For now, we'll just log a message.
  } catch (error) {
    console.error('Error clearing database for E2E test:', error);
    // Depending on your strategy, you might want to fail tests if cleanup fails
  }
});

// Note:
// 1. The CONVEX_URL should ideally be configurable via environment variables,
//    especially for CI environments.
// 2. The database clearing mechanism (`clearAllTables` action) is an example.
//    You need to implement such an action in your `convex/` directory or use another
//    strategy for ensuring a clean state (e.g., specific cleanup mutations per test).
// 3. Starting/stopping `npx convex dev` programmatically can be flaky.
//    Consider running Convex separately and pointing tests to it,
//    or using Docker if your setup becomes complex.
// 4. Ensure `child_process` is available in your test environment.
//    If running in a restricted environment (like some CI sandboxes), this might not work.
