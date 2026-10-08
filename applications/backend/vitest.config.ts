import { BackendTestPolicy } from './tests/fixtures/backend-test-policy.js';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    maxWorkers: BackendTestPolicy.MaximumWorkers,
    testTimeout: BackendTestPolicy.TimeoutMilliseconds,
    hookTimeout: BackendTestPolicy.TimeoutMilliseconds,
  },
});
