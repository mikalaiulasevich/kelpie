export const ServiceHealthMessages = {
  TimedOut: 'The service readiness check timed out.',
  Unavailable: 'The backend is not ready.',
  InvalidResponse: 'The service returned an invalid readiness response.',
} as const;
