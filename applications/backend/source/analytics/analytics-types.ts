import { ExperimentVariant } from '@kelpie/contracts';
import { ManagementSchemas } from '../management/management-types.js';
import { ManagementPolicy } from '../management/management-policy.js';
import { PublicationPolicy } from '../publications/publication-policy.js';
import { Type, type Static } from 'typebox';
import { AnalyticsPolicy, AnalyticsTrafficOrigin } from './analytics-policy.js';

const AnalyticsFields = {
  Count: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  VersionIdentifier: Type.String({ pattern: PublicationPolicy.UuidPattern }),
  Campaign: Type.String({ maxLength: AnalyticsPolicy.MaximumCampaignLength }),
  Group: { versionIdentifier: Type.String(), variant: Type.Enum(ExperimentVariant) },
} as const;

const AnalyticsQueryFields = {
  funnelIdentifier: ManagementSchemas.Identifier,
  versionIdentifier: Type.Optional(AnalyticsFields.VersionIdentifier),
  campaign: Type.Optional(AnalyticsFields.Campaign),
  source: Type.Optional(AnalyticsFields.Campaign),
  medium: Type.Optional(AnalyticsFields.Campaign),
  from: Type.Optional(Type.String({ maxLength: 40 })),
  to: Type.Optional(Type.String({ maxLength: 40 })),
  timezone: Type.Optional(Type.String({ maxLength: 100 })),
} as const;

export const AnalyticsSchemas = {
  Query: Type.Object(
    {
      ...AnalyticsQueryFields,
      conversionWindowHours: Type.Optional(Type.String({ pattern: '^[1-9][0-9]{0,3}$' })),
      includeForced: Type.Optional(Type.Union([Type.Literal('true'), Type.Literal('false')])),
      trafficOrigin: Type.Optional(Type.Enum(AnalyticsTrafficOrigin)),
      limit: Type.Optional(Type.String({ pattern: ManagementPolicy.PageSizePattern })),
      offset: Type.Optional(Type.String({ pattern: ManagementPolicy.OffsetPattern })),
    },
    { additionalProperties: false },
  ),
  ResolvedQuery: Type.Object(
    {
      ...AnalyticsQueryFields,
      conversionWindowHours: Type.Optional(Type.Integer({ minimum: 1, maximum: 2160 })),
      includeForced: Type.Boolean(),
      trafficOrigin: Type.Enum(AnalyticsTrafficOrigin),
      limit: Type.Integer({ minimum: 1, maximum: AnalyticsPolicy.MaximumLimit }),
      offset: Type.Integer({ minimum: 0, maximum: ManagementPolicy.MaximumOffset }),
    },
    { additionalProperties: false },
  ),
  Count: AnalyticsFields.Count,
  Ratio: Type.Object({
    numerator: AnalyticsFields.Count,
    denominator: AnalyticsFields.Count,
    value: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()]),
  }),
  SummaryRow: Type.Object({
    ...AnalyticsFields.Group,
    started: AnalyticsFields.Count,
    results: AnalyticsFields.Count,
    clicks: AnalyticsFields.Count,
    resultClicks: AnalyticsFields.Count,
  }),
  StepRow: Type.Object({
    ...AnalyticsFields.Group,
    stepIdentifier: Type.String(),
    reached: AnalyticsFields.Count,
    completed: AnalyticsFields.Count,
    observedCompleted: AnalyticsFields.Count,
    expiredReached: AnalyticsFields.Count,
    openNoncompletion: AnalyticsFields.Count,
    expiredNoncompletion: AnalyticsFields.Count,
  }),
  EdgeRow: Type.Object({
    ...AnalyticsFields.Group,
    fromStepIdentifier: Type.String(),
    toStepIdentifier: Type.String(),
    transitions: AnalyticsFields.Count,
    sourceCompleted: AnalyticsFields.Count,
    sourceReached: AnalyticsFields.Count,
    observed: AnalyticsFields.Count,
    destinationReached: AnalyticsFields.Count,
    openNonreach: AnalyticsFields.Count,
    expiredNonreach: AnalyticsFields.Count,
  }),
} as const;

export type AnalyticsQueryInput = Readonly<Static<typeof AnalyticsSchemas.Query>>;

export type AnalyticsQuery = Readonly<Static<typeof AnalyticsSchemas.ResolvedQuery>>;

export type AnalyticsRatio = Readonly<Static<typeof AnalyticsSchemas.Ratio>>;

export type AnalyticsSummaryRow = Readonly<Static<typeof AnalyticsSchemas.SummaryRow>>;

export type AnalyticsStepRow = Readonly<Static<typeof AnalyticsSchemas.StepRow>>;

export type AnalyticsEdgeRow = Readonly<Static<typeof AnalyticsSchemas.EdgeRow>>;

export interface AnalyticsAggregates {
  readonly summaries: readonly AnalyticsSummaryRow[];
  readonly steps: readonly AnalyticsStepRow[];
  readonly edges: readonly AnalyticsEdgeRow[];
}

export interface AnalyticsAggregateGroups {
  readonly summaries: ReadonlyDictionary<string, readonly AnalyticsSummaryRow[]>;
  readonly steps: ReadonlyDictionary<string, readonly AnalyticsStepRow[]>;
  readonly edges: ReadonlyDictionary<string, readonly AnalyticsEdgeRow[]>;
}

export type AnalyticsGroup = Pick<AnalyticsSummaryRow, 'versionIdentifier' | 'variant'>;
