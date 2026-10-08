import { isUndefined, isNull } from 'es-toolkit/predicate';
import { AnalyticsSessionTimeline } from './analytics-session-timeline.js';
import type { AnalyticsSessionResponse } from './analytics-session-types.js';
import { AnalyticsInsightsRead } from './analytics-insights.js';
import { Inject, Injectable } from '@nestjs/common';
import { DatabaseReadService } from '../database/database-read.service.js';
import type { DatabaseReadSnapshot } from '../database/database-read-types.js';
import { AnalyticsResultBatch } from './analytics-result-batch.js';
import { AnalyticsInputs } from './analytics-inputs.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsResults } from './analytics-results.js';
import { AnalyticsProjection } from './analytics-projection.js';
import type { AnalyticsResponse } from './analytics-response.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AnalyticsAggregates, AnalyticsQuery } from './analytics-types.js';

const AnalyticsReadModel = {
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
    snapshot: DatabaseReadSnapshot,
    query: AnalyticsQuery,
    now: Date,
  ): Promise<AnalyticsResponse> {
    const page = await snapshot.transaction.funnelVersion.findMany(
      AnalyticsQueries.versions(query),
    );
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
    const plan = await AnalyticsInsightsRead.prepare(
      snapshot.transaction,
      query,
      versions.map((version) => version.identifier),
      now,
    );
    const statements = [
      AnalyticsQueries.summary(cohort),
      AnalyticsQueries.steps(cohort),
      AnalyticsQueries.edges(cohort),
      ...plan.statements,
    ];
    const batch = new AnalyticsResultBatch(await snapshot.queryMany(statements), statements.length);
    const rawAggregates: AnalyticsAggregates = {
      summaries: AnalyticsResults.summaries(batch.next()),
      steps: AnalyticsResults.steps(batch.next()),
      edges: AnalyticsResults.edges(batch.next()),
    };
    const aggregates = AnalyticsProjection.group(rawAggregates);
    const insights = AnalyticsInsightsRead.project(plan, rawAggregates, batch);

    return {
      ...metadata,
      insights,
      versions: versions.map((version) => AnalyticsProjection.version(version, aggregates)),
    };
  },
} as const;

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DatabaseReadService) private readonly database: DatabaseReadService) {}

  async sessions(input: unknown): Promise<AnalyticsSessionResponse> {
    const { query, selection } = AnalyticsSessionTimeline.input(input);

    return this.database.read(
      (snapshot) =>
        AnalyticsSessionTimeline.read(snapshot.transaction, query, selection, new Date()),
      { timeout: AnalyticsPolicy.TransactionTimeout },
    );
  }

  async read(input: unknown): Promise<AnalyticsResponse> {
    const query = AnalyticsInputs.query(input);
    const now = new Date();

    return this.database.read(
      async (snapshot) =>
        AnalyticsReadModel.read(
          snapshot,
          await AnalyticsReadModel.defaultVersion(snapshot.transaction, query),
          now,
        ),
      { timeout: AnalyticsPolicy.TransactionTimeout },
    );
  }
}
