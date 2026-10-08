import { Prisma } from '../../generated/prisma/client.js';
import { AnalyticsQueries } from '../../source/analytics/analytics-queries.js';
import { AnalyticsInsightQueries } from '../../source/analytics/analytics-insight-queries.js';
import { AnalyticsInputs } from '../../source/analytics/analytics-inputs.js';

export const EventCoveringIndexCases = {
  forVersion(versionIdentifier: string, sessionIdentifier: string) {
    const cohort = AnalyticsQueries.cohort(
      AnalyticsInputs.query({ funnelIdentifier: 'test-funnel', trafficOrigin: 'synthetic' }),
      [versionIdentifier],
      new Date('2026-10-08T12:00:00.000Z'),
    );

    return [
      { name: 'server start and observed outcomes', statement: AnalyticsQueries.summary(cohort) },
      { name: 'step views', statement: AnalyticsQueries.steps(cohort) },
      { name: 'latest server timestamp', statement: AnalyticsInsightQueries.quality(cohort) },
      {
        name: 'isolated quality timestamp probe',
        statement: Prisma.sql`SELECT MAX(${AnalyticsQueries.timestamp(Prisma.sql`e."serverTimestamp"`)}) FROM "Event" e WHERE e."sessionIdentifier" = ${sessionIdentifier}`,
      },
      {
        name: 'bounded event probe',
        statement: Prisma.sql`SELECT "stepIdentifier", "serverTimestamp" FROM "Event" WHERE "sessionIdentifier" = ${sessionIdentifier} AND name = ${'step_viewed'} AND source = ${'client'} AND "serverTimestamp" <= ${'2026-10-08T12:00:00.000+00:00'}`,
      },
    ];
  },
} as const;
