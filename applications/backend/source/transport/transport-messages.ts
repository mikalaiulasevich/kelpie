export const TransportMessages = {
  RateLimited: 'Too many requests. Try again later.',
  UnsupportedServer: 'HTTP server adapter is unsupported.',
  NotReady: 'Application is not ready.',
  InternalFailure: 'An internal error occurred.',
  BodyTooLarge: 'Request body is too large.',
  RequestRejected: 'Request could not be processed.',
} as const;
