import { isUndefined, isNull } from 'es-toolkit/predicate';
import { AnalyticsSessionTimeline } from './analytics-session-timeline.js';
import type { AnalyticsSessionResponse } from './analytics-session-types.js';
import { AnalyticsInsightsRead } from './analytics-insights.js';
import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AnalyticsInputs } from './analytics-inputs.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsResults } from './analytics-results.js';
import { AnalyticsProjection } from './analytics-projection.js';
import type { AnalyticsResponse } from './analytics-response.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AnalyticsAggregates, AnalyticsQuery } from './analytics-types.js';

const AnalyticsReadModel = {
  async aggregates(
    transaction: Prisma.TransactionClient,
    cohort: Prisma.Sql,
  ): Promise<AnalyticsAggregates> {
    const summaries = AnalyticsResults.summaries(
      await transaction.$queryRaw<unknown[]>(AnalyticsQueries.summary(cohort)),
    );
    const steps = AnalyticsResults.steps(
      await transaction.$queryRaw<unknown[]>(AnalyticsQueries.steps(cohort)),
    );
    const edges = AnalyticsResults.edges(
      await transaction.$queryRaw<unknown[]>(AnalyticsQueries.edges(cohort)),
    );

    return { summaries, steps, edges };
  },

  async defaultVersion(
    transaction: Prisma.TransactionClient,
    query: AnalyticsQuery,
  ): Promise<AnalyticsQuery> {
    if (!isUndefined(query.versionIdentifier)) {
      return query;
    }

    const funnel = await transaction.funnel.findUnique({
      where: { identifier: query.funnelIdentifier },
      select: { activeVersionIdentifier: true },
    });

    if (isNull(funnel) || isNull(funnel.activeVersionIdentifier)) {
      return query;
    }

    return { ...query, versionIdentifier: funnel.activeVersionIdentifier };
  },

  async read(
    transaction: Prisma.TransactionClient,
    query: AnalyticsQuery,
    now: Date,
  ): Promise<AnalyticsResponse> {
    const page = await transaction.funnelVersion.findMany(AnalyticsQueries.versions(query));
    const versions = page.slice(0, query.limit);
    const metadata = AnalyticsProjection.metadata(query, page.length, now);

    if (versions.length === 0) {
      return { ...metadata, versions: [] };
    }

    const cohort = AnalyticsQueries.cohort(
      query,
      versions.map((version) => version.identifier),
      now,
    );
    const rawAggregates = await AnalyticsReadModel.aggregates(transaction, cohort);
    const aggregates = AnalyticsProjection.group(rawAggregates);
    const insights = await AnalyticsInsightsRead.read(
      transaction,
      query,
      versions.map((version) => version.identifier),
      now,
      rawAggregates,
    );

    return {
      ...metadata,
      insights,
      versions: versions.map((version) => AnalyticsProjection.version(version, aggregates)),
    };
  },
} as const;

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async sessions(input: unknown): Promise<AnalyticsSessionResponse> {
    const { query, selection } = AnalyticsSessionTimeline.input(input);

    return this.database.client.$transaction(
      (transaction) => AnalyticsSessionTimeline.read(transaction, query, selection, new Date()),
      { timeout: AnalyticsPolicy.TransactionTimeout },
    );
  }

  async read(input: unknown): Promise<AnalyticsResponse> {
    const query = AnalyticsInputs.query(input);
    const now = new Date();

    return this.database.client.$transaction(
      async (transaction) =>
        AnalyticsReadModel.read(
          transaction,
          await AnalyticsReadModel.defaultVersion(transaction, query),
          now,
        ),
      { timeout: AnalyticsPolicy.TransactionTimeout },
    );
  }
}
