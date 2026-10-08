import { LibsqlError } from '@libsql/client';
import { TrafficSeedRetryFixture } from '../../fixtures/traffic-seed-retry-fixture.js';

export const TrafficSeedNonRetryableNativeCases = [
  {
    name: 'manual cancellation',
    create() {
      return new DOMException('The operation was aborted due to timeout', 'AbortError');
    },
  },
  {
    name: 'different timeout text',
    create() {
      return new DOMException('A different timeout', 'TimeoutError');
    },
  },
  {
    name: 'plain timeout lookalike',
    create() {
      return {
        name: 'TimeoutError',
        code: 23,
        message: 'The operation was aborted due to timeout',
      };
    },
  },
  {
    name: 'ordinary busy failure',
    create() {
      return new LibsqlError('database is locked', 'SQLITE_BUSY');
    },
  },
  {
    name: 'unrelated Prisma busy wrapper',
    create() {
      return TrafficSeedRetryFixture.aborted(
        'P2039',
        'Database error. Code: `N/A`. Message: `SQLITE_BUSY: database is locked`',
      );
    },
  },
] as const;

export const TrafficSeedIdleCases = [
  { name: 'libSQL driver', prisma: false },
  { name: 'Prisma wrapper', prisma: true },
] as const;
