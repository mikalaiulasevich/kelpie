import { Type, type Static } from 'typebox';
import { AnalyticsPolicy, AnalyticsTrafficOrigin } from './analytics-policy.js';

const identifier = Type.String({ minLength: 1, maxLength: 100, pattern: AnalyticsPolicy.IdentifierPattern });
const count = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const ratio = Type.Object({ numerator: count, denominator: count, value: Type.Union([Type.Number({ minimum: 0 }), Type.Null()]) });

export const AnalyticsSchemas = {
  Query: Type.Object({
    funnelIdentifier: identifier,
    versionIdentifier: Type.Optional(identifier),
    campaign: Type.Optional(Type.String({ maxLength: AnalyticsPolicy.MaximumCampaignLength })),
    includeForced: Type.Optional(Type.Union([Type.Literal('true'), Type.Literal('false')])),
    trafficOrigin: Type.Optional(Type.Enum(AnalyticsTrafficOrigin)),
    limit: Type.Optional(Type.String({ pattern: AnalyticsPolicy.UnsignedIntegerPattern })),
    offset: Type.Optional(Type.String({ pattern: AnalyticsPolicy.UnsignedIntegerPattern })),
  }, { additionalProperties: false }),
  Ratio: ratio,
  SummaryRow: Type.Object({ versionIdentifier: Type.String(), variant: Type.String(), started: count, results: count, clicks: count, resultClicks: count }),
  StepRow: Type.Object({ versionIdentifier: Type.String(), variant: Type.String(), stepIdentifier: Type.String(), reached: count, completed: count, observedCompleted: count, expiredReached: count, openNoncompletion: count, expiredNoncompletion: count }),
  EdgeRow: Type.Object({ versionIdentifier: Type.String(), variant: Type.String(), fromStepIdentifier: Type.String(), toStepIdentifier: Type.String(), transitions: count, sourceCompleted: count, sourceReached: count, observed: count, destinationReached: count, openNonreach: count, expiredNonreach: count }),
} as const;

export type AnalyticsQueryInput = Static<typeof AnalyticsSchemas.Query>;
export type AnalyticsQuery = Readonly<Omit<AnalyticsQueryInput, 'includeForced' | 'limit' | 'offset' | 'trafficOrigin'> & { includeForced: boolean; limit: number; offset: number; trafficOrigin: ValueOf<typeof AnalyticsTrafficOrigin> }>;
export type AnalyticsRatio = Static<typeof AnalyticsSchemas.Ratio>;
export type AnalyticsSummaryRow = Static<typeof AnalyticsSchemas.SummaryRow>;
export type AnalyticsStepRow = Static<typeof AnalyticsSchemas.StepRow>;
export type AnalyticsEdgeRow = Static<typeof AnalyticsSchemas.EdgeRow>;

export interface AnalyticsAggregates {
  readonly summaries: readonly AnalyticsSummaryRow[];
  readonly steps: readonly AnalyticsStepRow[];
  readonly edges: readonly AnalyticsEdgeRow[];
}

