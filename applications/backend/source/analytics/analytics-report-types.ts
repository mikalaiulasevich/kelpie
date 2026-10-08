import { Type, type Static } from 'typebox';
import { AnalyticsSchemas } from './analytics-types.js';
import { AnalyticsInsightSchemas } from './analytics-insight-types.js';

export const AnalyticsReportSchemas = {
  Envelope: Type.Object({ report: Type.String() }, { additionalProperties: false }),
  Report: Type.Object(
    {
      summaries: Type.Array(AnalyticsSchemas.SummaryRow),
      steps: Type.Array(AnalyticsSchemas.StepRow),
      edges: Type.Array(AnalyticsSchemas.EdgeRow),
      businessOutcomes: Type.Array(AnalyticsInsightSchemas.BusinessOutcomeRow),
      trend: Type.Array(AnalyticsInsightSchemas.TrendRow),
      acquisition: Type.Array(AnalyticsInsightSchemas.AcquisitionRow),
      results: Type.Array(AnalyticsInsightSchemas.ResultRow),
      quality: Type.Array(AnalyticsInsightSchemas.QualityRow),
      stepTimings: Type.Array(AnalyticsInsightSchemas.StepTimingRow),
    },
    { additionalProperties: false },
  ),
} as const;

export type AnalyticsReportEnvelope = Static<typeof AnalyticsReportSchemas.Envelope>;

export type AnalyticsReport = Static<typeof AnalyticsReportSchemas.Report>;
