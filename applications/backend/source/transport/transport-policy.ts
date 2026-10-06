export const TransportLog = {
  ErrorLevel: 'error',
  RequestComponent: 'request',
} as const;

export const TransportPolicy = {
  FrameworkHeader: 'x-powered-by',
  BodyParser: 'json',
  LoggerLevels: ['log', 'warn'],
  ApiPrefix: 'api',
  JsonBodyLimit: '256kb',
  RequestTimeoutMilliseconds: 30_000,
  HeadersTimeoutMilliseconds: 15_000,
  KeepAliveTimeoutMilliseconds: 5_000,
} as const;
