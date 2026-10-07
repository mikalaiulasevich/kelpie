import { Prisma } from '../../generated/prisma/client.js';
import { DatabaseErrorCode } from './database-types.js';

export const DatabaseErrors = {
  isUniqueConstraint(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === DatabaseErrorCode.UniqueConstraint
    );
  },
} as const;
