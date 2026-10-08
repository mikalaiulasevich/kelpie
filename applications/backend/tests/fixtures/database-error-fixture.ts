import { Prisma } from '../../generated/prisma/client.js';
import { LibsqlError } from '@libsql/client';

export const DatabaseErrorFixture = {
  prisma(code: TextOrNumber, message: string): Error {
    const error = new Prisma.PrismaClientKnownRequestError(message, {
      code: String(code),
      clientVersion: 'test',
    });
    Object.defineProperty(error, 'code', { value: code });

    return error;
  },

  native(code: string, message: string): Error {
    return new LibsqlError(message, code);
  },

  timeout(message: string): Error {
    return new DOMException(message, 'TimeoutError');
  },

  withCode(readCode: () => string): Error {
    const error = new Prisma.PrismaClientKnownRequestError('Database operation failed.', {
      code: 'P1008',
      clientVersion: 'test',
    });
    Object.defineProperty(error, 'code', { get: readCode });

    return error;
  },
} as const;
