import { Type, type Static } from 'typebox';

const plan = Type.Object({
  versionIdentifier: Type.String(),
  hypothesis: Type.String(),
  primaryMetric: Type.Union([
    Type.Literal('recommendation_open'),
    Type.Literal('lead'),
    Type.Literal('qualified'),
    Type.Literal('purchase'),
  ]),
  targetSamplePerVariant: Type.Integer({ minimum: 1 }),
  conversionWindowHours: Type.Union([Type.Integer({ minimum: 1, maximum: 2160 }), Type.Null()]),
  plannedEndAt: Type.String(),
  administratorIdentifier: Type.String(),
  createdAt: Type.String(),
});
const outcome = Type.Object({
  identifier: Type.String(),
  externalIdentifier: Type.String(),
  sessionIdentifier: Type.String(),
  kind: Type.Union([Type.Literal('lead'), Type.Literal('qualified'), Type.Literal('purchase')]),
  occurredAt: Type.String(),
  source: Type.String(),
  provenance: Type.Union([Type.Literal('manual'), Type.Literal('integration')]),
  administratorIdentifier: Type.String(),
  recordedAt: Type.String(),
});
export const AnalyticsGoalSchemas = {
  ExperimentEvidence: Type.Object({
    versionIdentifier: Type.String(),
    primaryMetric: Type.String(),
    cohortFrom: Type.String(),
    cohortTo: Type.String(),
    plannedEndAt: Type.String(),
    targetSamplePerVariant: Type.Integer(),
    expectedAllocationA: Type.Number(),
    startedA: Type.Integer(),
    startedB: Type.Integer(),
    convertedA: Type.Integer(),
    convertedB: Type.Integer(),
    followUpComplete: Type.Boolean(),
    trafficOrigin: Type.String(),
    conversionWindowHours: Type.Union([Type.Integer(), Type.Null()]),
    sampleTargetReached: Type.Boolean(),
    plannedEndReached: Type.Boolean(),
    difference: Type.Union([Type.Number(), Type.Null()]),
    lower: Type.Union([Type.Number(), Type.Null()]),
    upper: Type.Union([Type.Number(), Type.Null()]),
    sampleRatioStatistic: Type.Union([Type.Number(), Type.Null()]),
    sampleRatioMismatch: Type.Union([Type.Boolean(), Type.Null()]),
  }),
  BusinessOutcomeCount: Type.Object({
    kind: Type.String(),
    sessions: Type.Integer(),
    manualSessions: Type.Integer(),
    integrationSessions: Type.Integer(),
  }),
  Plan: plan,
  PlanResponse: Type.Object({
    plan: Type.Union([plan, Type.Null()]),
    expectedAllocationA: Type.Number({ minimum: 0, maximum: 1 }),
  }),
  Outcome: outcome,
  Overview: Type.Object({
    connectorConfigured: Type.Boolean(),
    counts: Type.Array(
      Type.Object({
        kind: Type.String(),
        provenance: Type.String(),
        count: Type.Integer({ minimum: 0 }),
      }),
    ),
  }),
  PlanRequest: Type.Object({
    ...Type.Pick(plan, ['hypothesis', 'primaryMetric', 'targetSamplePerVariant', 'plannedEndAt'])
      .properties,
    conversionWindowHours: Type.Integer({ minimum: 1, maximum: 2160 }),
  }),
  OutcomeRequest: Type.Pick(outcome, [
    'externalIdentifier',
    'sessionIdentifier',
    'kind',
    'occurredAt',
    'source',
    'provenance',
  ]),
} as const;

export type AnalyticsExperimentPlanRequest = Static<typeof AnalyticsGoalSchemas.PlanRequest>;

export type AnalyticsOutcomeRequest = Static<typeof AnalyticsGoalSchemas.OutcomeRequest>;

export type AnalyticsExperimentEvidence = Static<typeof AnalyticsGoalSchemas.ExperimentEvidence>;

export type AnalyticsBusinessOutcomeCount = Static<
  typeof AnalyticsGoalSchemas.BusinessOutcomeCount
>;
