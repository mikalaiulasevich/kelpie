import type { Options } from 'ky';

export const ServiceHealthPolicy = {
  RequestTimeoutMilliseconds: 5_000,
  ReadinessEndpoint: '/api/health/ready',
} as const;

export const ServiceHealthElements = {
  HeadingIdentifier: 'service-connection-heading',
} as const;

export const ServiceHealthRequestPolicy = {
  retry: 0,
  timeout: ServiceHealthPolicy.RequestTimeoutMilliseconds,
  totalTimeout: ServiceHealthPolicy.RequestTimeoutMilliseconds,
  cache: 'no-store',
  credentials: 'same-origin',
  throwHttpErrors: false,
} as const satisfies Options;
