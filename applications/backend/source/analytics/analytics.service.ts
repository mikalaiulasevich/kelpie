import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { AnalyticsInputs } from './analytics-inputs.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsResults } from './analytics-results.js';
import { AnalyticsProjection } from './analytics-projection.js';
import { isUndefined } from 'es-toolkit/predicate';
import type { AnalyticsResponse } from './analytics-response.js';
import { AnalyticsPolicy } from './analytics-policy.js';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async read(input: unknown): Promise<AnalyticsResponse> {
    const query = AnalyticsInputs.query(input);
    const now = new Date();

    return this.database.client.$transaction(
      async (transaction) => {
        const page = await transaction.funnelVersion.findMany({
          where: {
            funnelIdentifier: query.funnelIdentifier,
            ...(!isUndefined(query.versionIdentifier)
              ? { identifier: query.versionIdentifier }
              : {}),
          },
          orderBy: { version: 'desc' },
          take: query.limit + 1,
          skip: query.offset,
        });
        const versions = page.slice(0, query.limit);
        const metadata = {
          generatedAt: now.toISOString(),
          filters: query,
          pagination: {
            limit: query.limit,
            offset: query.offset,
            hasMore: page.length > query.limit,
          },
        };
        if (versions.length === 0) {
          return { ...metadata, versions: [] };
        }

        const cohort = AnalyticsQueries.cohort(
          query,
          versions.map((version) => version.identifier),
          now,
        );
        const summaries = AnalyticsResults.summaries(
          await transaction.$queryRaw<unknown[]>(AnalyticsQueries.summary(cohort)),
        );
        const steps = AnalyticsResults.steps(
          await transaction.$queryRaw<unknown[]>(AnalyticsQueries.steps(cohort)),
        );
        const edges = AnalyticsResults.edges(
          await transaction.$queryRaw<unknown[]>(AnalyticsQueries.edges(cohort)),
        );

        const aggregates = AnalyticsProjection.group({ summaries, steps, edges });

        return {
          ...metadata,
          versions: versions.map((version) => AnalyticsProjection.version(version, aggregates)),
        };
      },
      { timeout: AnalyticsPolicy.TransactionTimeout },
    );
  }
}
