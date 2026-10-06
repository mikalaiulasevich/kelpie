export const TransportPolicy = {
  ApiPrefix: 'api',
  JsonBodyLimit: '256kb',
  RequestTimeoutMilliseconds: 30_000,
  HeadersTimeoutMilliseconds: 15_000,
  KeepAliveTimeoutMilliseconds: 5_000,
} as const;
