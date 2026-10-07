export const ManagementClientCases = {
  Errors: [
    { status: 401, code: 'unauthorized', message: 'session expired', uncertain: false },
    { status: 409, code: 'stale_revision', message: 'configuration changed', uncertain: false },
    { status: 422, code: 'invalid', message: 'failed validation', uncertain: false },
    { status: 500, code: 'internal_error', message: 'unavailable', uncertain: true },
    { status: 503, code: 'unavailable', message: 'unavailable', uncertain: true },
  ],
  InvalidResponses: [
    null,
    {},
    {
      items: [],
      funnel: { identifier: 'wellness', activeVersionIdentifier: null, revision: '2' },
      nextOffset: null,
    },
  ],
} as const;
