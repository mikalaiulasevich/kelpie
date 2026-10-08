import { Type, type Static } from 'typebox';
const AnalyticsSchemas = { Count: Type.Integer({ minimum: 0 }) };

const Counts = {
  started: AnalyticsSchemas.Count,
  results: AnalyticsSchemas.Count,
  clicks: AnalyticsSchemas.Count,
};
const Timestamp = Type.Union([Type.String(), Type.Null()]);
const NullableNumber = Type.Union([Type.Number(), Type.Null()]);

const AcquisitionOption = Type.Object({ value: Type.String(), sessions: AnalyticsSchemas.Count });

const AcquisitionOptions = Type.Object({
  sources: Type.Array(AcquisitionOption),
  mediums: Type.Array(AcquisitionOption),
  campaigns: Type.Array(AcquisitionOption),
  sourcesHasMore: Type.Boolean(),
  mediumsHasMore: Type.Boolean(),
  campaignsHasMore: Type.Boolean(),
});

const ExperimentRow = Type.Object({
  versionIdentifier: Type.String(),
  primaryMetric: Type.String(),
  cohortFrom: Type.String(),
  cohortTo: Type.String(),
  plannedEndAt: Type.String(),
  targetSamplePerVariant: AnalyticsSchemas.Count,
  expectedAllocationA: Type.Number(),
  startedA: AnalyticsSchemas.Count,
  startedB: AnalyticsSchemas.Count,
  convertedA: AnalyticsSchemas.Count,
  convertedB: AnalyticsSchemas.Count,
  sampleTargetReached: Type.Boolean(),
  plannedEndReached: Type.Boolean(),
  followUpComplete: Type.Boolean(),
  trafficOrigin: Type.String(),
  conversionWindowHours: NullableNumber,
  difference: NullableNumber,
  lower: NullableNumber,
  upper: NullableNumber,
  sampleRatioStatistic: NullableNumber,
  sampleRatioMismatch: Type.Union([Type.Boolean(), Type.Null()]),
});

export const AnalyticsInsightSchemas = {
  AcquisitionOption,
  AcquisitionOptions,
  ExperimentRow,
  ExperimentCountRow: Type.Object({
    variant: Type.String(),
    started: AnalyticsSchemas.Count,
    converted: AnalyticsSchemas.Count,
  }),
  BusinessOutcomeRow: Type.Object({
    kind: Type.String(),
    sessions: AnalyticsSchemas.Count,
    manualSessions: AnalyticsSchemas.Count,
    integrationSessions: AnalyticsSchemas.Count,
  }),
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
    acquisitionOptions: AcquisitionOptions,
    experiments: Type.Array(ExperimentRow),
    businessOutcomes: Type.Array(
      Type.Object({
        kind: Type.String(),
        sessions: AnalyticsSchemas.Count,
        manualSessions: AnalyticsSchemas.Count,
        integrationSessions: AnalyticsSchemas.Count,
      }),
    ),
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

export type AnalyticsBusinessOutcomeRow = Static<typeof AnalyticsInsightSchemas.BusinessOutcomeRow>;

export type AnalyticsExperimentRow = Static<typeof AnalyticsInsightSchemas.ExperimentRow>;

export type AnalyticsExperimentCountRow = Static<typeof AnalyticsInsightSchemas.ExperimentCountRow>;

export type AnalyticsAcquisitionOption = Static<typeof AnalyticsInsightSchemas.AcquisitionOption>;

export type AnalyticsAcquisitionOptions = Static<typeof AnalyticsInsightSchemas.AcquisitionOptions>;
