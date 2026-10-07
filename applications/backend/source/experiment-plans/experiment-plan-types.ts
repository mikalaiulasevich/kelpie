import { Type, type Static } from 'typebox';
import { PublicationPolicy } from '../publications/publication-policy.js';
import { ExperimentPrimaryMetric, ExperimentPlanPolicy } from './experiment-plan-policy.js';
export const ExperimentPlanSchemas = {
  Identifier: Type.String({ pattern: PublicationPolicy.UuidPattern }),
  Request: Type.Object(
    {
      hypothesis: Type.String({
        minLength: 10,
        maxLength: ExperimentPlanPolicy.MaximumHypothesisLength,
        pattern: '\\S',
      }),
      primaryMetric: Type.Enum(ExperimentPrimaryMetric),
      targetSamplePerVariant: Type.Integer({
        minimum: 1,
        maximum: ExperimentPlanPolicy.MaximumTargetSample,
      }),
      plannedEndAt: Type.String({
        pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$',
      }),
    },
    { additionalProperties: false },
  ),
} as const;

export type ExperimentPlanRequest = Static<typeof ExperimentPlanSchemas.Request>;
