export const SessionCommandCases = {
  Navigation: [
    {
      name: 'information continue',
      stepIdentifier: 'intro',
      direction: 'continue',
      endpoint: 'continue',
      answer: undefined,
    },
    {
      name: 'answer confirmation',
      stepIdentifier: 'team_size',
      direction: 'continue',
      endpoint: 'answers',
      answer: 12,
    },
    {
      name: 'back without submitting the draft',
      stepIdentifier: 'team_size',
      direction: 'back',
      endpoint: 'back',
      answer: 24,
    },
  ],
  Queries: [
    { query: '', path: '/api/sessions' },
    { query: 'variant=A', path: '/api/sessions?variant=A' },
    { query: '?variant=B&utm_source=review', path: '/api/sessions?variant=B&utm_source=review' },
  ],
  RestoreStatuses: [401, 409, 410],
  Recovery: [
    { name: 'expired answer session', status: 401, outcome: 'expired', expected: null },
    { name: 'expired session response', status: 410, outcome: 'expired', expected: null },
    {
      name: 'failed unauthorized-session refresh',
      status: 401,
      outcome: 'failed',
      expected: 'We could not connect. Your answer is still here. Try again.',
    },
    {
      name: 'failed conflict refresh',
      status: 409,
      outcome: 'failed',
      expected: 'We could not connect. Your answer is still here. Try again.',
    },
    {
      name: 'restored conflict session',
      status: 409,
      outcome: 'active',
      expected:
        'This session changed in another tab. We refreshed your place; your draft is still saved.',
    },
    {
      name: 'restored active unauthorized session',
      status: 401,
      outcome: 'active',
      expected: 'This answer could not be saved. Check the selection and try again.',
    },
  ],
} as const;
