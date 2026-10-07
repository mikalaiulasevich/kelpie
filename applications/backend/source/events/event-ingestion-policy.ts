export const ObservationName = {
  StepViewed: 'step_viewed',
  ResultViewed: 'result_viewed',
  CtaClicked: 'cta_clicked',
  RecommendationExpanded: 'recommendation_expanded',
} as const;

export const EventReceiptStatus = {
  Accepted: 'accepted',
  Duplicate: 'duplicate',
  Rejected: 'rejected',
} as const;

export const EventIngestionPolicy = {
  Route: 'events',
  BatchRoute: 'batches',
  MaximumBatchSize: 50,
  MaximumRevision: 2_147_483_646,
  MaximumIdentifierLength: 100,
  MaximumTextLength: 200,
  Source: 'client',
  ExpansionSource: 'primary_cta',
  ExpansionAction: 'expand_recommendation',
  RateLimit: { max: 60, timeWindow: '1 minute' },
} as const;

export const EventRejectionCode = {
  Invalid: 'invalid_event',
  Metadata: 'event_metadata_mismatch',
  Ineligible: 'event_not_eligible',
  Conflict: 'event_identifier_conflict',
  InvalidBatch: 'invalid_event_batch',
} as const;
