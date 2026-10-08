import { Prisma } from '../../generated/prisma/client.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsPolicy } from './analytics-policy.js';

export const AnalyticsInsightQueries = {
  businessOutcomes(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort} SELECT o.kind, COUNT(DISTINCT c.identifier) AS sessions,
      COUNT(DISTINCT CASE WHEN o.provenance = 'manual' THEN c.identifier END) AS "manualSessions",
      COUNT(DISTINCT CASE WHEN o.provenance = 'integration' THEN c.identifier END) AS "integrationSessions"
      FROM "BusinessOutcome" o JOIN cohort c ON c.identifier = o."sessionIdentifier"
      WHERE ${AnalyticsQueries.timestamp(Prisma.sql`o."occurredAt"`)} >= c."startedAt"
        AND ${AnalyticsQueries.timestamp(Prisma.sql`o."occurredAt"`)} <= c.deadline
      GROUP BY o.kind ORDER BY o.kind`;
  },

  totals(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${AnalyticsQueries.outcomes(cohort)}
      SELECT COUNT(*) AS started, COALESCE(SUM(result), 0) AS results, COALESCE(SUM(clicked), 0) AS clicks FROM outcomes`;
  },

  trend(cohort: Prisma.Sql, buckets: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${AnalyticsQueries.outcomes(cohort)}, daily AS (
      SELECT ${buckets} AS date, c.result, c.clicked FROM outcomes c
    ) SELECT date, COUNT(*) AS started, SUM(result) AS results, SUM(clicked) AS clicks
      FROM daily WHERE date IS NOT NULL GROUP BY date ORDER BY date`;
  },

  acquisition(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${AnalyticsQueries.outcomes(cohort)}
      SELECT source, medium, campaign, COUNT(*) AS started, SUM(result) AS results, SUM(clicked) AS clicks
      FROM outcomes GROUP BY source, medium, campaign ORDER BY started DESC, source, medium, campaign
      LIMIT ${AnalyticsPolicy.MaximumInsightGroups + 1}`;
  },

  results(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort}, result_sessions AS (
      SELECT e."sessionIdentifier", json_extract(e.properties, '$.result_id') AS "resultIdentifier",
        MAX(e.name = 'result_viewed') AS viewed, MAX(e.name = 'cta_clicked') AS clicked
      FROM eligible_events e WHERE e.name IN ('result_viewed', 'cta_clicked') AND e.source = 'client'
        AND json_type(e.properties, '$.result_id') = 'text'
      GROUP BY e."sessionIdentifier", json_extract(e.properties, '$.result_id')
    ) SELECT r."resultIdentifier", COUNT(*) AS sessions, SUM(r.clicked) AS clicks
      FROM result_sessions r WHERE r.viewed = 1
      GROUP BY r."resultIdentifier" ORDER BY sessions DESC, r."resultIdentifier"
      LIMIT ${AnalyticsPolicy.MaximumInsightGroups + 1}`;
  },

  quality(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort}
      SELECT (SELECT MAX(${AnalyticsQueries.timestamp(Prisma.sql`e."serverTimestamp"`)})
        FROM "Event" e JOIN cohort c ON c."identifier" = e."sessionIdentifier") AS "latestEventAt",
        COALESCE(SUM(NOT "conversionMature"), 0) AS "openSessions", COALESCE(SUM("conversionMature"), 0) AS "matureSessions"
      FROM cohort`;
  },

  stepTimings(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort}, first_views AS (
      SELECT e."sessionIdentifier", e."stepIdentifier", MIN(${AnalyticsQueries.timestamp(Prisma.sql`e."serverTimestamp"`)}) AS viewed
      FROM view_events e
      GROUP BY e."sessionIdentifier", e."stepIdentifier"
    ), durations AS (
      SELECT c."versionIdentifier", c.variant, v."sessionIdentifier", v."stepIdentifier",
        MIN(${AnalyticsQueries.timestamp(Prisma.sql`t."createdAt"`)}) - v.viewed AS duration
      FROM first_views v JOIN cohort c ON c.identifier = v."sessionIdentifier"
      JOIN "SessionTransition" t ON t."sessionIdentifier" = v."sessionIdentifier" AND t."fromStepIdentifier" = v."stepIdentifier"
        AND t.kind = 'forward' AND ${AnalyticsQueries.timestamp(Prisma.sql`t."createdAt"`)} >= v.viewed
        AND ${AnalyticsQueries.timestamp(Prisma.sql`t."createdAt"`)} <= c.deadline
      GROUP BY c."versionIdentifier", c.variant, v."sessionIdentifier", v."stepIdentifier"
    ) SELECT "versionIdentifier", variant, "stepIdentifier", COUNT(*) AS "observedSessions", AVG(duration) / 1000.0 AS "averageSeconds"
      FROM durations GROUP BY "versionIdentifier", variant, "stepIdentifier"`;
  },
} as const;
