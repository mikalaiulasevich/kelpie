import { describe, expect, it } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { DatabaseErrors } from '../../source/database/database-errors.js';
import { DatabaseErrorFixture } from '../fixtures/database-error-fixture.js';
import { DatabaseErrorCases } from '../cases/database-error-cases.js';
import { DatabaseFailureCases } from '../cases/database-failure-cases.js';

describe('database error classification', () => {
  it.each(DatabaseFailureCases.Transient)(
    'recognizes $name without exposing messages',
    ({ create, code }) => {
      const failure = DatabaseErrors.describe(create());
      expect(failure).toMatchObject({ code, unavailable: true });
      expect(DatabaseErrors.isUnavailable(create())).toBe(true);
      expect(JSON.stringify(failure)).not.toContain('private');
    },
  );

  it.each(DatabaseFailureCases.NonTransient)(
    'does not retry or classify $name as unavailable',
    ({ create }) => {
      expect(DatabaseErrors.isUnavailable(create())).toBe(false);
    },
  );

  it('contains throwing message accessors without touching the original stack', () => {
    const error = DatabaseErrorFixture.prisma('P2028', 'private');
    Object.defineProperty(error, 'message', {
      get() {
        throw new Error('private accessor');
      },
    });
    expect(DatabaseErrors.describe(error)).toBeUndefined();
    expect(DatabaseErrors.isUnavailable(error)).toBe(false);
  });

  it.each(DatabaseErrorCases.NonTransient)('does not classify $name as unavailable', ({ code }) => {
    const error = new Prisma.PrismaClientKnownRequestError('Database operation failed.', {
      code,
      clientVersion: 'test',
    });
    expect(DatabaseErrors.isUnavailable(error)).toBe(false);
  });

  it('contains a throwing code accessor on a known Prisma error', () => {
    const error = DatabaseErrorFixture.withCode(() => {
      throw new Error('Code getter failed.');
    });
    expect(DatabaseErrors.isUnavailable(error)).toBe(false);
    expect(DatabaseErrors.isUniqueConstraint(error)).toBe(false);
  });

  it('does not trust arbitrary errors carrying a timeout code', () => {
    const error = Object.assign(new Error('Database operation failed.'), { code: 'P1008' });
    expect(DatabaseErrors.isUnavailable(error)).toBe(false);
    expect(DatabaseErrors.isUnavailable({ code: 'P1008' })).toBe(false);
  });
});
