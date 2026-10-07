export const PublicationCases = {
  InvalidQueries: [
    { name: 'oversized page', query: { funnelIdentifier: 'test', limit: '101' } },
    { name: 'unbounded offset', query: { funnelIdentifier: 'test', offset: '10001' } },
    { name: 'unexpected field', query: { funnelIdentifier: 'test', admin: true } },
    { name: 'coerced numeric input', query: { funnelIdentifier: 'test', limit: 2 } },
    { name: 'missing funnel', query: {} },
  ],
  InvalidPublications: [
    { name: 'noninteger revision', properties: { expectedRevision: 0.5 } },
    { name: 'negative revision', properties: { expectedRevision: -1 } },
    { name: 'non UUID operation', properties: { operationIdentifier: 'invalid' } },
    { name: 'injected administrator', properties: { administratorIdentifier: 'unexpected' } },
  ],
} as const;
