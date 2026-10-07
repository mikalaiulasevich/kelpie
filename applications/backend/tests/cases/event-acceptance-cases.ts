export const EventAcceptanceCases = {
  HybridPrefix: [10, 'hybrid', ['focus'], 'same'],
  RemoteCompletion: [10, 'remote', ['focus'], 'global', 'high', 3],
  ThirdVersionCompletion: ['remote', 4, 'global', 10, 'high', ['compliance'], 'regulated'],
  Spoofed: [
    { name: 'server source', overrides: { source: 'server' } },
    { name: 'receipt timestamp', overrides: { server_timestamp: '2026-10-07T00:00:00.000Z' } },
    {
      name: 'authoritative command event',
      overrides: { name: 'answer_submitted', properties: { answer_kind: 'number' } },
    },
    {
      name: 'raw answer property',
      overrides: { properties: { step_type: 'info', answer: 'private' } },
    },
    { name: 'contradictory pinned version', overrides: { funnel_version: 999 } },
    { name: 'contradictory acquisition campaign', overrides: { utm_campaign: 'forged' } },
  ],
} as const;
