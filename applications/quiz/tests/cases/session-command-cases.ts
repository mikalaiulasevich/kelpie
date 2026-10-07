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
} as const;
