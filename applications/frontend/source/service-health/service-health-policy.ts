export const ServiceHealthPolicy = Object.freeze({
  requestTimeoutMilliseconds: 5_000,
  readinessEndpoint: '/api/health/ready',
});

export const ServiceHealthMessages = Object.freeze({
  TimedOut: 'The service readiness check timed out.',
  Unavailable: 'The backend is not ready.',
  InvalidResponse: 'The service returned an invalid readiness response.',
});
