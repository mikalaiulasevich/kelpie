export const SessionCommandMessages = {
  Invalid: 'The session command is invalid.',
  Conflict: 'The operation identifier already represents a different request.',
  StaleRevision: 'The session changed. Reload before retrying.',
  InvalidStep: 'The command does not match the current available step.',
  InvalidAnswer: 'The answer does not satisfy the step requirements.',
  UnavailableNavigation: 'There is no available step in this direction.',
} as const;
