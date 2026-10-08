import assert from 'node:assert/strict';
import { isPlainObject, isString } from 'es-toolkit/predicate';
import { Prisma } from '../../generated/prisma/client.js';
import { AnalyticsInputs } from '../../source/analytics/analytics-inputs.js';
import { AnalyticsQueries } from '../../source/analytics/analytics-queries.js';
import type { BackendApplicationFixture } from '../fixtures/backend-application.js';

const QueryPlanMessages = {
  InvalidRow: 'The database returned an invalid query-plan detail.',
} as const;

export const TrafficQueryPlans = {
  async capture(backend: BackendApplicationFixture, versionIdentifiers: readonly string[]) {
    const query = AnalyticsInputs.query({
      funnelIdentifier: 'workstyle-planner',
      trafficOrigin: 'synthetic',
      includeForced: 'true',
    });
    const cohort = AnalyticsQueries.cohort(query, versionIdentifiers, new Date());
    const statements = {
      summary: AnalyticsQueries.summary(cohort),
      steps: AnalyticsQueries.steps(cohort),
      edges: AnalyticsQueries.edges(cohort),
    };
    const plans: Record<string, string[]> = {};

    for (const [name, statement] of Object.entries(statements)) {
      const rows = await backend.database.$queryRaw<unknown[]>(
        Prisma.sql`EXPLAIN QUERY PLAN ${statement}`,
      );
      plans[name] = rows.map((row) => {
        assert.ok(isPlainObject(row) && isString(row.detail), QueryPlanMessages.InvalidRow);

        return row.detail;
      });
    }

    return plans;
  },
} as const;
