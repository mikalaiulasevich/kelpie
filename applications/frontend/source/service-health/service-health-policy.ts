export const ServiceHealthPolicy = {
  RequestTimeoutMilliseconds: 5_000,
  ReadinessEndpoint: '/api/health/ready',
} as const;

export const ServiceHealthElements = {
  HeadingIdentifier: 'service-connection-heading',
} as const;
