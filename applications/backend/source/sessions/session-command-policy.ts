export const SessionCommandKind = { Answer: 'answer', Continue: 'continue', Back: 'back' } as const;
export type SessionCommandKind = ValueOf<typeof SessionCommandKind>;

export const SessionCommandPolicy = {
  UuidPattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  TimestampPattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$',
  MaximumRevision: 2147483646,
  MaximumAnswerLength: 4000,
  MaximumSelections: 100,
  AnswerPath: '/answer',
  HashAlgorithm: 'sha256',
  HashEncoding: 'hex',
  UniqueConstraintCode: 'P2002',
} as const;

export const SessionCommandErrorCode = {
  Invalid: 'invalid_command',
  Conflict: 'operation_conflict',
  StaleRevision: 'stale_revision',
  InvalidStep: 'invalid_step',
  InvalidAnswer: 'invalid_answer',
  UnavailableNavigation: 'unavailable_navigation',
} as const;
