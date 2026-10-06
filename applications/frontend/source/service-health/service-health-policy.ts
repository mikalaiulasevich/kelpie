export const ServiceHealthPolicy = {
  RequestTimeoutMilliseconds: 5_000,
  ReadinessEndpoint: '/api/health/ready',
} as const;
