export const BusinessOutcomeKind = {
  Lead: 'lead',
  Qualified: 'qualified',
  Purchase: 'purchase',
} as const;

export const BusinessOutcomeProvenance = { Manual: 'manual', Integration: 'integration' } as const;

export const BusinessOutcomePolicy = {
  Route: 'administration/business-outcomes',
  MaximumResults: 100,
  MaximumSourceLength: 80,
  MaximumExternalIdentifierLength: 200,
  RateLimit: { max: 60, timeWindow: '1 minute' },
} as const;
