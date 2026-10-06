export const ServiceReadinessCases = {
  RejectedResponses: [
    {
      name: 'an unavailable backend',
      body: { status: 'ready' },
      status: 503,
      message: 'not ready',
    },
    {
      name: 'a liveness payload on the readiness endpoint',
      body: { status: 'healthy' },
      status: 200,
      message: 'invalid readiness',
    },
  ],
} as const;

/** Independent wire/timing expectations: do not import the implementation policy here. */
export const ServiceReadinessExpectations = {
  Endpoint: '/api/health/ready',
  TimeoutMilliseconds: 5_000,
} as const;
