export const AdministrationMessages = {
  InvalidCredentials: 'The username or password is incorrect.',
  SessionExpired: 'Your session has expired. Please sign in again.',
  RateLimited: 'Too many attempts. Please wait before trying again.',
  Forbidden: 'This request could not be verified. Please reload the page and try again.',
  Unavailable: 'The administration service is unavailable. Please try again.',
  TimedOut: 'The request timed out. Please try again.',
  InvalidResponse: 'The administration service returned an invalid response.',
} as const;
