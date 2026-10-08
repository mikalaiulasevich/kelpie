import { Prisma } from '../../generated/prisma/client.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsInsightQueries } from './analytics-insight-queries.js';
import { AnalyticsReportFields } from './analytics-report-fields.js';
import {
  AnalyticsReportSchemas,
  type AnalyticsReport,
  type AnalyticsReportEnvelope,
} from './analytics-report-types.js';
import { AnalyticsMessages } from './analytics-messages.js';

const Validators = {
  envelope: SchemaCompiler.compile<AnalyticsReportEnvelope>(AnalyticsReportSchemas.Envelope),
  report: SchemaCompiler.compile<AnalyticsReport>(AnalyticsReportSchemas.Report),
} as const;

const ReportEncoding = {
  rows(statement: Prisma.Sql, fields: readonly string[]): Prisma.Sql {
    // Fields are fixed domain-owned identifiers, never user input. Values retain SQL bindings.
    const properties = fields.map((field) => Prisma.sql`${field}, ${Prisma.raw(`"${field}"`)}`);

    return Prisma.sql`json((SELECT json_group_array(json_object(${Prisma.join(properties)})) FROM (${statement})))`;
  },
} as const;

export const AnalyticsReportRead = {
  query(cohort: Prisma.Sql, buckets: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${AnalyticsQueries.outcomes(cohort)} SELECT json_object(
      'summaries', ${ReportEncoding.rows(AnalyticsQueries.summaryRows(), AnalyticsReportFields.Summaries)},
      'steps', ${ReportEncoding.rows(AnalyticsQueries.stepRows(), AnalyticsReportFields.Steps)},
      'edges', ${ReportEncoding.rows(AnalyticsQueries.edgeRows(), AnalyticsReportFields.Edges)},
      'businessOutcomes', ${ReportEncoding.rows(AnalyticsInsightQueries.businessOutcomeRows(), AnalyticsReportFields.BusinessOutcomes)},
      'trend', ${ReportEncoding.rows(AnalyticsInsightQueries.trendRows(buckets), AnalyticsReportFields.Trend)},
      'acquisition', ${ReportEncoding.rows(AnalyticsInsightQueries.acquisitionRows(), AnalyticsReportFields.Acquisition)},
      'results', ${ReportEncoding.rows(AnalyticsInsightQueries.resultRows(), AnalyticsReportFields.Results)},
      'quality', ${ReportEncoding.rows(AnalyticsInsightQueries.qualityRows(), AnalyticsReportFields.Quality)},
      'stepTimings', ${ReportEncoding.rows(AnalyticsInsightQueries.stepTimingRows(), AnalyticsReportFields.StepTimings)}
    ) AS report`;
  },

  project(results: readonly unknown[]): AnalyticsReport {
    const [envelope] = results;

    if (results.length !== 1 || !Validators.envelope(envelope)) {
      throw new Error(AnalyticsMessages.InvalidAggregate);
    }

    let report: unknown;

    try {
      report = JSON.parse(envelope.report);
    } catch (error) {
      throw new Error(AnalyticsMessages.InvalidAggregate, { cause: error });
    }

    if (!Validators.report(report)) {
      throw new Error(AnalyticsMessages.InvalidAggregate);
    }

    return report;
  },
} as const;
