const IdleTransactionMessage =
  'SQLITE_BUSY: SQLITE_BUSY: SQLite error: interactive transaction was rolled back because the stream was idle for too long; retry the transaction';

export const TrafficSeedImportPolicy = {
  BatchSize: 25,
  TransactionTimeoutMilliseconds: 60000,
  TransactionAttempts: 3,
  TransactionRetryDelayMilliseconds: 250,
  RetryableTransactionCode: 'TRANSACTION_CLOSED',
  RetryableAbortCode: '23',
  RetryableAbortMessageSuffix: 'The operation was aborted due to timeout',
  RetryableTimeoutName: 'TimeoutError',
  RetryableIdleCode: 'SQLITE_BUSY',
  RetryableIdleMessage: IdleTransactionMessage,
  RetryableWrappedIdleMessageSuffix: `Database error. Code: \`N/A\`. Message: \`${IdleTransactionMessage}\``,
  RetryableWrappedTransactionCode: 'P2039',
  RetryableWrappedTransactionMessageSuffix:
    'Database error. Code: `N/A`. Message: `TRANSACTION_CLOSED: Cannot execute statements because the transaction is closed`',
  Include: { answers: true, operations: true, transitions: true, events: true, version: true },
} as const;
