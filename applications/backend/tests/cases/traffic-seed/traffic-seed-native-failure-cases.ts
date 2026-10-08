import { LibsqlError } from '@libsql/client';
import { TrafficSeedRetryFixture } from '../../fixtures/traffic-seed-retry-fixture.js';

export const TrafficSeedNonRetryableNativeCases = [
  {
    name: 'plain session uniqueness lookalike',
    create() {
      return { code: 'SQLITE_CONSTRAINT', message: TrafficSeedRetryFixture.lateCommit().message };
    },
  },
  {
    name: 'another unique column',
    create() {
      return new LibsqlError(
        'SQLITE_CONSTRAINT: SQLite error: UNIQUE constraint failed: Event.identifier',
        'SQLITE_CONSTRAINT',
      );
    },
  },

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

export const TrafficSeedLateCommitCases = [
  { name: 'identical committed history', conflict: false },
  { name: 'conflicting committed history', conflict: true },
] as const;
