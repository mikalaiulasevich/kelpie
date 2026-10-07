export const SessionMessages = {
  Unauthorized: 'The session credential is missing or expired.',
  Invalid: 'The session request is invalid.',
  Conflict: 'The operation identifier represents a different request.',
  Bound: 'This browser already owns a session.',
  Unavailable: 'The funnel has no active configuration.',
  Corrupted: 'The stored session is unavailable.',
  Forbidden: 'The session request origin is invalid.',
} as const;
