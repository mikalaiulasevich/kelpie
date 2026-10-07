export const SessionCommandKind = { Answer: 'answer', Continue: 'continue', Back: 'back' } as const;

export type SessionCommandKind = ValueOf<typeof SessionCommandKind>;

export const SessionCommandPolicy = {
  MaximumRevision: 2147483646,
  MaximumAnswerLength: 4000,
  MaximumSelections: 100,
  AnswerPath: '/answer',
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
