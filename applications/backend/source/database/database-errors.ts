import { Prisma } from '../../generated/prisma/client.js';
import { DatabaseErrorCode } from './database-types.js';

export const DatabaseErrors = {
  isUnavailable(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === DatabaseErrorCode.OperationTimeout
    );
  },

  isUniqueConstraint(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === DatabaseErrorCode.UniqueConstraint
    );
  },
} as const;
