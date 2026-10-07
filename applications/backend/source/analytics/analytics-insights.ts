import { Prisma } from '../../generated/prisma/client.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { AnalyticsInsightSchemas, type AnalyticsInsights, type AnalyticsTrendRow, type AnalyticsAcquisitionRow, type AnalyticsResultRow, type AnalyticsQualityRow, type AnalyticsStepTimingRow, type AnalyticsCounts } from './analytics-insight-types.js';
import { AnalyticsInsightQueries } from './analytics-insight-queries.js';
import { AnalyticsPeriod } from './analytics-period.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsRows } from './analytics-results.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import type { AnalyticsQuery, AnalyticsAggregates } from './analytics-types.js';

const Validators = {
  trend: SchemaCompiler.compile<AnalyticsTrendRow>(AnalyticsInsightSchemas.TrendRow),
  acquisition: SchemaCompiler.compile<AnalyticsAcquisitionRow>(AnalyticsInsightSchemas.AcquisitionRow),
  result: SchemaCompiler.compile<AnalyticsResultRow>(AnalyticsInsightSchemas.ResultRow),
  quality: SchemaCompiler.compile<AnalyticsQualityRow>(AnalyticsInsightSchemas.QualityRow),
  timing: SchemaCompiler.compile<AnalyticsStepTimingRow>(AnalyticsInsightSchemas.StepTimingRow),
  counts: SchemaCompiler.compile<AnalyticsCounts>(AnalyticsInsightSchemas.Counts),
};

export const AnalyticsInsightsRead = {
  async read(transaction: Prisma.TransactionClient, query: AnalyticsQuery, versionIdentifiers: readonly string[], now: Date, aggregates: AnalyticsAggregates): Promise<AnalyticsInsights> {
    const cohort = AnalyticsQueries.cohort(query, versionIdentifiers, now);
    const trend = AnalyticsRows.validate(await transaction.$queryRaw<unknown[]>(AnalyticsInsightQueries.trend(cohort, AnalyticsPeriod.buckets(query, now))), Validators.trend);
    const acquisition = AnalyticsRows.validate(await transaction.$queryRaw<unknown[]>(AnalyticsInsightQueries.acquisition(cohort)), Validators.acquisition);
    const results = AnalyticsRows.validate(await transaction.$queryRaw<unknown[]>(AnalyticsInsightQueries.results(cohort)), Validators.result);
    const quality = AnalyticsRows.validate(await transaction.$queryRaw<unknown[]>(AnalyticsInsightQueries.quality(cohort)), Validators.quality)[0];
    const stepTimings = AnalyticsRows.validate(await transaction.$queryRaw<unknown[]>(AnalyticsInsightQueries.stepTimings(cohort)), Validators.timing);
    const previous = AnalyticsPeriod.previous(query);
    const previousCounts = previous ? AnalyticsRows.validate(await transaction.$queryRaw<unknown[]>(AnalyticsInsightQueries.totals(AnalyticsQueries.cohort(previous, versionIdentifiers, now))), Validators.counts)[0] : undefined;
    const bounds = AnalyticsPeriod.bounds(query, now);
    const publications = await transaction.publication.findMany({
      where: { funnelIdentifier: query.funnelIdentifier, createdAt: { gte: new Date(bounds.from), lt: new Date(bounds.to) } },
      select: { createdAt: true, targetVersionIdentifier: true, revision: true, action: true },
      orderBy: { createdAt: 'asc' },
      take: AnalyticsPolicy.MaximumInsightGroups + 1,
    });

    return {
      period: { from: query.from ?? null, to: query.to ?? null, timezone: query.timezone ?? 'UTC', conversionWindowHours: query.conversionWindowHours ?? null },
      trend,
      trendFrom: bounds.from,
      trendTo: bounds.to,
      previousPeriod: previous?.from && previous.to && previousCounts ? { from: previous.from, to: previous.to, ...previousCounts } : null,
      acquisition: acquisition.slice(0, AnalyticsPolicy.MaximumInsightGroups),
      acquisitionHasMore: acquisition.length > AnalyticsPolicy.MaximumInsightGroups,
      results: results.slice(0, AnalyticsPolicy.MaximumInsightGroups),
      resultsHasMore: results.length > AnalyticsPolicy.MaximumInsightGroups,
      quality: { latestEventAt: quality?.latestEventAt ? new Date(quality.latestEventAt).toISOString() : null, missingStepViews: aggregates.steps.reduce((sum, step) => sum + step.completed - step.observedCompleted, 0), openSessions: quality?.openSessions ?? 0, matureSessions: quality?.matureSessions ?? 0 },
      stepTimings,
      publications: publications.slice(0, AnalyticsPolicy.MaximumInsightGroups).map((publication) => ({ occurredAt: publication.createdAt.toISOString(), versionIdentifier: publication.targetVersionIdentifier, revision: publication.revision, action: publication.action })),
      publicationsHasMore: publications.length > AnalyticsPolicy.MaximumInsightGroups,
    };
  },
} as const;
