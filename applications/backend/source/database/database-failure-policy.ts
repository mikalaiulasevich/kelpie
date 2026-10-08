export const DatabaseFailureKind = {
  OperationTimeout: 'operation_timeout',
  TransactionExpired: 'transaction_expired',
  TransactionAcquisitionTimeout: 'transaction_acquisition_timeout',
  TransactionFailure: 'transaction_failure',
  TransportTimeout: 'transport_timeout',
  TransportClosed: 'transport_closed',
} as const;

export const DatabaseFailurePolicy = {
  TransactionCode: 'P2028',
  WrappedTransportCode: 'P2039',
  AbortCode: '23',
  NativeTimeoutName: 'TimeoutError',
  TimeoutMessages: ['The operation was aborted due to timeout', 'The operation timed out.'],
  AcquisitionSuffix: 'Transaction API error: Unable to start a transaction in the given time.',
  ExpiredPattern:
    /Transaction API error: A (?:query|commit|rollback) cannot be executed on an expired transaction\. The timeout for this transaction was \d+ ms, however \d+ ms passed since the start of the transaction\. Consider increasing the interactive transaction timeout or doing less work in the transaction\.$/,
  ClosedCode: 'TRANSACTION_CLOSED',
  ClosedMessage: 'TRANSACTION_CLOSED: Cannot execute statements because the transaction is closed',
  IdleCode: 'SQLITE_BUSY',
  IdleMessage:
    'SQLITE_BUSY: SQLITE_BUSY: SQLite error: interactive transaction was rolled back because the stream was idle for too long; retry the transaction',
} as const;
