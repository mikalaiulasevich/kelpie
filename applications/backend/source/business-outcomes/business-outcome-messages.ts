export const BusinessOutcomeMessages = {
  InvalidInput: 'Business outcome input is invalid.',
  SessionMissing: 'The analytics session does not exist.',
  InvalidTimestamp:
    'The outcome timestamp must be on or after session creation and not in the future.',
  Conflict: 'The external outcome identifier was already used with different content.',
} as const;
