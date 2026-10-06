import { BackendTestPolicy } from './tests/fixtures/backend-test-policy.js';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: BackendTestPolicy.timeoutMilliseconds,
    hookTimeout: BackendTestPolicy.timeoutMilliseconds,
  },
});
