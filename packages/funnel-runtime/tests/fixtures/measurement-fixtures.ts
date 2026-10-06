import { vi } from 'vitest';
import type { BenchmarkCase } from '../benchmarks/benchmark-types.js';

export const MeasurementFixtures = {
  scenario(overrides: Partial<BenchmarkCase> = {}): BenchmarkCase {
    return {
      name: 'measurement.fixture',
      size: 1,
      iterations: 1,
      run: vi.fn(() => 0),
      verify: vi.fn(),
      ...overrides,
    };
  },
} as const;
