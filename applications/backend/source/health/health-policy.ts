export const HealthRoutes = {
  Controller: 'health',
  Liveness: 'live',
  Readiness: 'ready',
} as const;

export const HealthStatus = { Healthy: 'healthy', Ready: 'ready' } as const;
