import { attempt } from 'es-toolkit/util';
import { Prisma } from '../../generated/prisma/client.js';
import { DatabaseErrorCode } from './database-types.js';
import type { DatabaseFailureDescription } from './database-types.js';
import { LibsqlError } from '@libsql/client';
import { DatabaseFailureKind, DatabaseFailurePolicy } from './database-failure-policy.js';

const DatabaseFailureDescriptions = {
  transport(code: string, message: string): Optional<DatabaseFailureDescription> {
    if (
      code === DatabaseFailurePolicy.AbortCode &&
      DatabaseFailurePolicy.TimeoutMessages.some((suffix) => message.endsWith(suffix))
    ) {
      return { kind: DatabaseFailureKind.TransportTimeout, code, unavailable: true };
    }

    if (
      (code === DatabaseFailurePolicy.ClosedCode &&
        message === DatabaseFailurePolicy.ClosedMessage) ||
      (code === DatabaseFailurePolicy.IdleCode && message === DatabaseFailurePolicy.IdleMessage) ||
      (code === DatabaseFailurePolicy.WrappedTransportCode &&
        [DatabaseFailurePolicy.ClosedMessage, DatabaseFailurePolicy.IdleMessage].some((suffix) =>
          message.endsWith(`Database error. Code: \`N/A\`. Message: \`${suffix}\``),
        ))
    ) {
      return { kind: DatabaseFailureKind.TransportClosed, code, unavailable: true };
    }

    return undefined;
  },

  read(error: unknown): Optional<DatabaseFailureDescription> {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const code = String(error.code);

      if (code === DatabaseErrorCode.OperationTimeout) {
        return { kind: DatabaseFailureKind.OperationTimeout, code, unavailable: true };
      }

      const message = error.message;

      if (code === DatabaseFailurePolicy.TransactionCode) {
        if (message.endsWith(DatabaseFailurePolicy.AcquisitionSuffix)) {
          return {
            kind: DatabaseFailureKind.TransactionAcquisitionTimeout,
            code,
            unavailable: true,
          };
        }

        if (DatabaseFailurePolicy.ExpiredPattern.test(message)) {
          return { kind: DatabaseFailureKind.TransactionExpired, code, unavailable: true };
        }

        return { kind: DatabaseFailureKind.TransactionFailure, code, unavailable: false };
      }

      return DatabaseFailureDescriptions.transport(code, message);
    }

    if (error instanceof LibsqlError) {
      return DatabaseFailureDescriptions.transport(error.code, error.message);
    }

    if (
      error instanceof DOMException &&
      error.name === DatabaseFailurePolicy.NativeTimeoutName &&
      String(error.code) === DatabaseFailurePolicy.AbortCode &&
      DatabaseFailurePolicy.TimeoutMessages.some((message) => message === error.message)
    ) {
      return {
        kind: DatabaseFailureKind.TransportTimeout,
        code: DatabaseFailurePolicy.AbortCode,
        unavailable: true,
      };
    }

    return undefined;
  },
} as const;

const KnownDatabaseErrors = {
  matches(error: unknown, code: ValueOf<typeof DatabaseErrorCode>): boolean {
    const [, matches] = attempt(
      () => error instanceof Prisma.PrismaClientKnownRequestError && error.code === code,
    );

    return matches === true;
  },
} as const;

export const DatabaseErrors = {
  describe(error: unknown): Optional<DatabaseFailureDescription> {
    const [, description] = attempt(() => DatabaseFailureDescriptions.read(error));

    return description ?? undefined;
  },

  isUnavailable(error: unknown): boolean {
    return DatabaseErrors.describe(error)?.unavailable === true;
  },

  isUniqueConstraint(error: unknown): boolean {
    return KnownDatabaseErrors.matches(error, DatabaseErrorCode.UniqueConstraint);
  },
} as const;
