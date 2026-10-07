export const PublicationCases = {
  SuppliedVersions: [1, 2, 3],
  ProtectedRoutes: [
    { method: 'GET', route: 'configurations?funnelIdentifier=test' },
    { method: 'POST', route: 'configurations' },
    { method: 'GET', route: 'publications?funnelIdentifier=test' },
    { method: 'POST', route: 'publications' },
    { method: 'POST', route: 'rollbacks' },
  ],
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
