export const TrafficPolicy = {
  Sessions: 10_000,
  Concurrency: 8,
  Seed: 20261008,
  MaximumSessions: 100_000,
  MaximumConcurrency: 32,
  RequestTimeoutMilliseconds: 30_000,
  MaximumTransitions: 40,
  Origin: 'http://127.0.0.1:5173',
  Credentials: { username: 'traffic-profiler', password: 'isolated-synthetic-profile-only' },
} as const;
