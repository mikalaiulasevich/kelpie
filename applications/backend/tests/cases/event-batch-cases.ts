export const EventBatchCases = {
  InvalidEnvelope: [
    { name: 'empty batch', body: { events: [] } },
    { name: 'oversized batch', body: { events: Array.from({ length: 51 }, () => null) } },
    { name: 'additional envelope fields', body: { events: [null], source: 'server' } },
    { name: 'non-array batch', body: { events: {} } },
  ],
} as const;
