import { attempt } from 'es-toolkit/util';
import { Prisma } from '../../generated/prisma/client.js';
import { DatabaseErrorCode } from './database-types.js';

const KnownDatabaseErrors = {
  matches(error: unknown, code: ValueOf<typeof DatabaseErrorCode>): boolean {
    const [, matches] = attempt(
      () => error instanceof Prisma.PrismaClientKnownRequestError && error.code === code,
    );

    return matches === true;
  },
} as const;

export const DatabaseErrors = {
  isUnavailable(error: unknown): boolean {
    return KnownDatabaseErrors.matches(error, DatabaseErrorCode.OperationTimeout);
  },

  isUniqueConstraint(error: unknown): boolean {
    return KnownDatabaseErrors.matches(error, DatabaseErrorCode.UniqueConstraint);
  },
} as const;
