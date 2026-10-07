import { Prisma } from '../../generated/prisma/client.js';

export const DatabaseErrorFixture = {
  withCode(readCode: () => string): Error {
    const error = new Prisma.PrismaClientKnownRequestError('Database operation failed.', {
      code: 'P1008',
      clientVersion: 'test',
    });
    Object.defineProperty(error, 'code', { get: readCode });

    return error;
  },
} as const;
