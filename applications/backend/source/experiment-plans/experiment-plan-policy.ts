export const ExperimentPrimaryMetric = {
  RecommendationOpen: 'recommendation_open',
  Lead: 'lead',
  Qualified: 'qualified',
  Purchase: 'purchase',
} as const;

export const ExperimentPlanPolicy = {
  Route: 'administration/experiment-plans',
  MaximumHypothesisLength: 2000,
  MaximumTargetSample: 10000000,
} as const;
