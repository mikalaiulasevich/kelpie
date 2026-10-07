export const ManagementMessages = {
  ReadUnavailable: 'Unable to load workspace data.',
  Unavailable: 'The administration service is unavailable. Try again.',
  TimedOut: 'The request timed out. Check the current state before trying again.',
  InvalidResponse: 'The administration service returned an invalid response.',
  SessionExpired: 'Your session expired. Sign in again.',
  Forbidden: 'This action is not permitted.',
  NotFound:
    'We couldn’t find this funnel or configuration. Check the link or choose another funnel from the sidebar.',
  Conflict:
    'The configuration changed or this operation conflicts with an earlier request. Reload the current state.',
  InvalidInput: 'The configuration or request failed validation.',
  RateLimited: 'Too many requests. Wait a moment and try again.',
  TooLarge: 'The configuration exceeds the server size limit.',
} as const;
