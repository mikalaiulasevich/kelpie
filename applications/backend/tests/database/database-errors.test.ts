import { describe, expect, it } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { DatabaseErrors } from '../../source/database/database-errors.js';
import { DatabaseErrorCases } from '../cases/database-error-cases.js';

describe('database error classification', () => {
  it.each(DatabaseErrorCases.NonTransient)('does not classify $name as unavailable', ({ code }) => {
    const error = new Prisma.PrismaClientKnownRequestError('Database operation failed.', {
      code,
      clientVersion: 'test',
    });
    expect(DatabaseErrors.isUnavailable(error)).toBe(false);
  });

  it('does not trust arbitrary errors carrying a timeout code', () => {
    const error = Object.assign(new Error('Database operation failed.'), { code: 'P1008' });
    expect(DatabaseErrors.isUnavailable(error)).toBe(false);
    expect(DatabaseErrors.isUnavailable({ code: 'P1008' })).toBe(false);
  });
});
