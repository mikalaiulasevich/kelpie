import { DatabaseErrorFixture } from '../fixtures/database-error-fixture.js';

export const DatabaseFailureCases = {
  Transient: [
    {
      name: 'Prisma operation timeout',
      code: 'P1008',
      category: 'database_operation_timeout',
      create: () => DatabaseErrorFixture.prisma('P1008', 'private-database-path'),
    },
    {
      name: 'expired Prisma query',
      code: 'P2028',
      category: 'database_transaction_expired',
      create: () =>
        DatabaseErrorFixture.prisma(
          'P2028',
          'private-query-header\nTransaction API error: A query cannot be executed on an expired transaction. The timeout for this transaction was 10000 ms, however 28172 ms passed since the start of the transaction. Consider increasing the interactive transaction timeout or doing less work in the transaction.',
        ),
    },
    {
      name: 'Prisma acquisition timeout',
      code: 'P2028',
      category: 'database_transaction_acquisition_timeout',
      create: () =>
        DatabaseErrorFixture.prisma(
          'P2028',
          'private-query-header\nTransaction API error: Unable to start a transaction in the given time.',
        ),
    },
    {
      name: 'numeric Prisma transport timeout',
      code: '23',
      category: 'database_transport_timeout',
      create: () =>
        DatabaseErrorFixture.prisma(
          23,
          'private-query-header\nThe operation was aborted due to timeout',
        ),
    },
    {
      name: 'string Prisma transport timeout',
      code: '23',
      category: 'database_transport_timeout',
      create: () =>
        DatabaseErrorFixture.prisma('23', 'private-query-header\nThe operation timed out.'),
    },
    {
      name: 'native Node transport timeout',
      code: '23',
      category: 'database_transport_timeout',
      create: () => DatabaseErrorFixture.timeout('The operation was aborted due to timeout'),
    },
    {
      name: 'native Bun transport timeout',
      code: '23',
      category: 'database_transport_timeout',
      create: () => DatabaseErrorFixture.timeout('The operation timed out.'),
    },
    {
      name: 'native closed stream',
      code: 'TRANSACTION_CLOSED',
      category: 'database_transport_closed',
      create: () =>
        DatabaseErrorFixture.native(
          'TRANSACTION_CLOSED',
          'Cannot execute statements because the transaction is closed',
        ),
    },
    {
      name: 'native idle stream',
      code: 'SQLITE_BUSY',
      category: 'database_transport_closed',
      create: () =>
        DatabaseErrorFixture.native(
          'SQLITE_BUSY',
          'SQLITE_BUSY: SQLite error: interactive transaction was rolled back because the stream was idle for too long; retry the transaction',
        ),
    },
    {
      name: 'wrapped closed stream',
      code: 'P2039',
      category: 'database_transport_closed',
      create: () =>
        DatabaseErrorFixture.prisma(
          'P2039',
          'private-query-header\nDatabase error. Code: `N/A`. Message: `TRANSACTION_CLOSED: Cannot execute statements because the transaction is closed`',
        ),
    },
  ],
  NonTransient: [
    {
      name: 'committed transaction reuse',
      create: () =>
        DatabaseErrorFixture.prisma(
          'P2028',
          'Transaction API error: Transaction already closed: A query cannot be executed on a committed transaction.',
        ),
    },
    {
      name: 'missing transaction',
      create: () =>
        DatabaseErrorFixture.prisma('P2028', 'Transaction API error: Transaction not found.'),
    },
    {
      name: 'arbitrary expired prose',
      create: () =>
        DatabaseErrorFixture.prisma('P2028', 'private-query expired transaction timeout'),
    },
    {
      name: 'other abort',
      create: () =>
        DatabaseErrorFixture.prisma('23', 'The operation was aborted for another reason'),
    },
    {
      name: 'other native closed category',
      create: () =>
        DatabaseErrorFixture.native('TRANSACTION_CLOSED', 'Unrecognized private failure'),
    },
    {
      name: 'ordinary database contention',
      create: () => DatabaseErrorFixture.native('SQLITE_BUSY', 'database is locked'),
    },
    {
      name: 'native unique constraint',
      create: () =>
        DatabaseErrorFixture.native(
          'SQLITE_CONSTRAINT',
          'UNIQUE constraint failed: Session.identifier',
        ),
    },
    {
      name: 'timeout lookalike',
      create: () =>
        Object.assign(new Error('The operation was aborted due to timeout'), {
          code: 23,
          name: 'TimeoutError',
        }),
    },
    {
      name: 'Prisma lookalike',
      create: () =>
        Object.assign(
          new Error('Transaction API error: Unable to start a transaction in the given time.'),
          { code: 'P2028' },
        ),
    },
  ],
} as const;
