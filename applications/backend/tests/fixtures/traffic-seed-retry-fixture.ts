import { LibsqlError } from '@libsql/client';
import { Prisma } from '../../generated/prisma/client.js';

export const TrafficSeedRetryFixture = {
  aborted(
    code: TextOrNumber = '23',
    message = 'The operation was aborted due to timeout',
  ): Prisma.PrismaClientKnownRequestError {
    const error = new Prisma.PrismaClientKnownRequestError(message, {
      code: String(code),
      clientVersion: 'test',
    });
    // The libSQL boundary has also supplied a numeric code despite Prisma's declared string type.
    Object.defineProperty(error, 'code', { value: code });

    return error;
  },

  closed(): LibsqlError {
    return new LibsqlError('Injected transaction closure', 'TRANSACTION_CLOSED');
  },
} as const;
