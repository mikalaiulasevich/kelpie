export const ManagementCases = {
  InvalidQueries: [
    { name: 'oversized page', query: { funnelIdentifier: 'test', limit: '101' } },
    { name: 'unbounded offset', query: { funnelIdentifier: 'test', offset: '10001' } },
    { name: 'unexpected field', query: { funnelIdentifier: 'test', admin: true } },
    { name: 'coerced numeric input', query: { funnelIdentifier: 'test', limit: 2 } },
    { name: 'missing funnel', query: {} },
  ],
} as const;
