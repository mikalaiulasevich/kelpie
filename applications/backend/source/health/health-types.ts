import type { HealthStatus } from './health-policy.js';

export interface HealthResponse {
  readonly status: ValueOf<typeof HealthStatus>;
}
