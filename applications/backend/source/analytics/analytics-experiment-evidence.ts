import type { AnalyticsResultBatch } from './analytics-result-batch.js';
import type { AnalyticsExperimentPlan } from './analytics-read-types.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ConfigurationImportDocument } from '../configurations/configuration-import-document.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { AnalyticsExperimentStatistics } from './analytics-experiment-statistics.js';
import {
  AnalyticsInsightSchemas,
  type AnalyticsExperimentCountRow,
  type AnalyticsExperimentRow,
} from './analytics-insight-types.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsRows } from './analytics-results.js';
import type { AnalyticsQuery } from './analytics-types.js';

const Validators = {
  counts: SchemaCompiler.compile<AnalyticsExperimentCountRow>(
    AnalyticsInsightSchemas.ExperimentCountRow,
  ),
} as const;

export const AnalyticsExperimentEvidence = {
  async plans(
    transaction: Prisma.TransactionClient,
    versionIdentifiers: readonly string[],
  ): Promise<readonly AnalyticsExperimentPlan[]> {
    return transaction.experimentPlan.findMany({
      where: { versionIdentifier: { in: [...versionIdentifiers] } },
      include: { version: { select: { document: true } } },
    });
  },

  prepare(
    plans: readonly AnalyticsExperimentPlan[],
    query: AnalyticsQuery,
    now: Date,
  ): readonly Prisma.Sql[] {
    return plans.map((plan) => {
      const cohort = AnalyticsQueries.cohort(
        {
          funnelIdentifier: query.funnelIdentifier,
          trafficOrigin: query.trafficOrigin,
          includeForced: false,
          limit: query.limit,
          offset: 0,
          from: plan.createdAt.toISOString(),
          to: plan.plannedEndAt.toISOString(),
          ...(plan.conversionWindowHours
            ? { conversionWindowHours: plan.conversionWindowHours }
            : {}),
        },
        [plan.versionIdentifier],
        now,
      );
      const converted =
        plan.primaryMetric === 'recommendation_open'
          ? Prisma.sql`EXISTS (SELECT 1 FROM eligible_events e WHERE e."sessionIdentifier" = c.identifier AND e.name = 'cta_clicked' AND e.source = 'client')`
          : Prisma.sql`EXISTS (SELECT 1 FROM "BusinessOutcome" o WHERE o."sessionIdentifier" = c.identifier AND o.kind = ${plan.primaryMetric} AND ${AnalyticsQueries.timestamp(Prisma.sql`o."occurredAt"`)} >= c."startedAt" AND ${AnalyticsQueries.timestamp(Prisma.sql`o."occurredAt"`)} <= c.deadline)`;

      return Prisma.sql`${cohort} SELECT c.variant, COUNT(*) AS started, SUM(${converted}) AS converted FROM cohort c JOIN "Session" s ON s.identifier = c.identifier WHERE s."assignmentSource" = 'random' GROUP BY c.variant`;
    });
  },

  project(
    plans: readonly AnalyticsExperimentPlan[],
    query: AnalyticsQuery,
    now: Date,
    batch: AnalyticsResultBatch,
  ): readonly AnalyticsExperimentRow[] {
    return plans.map((plan) => {
      const rows = AnalyticsRows.validate(batch.next(), Validators.counts);
      const first = rows.find((row) => row.variant === 'A') ?? { started: 0, converted: 0 };
      const second = rows.find((row) => row.variant === 'B') ?? { started: 0, converted: 0 };
      const variants = ConfigurationImportDocument.validate(plan.version.document).experiment
        .variants;
      const allocation = variants.A.weight / (variants.A.weight + variants.B.weight);

      return {
        versionIdentifier: plan.versionIdentifier,
        primaryMetric: plan.primaryMetric,
        cohortFrom: plan.createdAt.toISOString(),
        cohortTo: new Date(Math.min(plan.plannedEndAt.getTime(), now.getTime())).toISOString(),
        plannedEndAt: plan.plannedEndAt.toISOString(),
        targetSamplePerVariant: plan.targetSamplePerVariant,
        expectedAllocationA: allocation,
        startedA: first.started,
        startedB: second.started,
        convertedA: first.converted,
        convertedB: second.converted,
        sampleTargetReached: Math.min(first.started, second.started) >= plan.targetSamplePerVariant,
        plannedEndReached: now >= plan.plannedEndAt,
        followUpComplete: Boolean(
          plan.conversionWindowHours &&
          now.getTime() >=
            plan.plannedEndAt.getTime() +
              plan.conversionWindowHours * AnalyticsPolicy.MillisecondsPerHour,
        ),
        trafficOrigin: query.trafficOrigin,
        conversionWindowHours: plan.conversionWindowHours ?? null,
        ...AnalyticsExperimentStatistics.evidence(first, second, allocation),
      };
    });
  },
} as const;
