import type { AnalyticsReport } from './analytics-report-types.js';
import type { AnalyticsResultBatch } from './analytics-result-batch.js';
import type { AnalyticsInsightsReadPlan } from './analytics-read-types.js';
import { AnalyticsAcquisitionOptionsRead } from './analytics-acquisition-options.js';
import { AnalyticsExperimentEvidence } from './analytics-experiment-evidence.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import {
  AnalyticsInsightSchemas,
  type AnalyticsInsights,
  type AnalyticsCounts,
} from './analytics-insight-types.js';
import { AnalyticsInsightQueries } from './analytics-insight-queries.js';
import { AnalyticsPeriod } from './analytics-period.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsRows } from './analytics-results.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import type { AnalyticsQuery, AnalyticsAggregates } from './analytics-types.js';

const Validators = {
  counts: SchemaCompiler.compile<AnalyticsCounts>(AnalyticsInsightSchemas.Counts),
};

export const AnalyticsInsightsRead = {
  async prepare(
    transaction: Prisma.TransactionClient,
    query: AnalyticsQuery,
    versionIdentifiers: readonly string[],
    now: Date,
  ): Promise<AnalyticsInsightsReadPlan> {
    const statements: Prisma.Sql[] = [];
    const previous = AnalyticsPeriod.previous(query);

    if (previous) {
      statements.push(
        AnalyticsInsightQueries.totals(AnalyticsQueries.cohort(previous, versionIdentifiers, now)),
      );
    }

    const bounds = AnalyticsPeriod.bounds(query, now);
    const publications = await transaction.publication.findMany({
      where: {
        funnelIdentifier: query.funnelIdentifier,
        createdAt: { gte: new Date(bounds.from), lt: new Date(bounds.to) },
      },
      select: { createdAt: true, targetVersionIdentifier: true, revision: true, action: true },
      orderBy: { createdAt: 'asc' },
      take: AnalyticsPolicy.MaximumInsightGroups + 1,
    });

    const experiments = await AnalyticsExperimentEvidence.plans(transaction, versionIdentifiers);
    statements.push(
      ...AnalyticsAcquisitionOptionsRead.prepare(query, versionIdentifiers, now),
      ...AnalyticsExperimentEvidence.prepare(experiments, query, now),
    );

    return { query, now, previous, publications, experiments, statements };
  },

  project(
    plan: AnalyticsInsightsReadPlan,
    aggregates: AnalyticsAggregates,
    report: AnalyticsReport,
    batch: AnalyticsResultBatch,
  ): AnalyticsInsights {
    const { query, now, previous, publications, experiments } = plan;
    const { businessOutcomes, trend, acquisition, results, stepTimings } = report;
    const trendByDate = new Map(trend.map((row) => [row.date, row]));
    const quality = report.quality[0];
    const previousCounts = previous
      ? AnalyticsRows.validate(batch.next(), Validators.counts)[0]
      : undefined;
    const bounds = AnalyticsPeriod.bounds(query, now);

    return {
      acquisitionOptions: AnalyticsAcquisitionOptionsRead.project(batch),
      experiments: AnalyticsExperimentEvidence.project(experiments, query, now, batch),
      businessOutcomes,
      period: {
        from: query.from ?? null,
        to: query.to ?? null,
        timezone: query.timezone ?? 'UTC',
        conversionWindowHours: query.conversionWindowHours ?? null,
      },
      trend: AnalyticsPeriod.days(query, now).map(
        (day) => trendByDate.get(day.date) ?? { date: day.date, started: 0, results: 0, clicks: 0 },
      ),
      trendFrom: bounds.from,
      trendTo: bounds.to,
      previousPeriod:
        previous?.from && previous.to && previousCounts
          ? { from: previous.from, to: previous.to, ...previousCounts }
          : null,
      acquisition: acquisition.slice(0, AnalyticsPolicy.MaximumInsightGroups),
      acquisitionHasMore: acquisition.length > AnalyticsPolicy.MaximumInsightGroups,
      results: results.slice(0, AnalyticsPolicy.MaximumInsightGroups),
      resultsHasMore: results.length > AnalyticsPolicy.MaximumInsightGroups,
      quality: {
        latestEventAt: quality?.latestEventAt
          ? new Date(quality.latestEventAt).toISOString()
          : null,
        missingStepViews: aggregates.steps.reduce(
          (sum, step) => sum + step.completed - step.observedCompleted,
          0,
        ),
        openSessions: quality?.openSessions ?? 0,
        matureSessions: quality?.matureSessions ?? 0,
      },
      stepTimings,
      publications: publications
        .slice(0, AnalyticsPolicy.MaximumInsightGroups)
        .map((publication) => ({
          occurredAt: publication.createdAt.toISOString(),
          versionIdentifier: publication.targetVersionIdentifier,
          revision: publication.revision,
          action: publication.action,
        })),
      publicationsHasMore: publications.length > AnalyticsPolicy.MaximumInsightGroups,
    };
  },
} as const;
