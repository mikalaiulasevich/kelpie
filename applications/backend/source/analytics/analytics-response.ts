import { Type, type Static } from 'typebox';
import { StepType, ExperimentVariant } from '@kelpie/contracts';
import { AnalyticsTrafficOrigin } from './analytics-policy.js';
import { AnalyticsSchemas } from './analytics-types.js';

const count = Type.Integer({ minimum: 0 });
const stepProperties = {
  stepIdentifier: Type.String(),
  type: Type.Enum(StepType),
  conditional: Type.Boolean(),
  reached: count,
};
const nonterminalStep = Type.Object({
  ...stepProperties,
  completed: count,
  completion: AnalyticsSchemas.Ratio,
  noncompletion: Type.Object({ open: count, expired: count }),
  expiredDropout: AnalyticsSchemas.Ratio,
});
const terminalStep = Type.Object(stepProperties);
const edge = Type.Object({
  fromStepIdentifier: Type.String(),
  toStepIdentifier: Type.String(),
  transitions: count,
  observedConversion: AnalyticsSchemas.Ratio,
  branchShare: AnalyticsSchemas.Ratio,
  transitionToView: AnalyticsSchemas.Ratio,
  destinationNonreach: Type.Object({ open: count, expired: count }),
});
const variant = Type.Object({
  variant: Type.Enum(ExperimentVariant),
  started: count,
  resultCompletion: AnalyticsSchemas.Ratio,
  ctaConversion: AnalyticsSchemas.Ratio,
  ctaClickThrough: AnalyticsSchemas.Ratio,
  steps: Type.Array(Type.Union([nonterminalStep, terminalStep])),
  edges: Type.Array(edge),
});
const version = Type.Object({
  versionIdentifier: Type.String(),
  funnelVersion: count,
  experimentIdentifier: Type.String(),
  variants: Type.Array(variant),
});

export const AnalyticsResponseSchemas = {
  Step: Type.Union([nonterminalStep, terminalStep]),
  Edge: edge,
  Variant: variant,
  Version: version,
} as const;

export type AnalyticsStep = Static<typeof AnalyticsResponseSchemas.Step>;
export type AnalyticsEdge = Static<typeof AnalyticsResponseSchemas.Edge>;
export type AnalyticsVariant = Static<typeof AnalyticsResponseSchemas.Variant>;
export type AnalyticsVersion = Static<typeof AnalyticsResponseSchemas.Version>;

export const AnalyticsResponseSchema = Type.Object({
  generatedAt: Type.String(),
  filters: Type.Object({
    funnelIdentifier: Type.String(),
    versionIdentifier: Type.Optional(Type.String()),
    campaign: Type.Optional(Type.String()),
    includeForced: Type.Boolean(),
    trafficOrigin: Type.Enum(AnalyticsTrafficOrigin),
    limit: count,
    offset: count,
  }),
  pagination: Type.Object({ limit: count, offset: count }),
  versions: Type.Array(version),
});

export type AnalyticsResponse = Static<typeof AnalyticsResponseSchema>;
