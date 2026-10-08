import { Type, type Static } from 'typebox';
const AnalyticsSchemas = { Count: Type.Integer({ minimum: 0 }) } as const;

const Counts = {
  started: AnalyticsSchemas.Count,
  results: AnalyticsSchemas.Count,
  clicks: AnalyticsSchemas.Count,
};
const Timestamp = Type.Union([Type.String(), Type.Null()]);
const NullableNumber = Type.Union([Type.Number(), Type.Null()]);

export const AnalyticsInsightSchemas = {
  Counts: Type.Object(Counts),
  TrendRow: Type.Object({ date: Type.String(), ...Counts }),
  AcquisitionRow: Type.Object({
    source: Type.String(),
    medium: Type.String(),
    campaign: Type.String(),
    ...Counts,
  }),
  ResultRow: Type.Object({
    resultIdentifier: Type.String(),
    sessions: AnalyticsSchemas.Count,
    clicks: AnalyticsSchemas.Count,
  }),
  QualityRow: Type.Object({
    latestEventAt: NullableNumber,
    openSessions: AnalyticsSchemas.Count,
    matureSessions: AnalyticsSchemas.Count,
  }),
  StepTimingRow: Type.Object({
    versionIdentifier: Type.String(),
    variant: Type.String(),
    stepIdentifier: Type.String(),
    observedSessions: AnalyticsSchemas.Count,
    averageSeconds: NullableNumber,
  }),
  Insights: Type.Object({
    period: Type.Object({
      from: Timestamp,
      to: Timestamp,
      timezone: Type.String(),
      conversionWindowHours: NullableNumber,
    }),
    trend: Type.Array(Type.Object({ date: Type.String(), ...Counts })),
    trendFrom: Type.String(),
    trendTo: Type.String(),
    previousPeriod: Type.Union([
      Type.Object({ from: Type.String(), to: Type.String(), ...Counts }),
      Type.Null(),
    ]),
    acquisition: Type.Array(
      Type.Object({
        source: Type.String(),
        medium: Type.String(),
        campaign: Type.String(),
        ...Counts,
      }),
    ),
    acquisitionHasMore: Type.Boolean(),
    results: Type.Array(
      Type.Object({
        resultIdentifier: Type.String(),
        sessions: AnalyticsSchemas.Count,
        clicks: AnalyticsSchemas.Count,
      }),
    ),
    resultsHasMore: Type.Boolean(),
    quality: Type.Object({
      latestEventAt: Timestamp,
      missingStepViews: AnalyticsSchemas.Count,
      openSessions: AnalyticsSchemas.Count,
      matureSessions: AnalyticsSchemas.Count,
    }),
    stepTimings: Type.Array(
      Type.Object({
        versionIdentifier: Type.String(),
        variant: Type.String(),
        stepIdentifier: Type.String(),
        observedSessions: AnalyticsSchemas.Count,
        averageSeconds: NullableNumber,
      }),
    ),
    publications: Type.Array(
      Type.Object({
        occurredAt: Type.String(),
        versionIdentifier: Type.String(),
        revision: AnalyticsSchemas.Count,
        action: Type.String(),
      }),
    ),
    publicationsHasMore: Type.Boolean(),
  }),
} as const;

export type AnalyticsInsights = DeepReadonly<Static<typeof AnalyticsInsightSchemas.Insights>>;

export type AnalyticsTrendRow = Static<typeof AnalyticsInsightSchemas.TrendRow>;

export type AnalyticsAcquisitionRow = Static<typeof AnalyticsInsightSchemas.AcquisitionRow>;

export type AnalyticsResultRow = Static<typeof AnalyticsInsightSchemas.ResultRow>;

export type AnalyticsQualityRow = Static<typeof AnalyticsInsightSchemas.QualityRow>;

export type AnalyticsStepTimingRow = Static<typeof AnalyticsInsightSchemas.StepTimingRow>;

export type AnalyticsCounts = Static<typeof AnalyticsInsightSchemas.Counts>;
