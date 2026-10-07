export const AnalyticsCases = {
  InvalidQueries: [
    { name: 'missing funnel', query: {} },
    { name: 'empty page', query: { funnelIdentifier: 'workstyle-planner', limit: '0' } },
    { name: 'oversized page', query: { funnelIdentifier: 'workstyle-planner', limit: '21' } },
    { name: 'oversized offset', query: { funnelIdentifier: 'workstyle-planner', offset: '10001' } },
    {
      name: 'invalid version',
      query: { funnelIdentifier: 'workstyle-planner', versionIdentifier: 'not-a-uuid' },
    },
    {
      name: 'unknown field',
      query: { funnelIdentifier: 'workstyle-planner', unexpected: 'value' },
    },
    {
      name: 'invalid forced selector',
      query: { funnelIdentifier: 'workstyle-planner', includeForced: '1' },
    },
    {
      name: 'invalid origin selector',
      query: { funnelIdentifier: 'workstyle-planner', trafficOrigin: 'test' },
    },
    {
      name: 'oversized campaign',
      query: { funnelIdentifier: 'workstyle-planner', campaign: 'x'.repeat(201) },
    },
  ],
} as const;
