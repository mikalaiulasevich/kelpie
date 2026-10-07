import { Type, type Static } from 'typebox';
import { StepType, ExperimentVariant } from '@kelpie/contracts';
import { AnalyticsSchemas } from './analytics-types.js';

const AnalyticsResponseFields = {
  Step: {
    stepIdentifier: Type.String(),
    conditional: Type.Boolean(),
    reached: AnalyticsSchemas.Count,
  },
  NonterminalType: Type.Enum({
    Information: StepType.Information,
    Number: StepType.Number,
    SingleSelect: StepType.SingleSelect,
    MultiSelect: StepType.MultiSelect,
  }),
  Noncompletion: Type.Object({ open: AnalyticsSchemas.Count, expired: AnalyticsSchemas.Count }),
} as const;

const AnalyticsStepSchemas = {
  Nonterminal: Type.Object(
    {
      ...AnalyticsResponseFields.Step,
      type: AnalyticsResponseFields.NonterminalType,
      completed: AnalyticsSchemas.Count,
      completion: AnalyticsSchemas.Ratio,
      noncompletion: AnalyticsResponseFields.Noncompletion,
      expiredDropout: AnalyticsSchemas.Ratio,
    },
    { additionalProperties: false },
  ),
  Terminal: Type.Object(
    { ...AnalyticsResponseFields.Step, type: Type.Literal(StepType.Result) },
    { additionalProperties: false },
  ),
  Edge: Type.Object({
    fromStepIdentifier: Type.String(),
    toStepIdentifier: Type.String(),
    transitions: AnalyticsSchemas.Count,
    observedConversion: AnalyticsSchemas.Ratio,
    branchShare: AnalyticsSchemas.Ratio,
    transitionToView: AnalyticsSchemas.Ratio,
    destinationNonreach: AnalyticsResponseFields.Noncompletion,
  }),
} as const;

const AnalyticsVariantSchemas = {
  Variant: Type.Object({
    variant: Type.Enum(ExperimentVariant),
    started: AnalyticsSchemas.Count,
    resultCompletion: AnalyticsSchemas.Ratio,
    ctaConversion: AnalyticsSchemas.Ratio,
    ctaClickThrough: AnalyticsSchemas.Ratio,
    steps: Type.Array(
      Type.Union([AnalyticsStepSchemas.Nonterminal, AnalyticsStepSchemas.Terminal]),
    ),
    edges: Type.Array(AnalyticsStepSchemas.Edge),
  }),
} as const;

const AnalyticsVersionSchemas = {
  Version: Type.Object({
    versionIdentifier: Type.String(),
    funnelVersion: AnalyticsSchemas.Count,
    experimentIdentifier: Type.String(),
    variants: Type.Array(AnalyticsVariantSchemas.Variant),
  }),
} as const;

export const AnalyticsResponseSchemas = {
  Step: Type.Union([AnalyticsStepSchemas.Nonterminal, AnalyticsStepSchemas.Terminal]),
  Edge: AnalyticsStepSchemas.Edge,
  Variant: AnalyticsVariantSchemas.Variant,
  Version: AnalyticsVersionSchemas.Version,
  Response: Type.Object({
    generatedAt: Type.String(),
    filters: AnalyticsSchemas.ResolvedQuery,
    pagination: Type.Object({ limit: AnalyticsSchemas.Count, offset: AnalyticsSchemas.Count, hasMore: Type.Boolean() }),
    versions: Type.Array(AnalyticsVersionSchemas.Version),
  }),
} as const;

export type AnalyticsStep = DeepReadonly<Static<typeof AnalyticsResponseSchemas.Step>>;

export type AnalyticsEdge = DeepReadonly<Static<typeof AnalyticsResponseSchemas.Edge>>;

export type AnalyticsVariant = DeepReadonly<Static<typeof AnalyticsResponseSchemas.Variant>>;

export type AnalyticsVersion = DeepReadonly<Static<typeof AnalyticsResponseSchemas.Version>>;

export type AnalyticsResponse = DeepReadonly<Static<typeof AnalyticsResponseSchemas.Response>>;
