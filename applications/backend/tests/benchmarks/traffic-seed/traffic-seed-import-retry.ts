import { LibsqlError } from '@libsql/client';
import { setTimeout } from 'node:timers/promises';
import { TrafficSeedImportPolicy } from './traffic-seed-import-policy.js';
import { Prisma } from '../../../generated/prisma/client.js';

const SeedRetryFailure = {
  isTransient(error: unknown): boolean {
    if (error instanceof LibsqlError) {
      return (
        error.code === TrafficSeedImportPolicy.RetryableTransactionCode ||
        (error.code === TrafficSeedImportPolicy.RetryableIdleCode &&
          error.message === TrafficSeedImportPolicy.RetryableIdleMessage) ||
        (error.code === TrafficSeedImportPolicy.RetryableSessionConstraintCode &&
          error.message === TrafficSeedImportPolicy.RetryableSessionConstraintMessage)
      );
    }

    if (error instanceof DOMException) {
      return (
        error.name === TrafficSeedImportPolicy.RetryableTimeoutName &&
        String(error.code) === TrafficSeedImportPolicy.RetryableAbortCode &&
        error.message === TrafficSeedImportPolicy.RetryableAbortMessageSuffix
      );
    }

    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    const code = String(error.code);

    return (
      (code === TrafficSeedImportPolicy.RetryableAbortCode &&
        error.message.endsWith(TrafficSeedImportPolicy.RetryableAbortMessageSuffix)) ||
      (code === TrafficSeedImportPolicy.RetryableWrappedTransactionCode &&
        (error.message.endsWith(TrafficSeedImportPolicy.RetryableWrappedTransactionMessageSuffix) ||
          error.message.endsWith(TrafficSeedImportPolicy.RetryableWrappedIdleMessageSuffix)))
    );
  },
} as const;

export const TrafficSeedImportRetry = {
  async run<Result>(operation: () => Promise<Result>): Promise<Result> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (
          !SeedRetryFailure.isTransient(error) ||
          attempt >= TrafficSeedImportPolicy.TransactionAttempts
        ) {
          throw error;
        }

        // Retry the complete batch, including exact-content deduplication. The previous
        // commit may have succeeded even when its acknowledgement was lost.
        await setTimeout(TrafficSeedImportPolicy.TransactionRetryDelayMilliseconds * attempt);
      }
    }
  },
} as const;
