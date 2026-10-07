import { isUndefined } from 'es-toolkit/predicate';
import { Prisma } from '../../generated/prisma/client.js';
import { AnalyticsTrafficOrigin } from './analytics-policy.js';
import type { AnalyticsQuery } from './analytics-types.js';

export const AnalyticsQueries = {
  cohort(query: AnalyticsQuery, versionIdentifiers: readonly string[], now: Date): Prisma.Sql {
    const conditions = [
      Prisma.sql`s."versionIdentifier" IN (${Prisma.join([...versionIdentifiers])})`,
    ];
    if (!query.includeForced) {
      conditions.push(Prisma.sql`s."assignmentSource" <> 'forced'`);
    }

    if (query.trafficOrigin !== AnalyticsTrafficOrigin.All) {
      conditions.push(Prisma.sql`s."trafficOrigin" = ${query.trafficOrigin}`);
    }

    if (!isUndefined(query.campaign)) {
      conditions.push(Prisma.sql`s."campaign" = ${query.campaign}`);
    }

    return Prisma.sql`WITH cohort AS (
      SELECT s."identifier", s."versionIdentifier", s."variant",
        CASE WHEN typeof(s."expiresAt") IN ('integer', 'real')
          THEN s."expiresAt" <= ${now.getTime()}
          ELSE julianday(s."expiresAt") <= julianday(${now.toISOString()}) END AS expired
      FROM "Session" s
      WHERE ${Prisma.join(conditions, ' AND ')}
        AND EXISTS (SELECT 1 FROM "Event" e WHERE e."sessionIdentifier" = s."identifier"
          AND e."name" = 'session_started' AND e."source" = 'server')
    ), views AS (
      SELECT DISTINCT e."sessionIdentifier", e."stepIdentifier"
      FROM "Event" e JOIN cohort c ON c."identifier" = e."sessionIdentifier"
      WHERE e."name" = 'step_viewed' AND e."source" = 'client' AND e."stepIdentifier" IS NOT NULL
    ), forwards AS (
      SELECT DISTINCT t."sessionIdentifier", t."fromStepIdentifier", t."toStepIdentifier"
      FROM "SessionTransition" t JOIN cohort c ON c."identifier" = t."sessionIdentifier"
      WHERE t."kind" = 'forward'
    ), completions AS (
      SELECT DISTINCT "sessionIdentifier", "fromStepIdentifier" FROM forwards
    )`;
  },

  summary(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort}, outcomes AS (
      SELECT c.*,
        EXISTS (SELECT 1 FROM "Event" e WHERE e."sessionIdentifier" = c."identifier" AND e."name" = 'result_viewed' AND e."source" = 'client') AS result,
        EXISTS (SELECT 1 FROM "Event" e WHERE e."sessionIdentifier" = c."identifier" AND e."name" = 'cta_clicked' AND e."source" = 'client') AS clicked
      FROM cohort c
    )
    SELECT "versionIdentifier", "variant", COUNT(*) AS started,
      SUM(result) AS results, SUM(clicked) AS clicks, SUM(result AND clicked) AS "resultClicks"
    FROM outcomes GROUP BY "versionIdentifier", "variant"`;
  },

  steps(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort}, step_facts AS (
      SELECT "sessionIdentifier", "stepIdentifier" FROM views
      UNION SELECT "sessionIdentifier", "fromStepIdentifier" FROM completions
    )
    SELECT c."versionIdentifier", c."variant", facts."stepIdentifier",
      SUM(v."sessionIdentifier" IS NOT NULL) AS reached,
      SUM(f."sessionIdentifier" IS NOT NULL) AS completed,
      SUM(v."sessionIdentifier" IS NOT NULL AND f."sessionIdentifier" IS NOT NULL) AS "observedCompleted",
      SUM(v."sessionIdentifier" IS NOT NULL AND c.expired) AS "expiredReached",
      SUM(v."sessionIdentifier" IS NOT NULL AND f."sessionIdentifier" IS NULL AND NOT c.expired) AS "openNoncompletion",
      SUM(v."sessionIdentifier" IS NOT NULL AND f."sessionIdentifier" IS NULL AND c.expired) AS "expiredNoncompletion"
    FROM step_facts facts JOIN cohort c ON c."identifier" = facts."sessionIdentifier"
    LEFT JOIN views v ON v."sessionIdentifier" = facts."sessionIdentifier" AND v."stepIdentifier" = facts."stepIdentifier"
    LEFT JOIN completions f ON f."sessionIdentifier" = facts."sessionIdentifier" AND f."fromStepIdentifier" = facts."stepIdentifier"
    GROUP BY c."versionIdentifier", c."variant", facts."stepIdentifier"`;
  },

  edges(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort}, source_counts AS (
      SELECT c."versionIdentifier", c."variant", f."fromStepIdentifier", COUNT(*) AS completed
      FROM completions f JOIN cohort c ON c."identifier" = f."sessionIdentifier"
      GROUP BY c."versionIdentifier", c."variant", f."fromStepIdentifier"
    ), view_counts AS (
      SELECT c."versionIdentifier", c."variant", v."stepIdentifier", COUNT(*) AS reached
      FROM views v JOIN cohort c ON c."identifier" = v."sessionIdentifier"
      GROUP BY c."versionIdentifier", c."variant", v."stepIdentifier"
    )
    SELECT c."versionIdentifier", c."variant", f."fromStepIdentifier", f."toStepIdentifier",
      COUNT(*) AS transitions, sc.completed AS "sourceCompleted", COALESCE(vc.reached, 0) AS "sourceReached",
      SUM(source."sessionIdentifier" IS NOT NULL AND destination."sessionIdentifier" IS NOT NULL) AS observed,
      SUM(destination."sessionIdentifier" IS NOT NULL) AS "destinationReached",
      SUM(destination."sessionIdentifier" IS NULL AND NOT c.expired) AS "openNonreach",
      SUM(destination."sessionIdentifier" IS NULL AND c.expired) AS "expiredNonreach"
    FROM forwards f JOIN cohort c ON c."identifier" = f."sessionIdentifier"
    JOIN source_counts sc ON sc."versionIdentifier" = c."versionIdentifier" AND sc."variant" = c."variant" AND sc."fromStepIdentifier" = f."fromStepIdentifier"
    LEFT JOIN view_counts vc ON vc."versionIdentifier" = c."versionIdentifier" AND vc."variant" = c."variant" AND vc."stepIdentifier" = f."fromStepIdentifier"
    LEFT JOIN views source ON source."sessionIdentifier" = f."sessionIdentifier" AND source."stepIdentifier" = f."fromStepIdentifier"
    LEFT JOIN views destination ON destination."sessionIdentifier" = f."sessionIdentifier" AND destination."stepIdentifier" = f."toStepIdentifier"
    GROUP BY c."versionIdentifier", c."variant", f."fromStepIdentifier", f."toStepIdentifier"
    ORDER BY c."versionIdentifier", c."variant", f."fromStepIdentifier", f."toStepIdentifier"`;
  },
} as const;
