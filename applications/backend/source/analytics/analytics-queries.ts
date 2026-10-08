import { isUndefined } from 'es-toolkit/predicate';
import { Prisma } from '../../generated/prisma/client.js';
import { AnalyticsPolicy, AnalyticsTrafficOrigin } from './analytics-policy.js';
import type { AnalyticsQuery } from './analytics-types.js';

export const AnalyticsQueries = {
  timestamp(column: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`CASE WHEN typeof(${column}) IN ('integer', 'real') THEN ${column} ELSE CAST(ROUND((julianday(${column}) - 2440587.5) * 86400000) AS INTEGER) END`;
  },

  versions(query: AnalyticsQuery): Prisma.FunnelVersionFindManyArgs {
    const where: Prisma.FunnelVersionWhereInput = { funnelIdentifier: query.funnelIdentifier };

    if (!isUndefined(query.versionIdentifier)) {
      where.identifier = query.versionIdentifier;
    }

    return {
      where,
      orderBy: { version: 'desc' },
      take: query.limit + 1,
      skip: query.offset,
    };
  },

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
      conditions.push(
        query.campaign === ''
          ? Prisma.sql`(s."campaign" IS NULL OR s."campaign" = '')`
          : Prisma.sql`s."campaign" = ${query.campaign}`,
      );
    }

    for (const [parameter, path] of [
      [query.source, '$.utm_source'],
      [query.medium, '$.utm_medium'],
    ]) {
      if (!isUndefined(parameter)) {
        conditions.push(
          Prisma.sql`COALESCE(json_extract(s."acquisitionParameters", ${path}), '') = ${parameter}`,
        );
      }
    }

    const startedAt = AnalyticsQueries.timestamp(Prisma.sql`s."createdAt"`);
    conditions.push(Prisma.sql`${startedAt} <= ${now.getTime()}`);
    const conversionDeadline = isUndefined(query.conversionWindowHours)
      ? Prisma.sql`${Number.MAX_SAFE_INTEGER}`
      : Prisma.sql`${startedAt} + ${query.conversionWindowHours * AnalyticsPolicy.MillisecondsPerHour}`;

    const deadline = Prisma.sql`MIN(${conversionDeadline}, ${now.getTime()})`;

    if (query.from && query.to) {
      conditions.push(
        Prisma.sql`${startedAt} >= ${Date.parse(query.from)} AND ${startedAt} < ${Date.parse(query.to)}`,
      );
    }

    // Sort candidates before indexed event probes to avoid random UUID page access on remote SQLite.
    // Materialization keeps the server-start check after this ordering boundary.
    return Prisma.sql`WITH session_candidates AS MATERIALIZED (
      SELECT s."identifier", s."versionIdentifier", s."variant",
        ${startedAt} AS "startedAt", ${deadline} AS deadline,
        ${conversionDeadline} <= ${now.getTime()} AS "conversionMature",
        COALESCE(json_extract(s."acquisitionParameters", '$.utm_source'), '') AS source,
        COALESCE(json_extract(s."acquisitionParameters", '$.utm_medium'), '') AS medium,
        COALESCE(s."campaign", '') AS campaign,
        CASE WHEN typeof(s."expiresAt") IN ('integer', 'real')
          THEN s."expiresAt" <= ${now.getTime()}
          ELSE julianday(s."expiresAt") <= julianday(${now.toISOString()}) END OR ${conversionDeadline} <= ${now.getTime()} AS expired
      FROM "Session" s
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY s."identifier"
    ), cohort AS MATERIALIZED (
      SELECT candidate.* FROM session_candidates candidate
      WHERE EXISTS (SELECT 1 FROM "Event" e WHERE e."sessionIdentifier" = candidate."identifier"
          AND e."name" = 'session_started' AND e."source" = 'server')
      ORDER BY candidate."identifier"
    ), eligible_events AS (
      SELECT e.* FROM cohort c CROSS JOIN "Event" e ON e."sessionIdentifier" = c."identifier"
      WHERE ${AnalyticsQueries.timestamp(Prisma.sql`e."serverTimestamp"`)} <= c.deadline
    ), view_events AS (
      SELECT e."sessionIdentifier", e."stepIdentifier", e."serverTimestamp"
      FROM cohort c CROSS JOIN "Event" e ON e."sessionIdentifier" = c."identifier"
      WHERE e."name" = 'step_viewed' AND e."source" = 'client' AND e."stepIdentifier" IS NOT NULL
        AND ${AnalyticsQueries.timestamp(Prisma.sql`e."serverTimestamp"`)} <= c.deadline
    ), views AS (
      SELECT DISTINCT "sessionIdentifier", "stepIdentifier" FROM view_events
    ), forwards AS (
      SELECT DISTINCT t."sessionIdentifier", t."fromStepIdentifier", t."toStepIdentifier"
      FROM cohort c CROSS JOIN "SessionTransition" t ON t."sessionIdentifier" = c."identifier"
      WHERE t."kind" = 'forward' AND ${AnalyticsQueries.timestamp(Prisma.sql`t."createdAt"`)} <= c.deadline
    ), completions AS (
      SELECT DISTINCT "sessionIdentifier", "fromStepIdentifier" FROM forwards
    )`;
  },

  observedEvent(name: string): Prisma.Sql {
    // The caller already owns the cohort row; querying its indexed events avoids rejoining that cohort.
    return Prisma.sql`EXISTS (SELECT 1 FROM "Event" e
      WHERE e."sessionIdentifier" = c."identifier" AND e."name" = ${name} AND e."source" = 'client'
        AND ${AnalyticsQueries.timestamp(Prisma.sql`e."serverTimestamp"`)} <= c.deadline)`;
  },

  outcomes(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort}, outcomes AS MATERIALIZED (
      SELECT c.*,
        ${AnalyticsQueries.observedEvent('result_viewed')} AS result,
        ${AnalyticsQueries.observedEvent('cta_clicked')} AS clicked
      FROM cohort c
    )`;
  },

  summary(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${AnalyticsQueries.outcomes(cohort)} ${AnalyticsQueries.summaryRows()}`;
  },

  summaryRows(): Prisma.Sql {
    return Prisma.sql`SELECT "versionIdentifier", "variant", COUNT(*) AS started,
      SUM(result) AS results, SUM(clicked) AS clicks, SUM(result AND clicked) AS "resultClicks"
    FROM outcomes GROUP BY "versionIdentifier", "variant"`;
  },

  steps(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort} SELECT * FROM (${AnalyticsQueries.stepRows()})`;
  },

  stepRows(): Prisma.Sql {
    return Prisma.sql`WITH step_facts AS (
      SELECT "sessionIdentifier", "stepIdentifier", 1 AS reached, 0 AS completed FROM views
      UNION ALL SELECT "sessionIdentifier", "fromStepIdentifier", 0, 1 FROM completions
    ), step_sessions AS (
      SELECT "sessionIdentifier", "stepIdentifier", MAX(reached) AS reached, MAX(completed) AS completed
      FROM step_facts GROUP BY "sessionIdentifier", "stepIdentifier"
    )
    SELECT c."versionIdentifier", c."variant", facts."stepIdentifier",
      SUM(facts.reached) AS reached,
      SUM(facts.completed) AS completed,
      SUM(facts.reached AND facts.completed) AS "observedCompleted",
      SUM(facts.reached AND c.expired) AS "expiredReached",
      SUM(facts.reached AND NOT facts.completed AND NOT c.expired) AS "openNoncompletion",
      SUM(facts.reached AND NOT facts.completed AND c.expired) AS "expiredNoncompletion"
    FROM step_sessions facts JOIN cohort c ON c."identifier" = facts."sessionIdentifier"
    GROUP BY c."versionIdentifier", c."variant", facts."stepIdentifier"`;
  },

  edges(cohort: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`${cohort} SELECT * FROM (${AnalyticsQueries.edgeRows()})`;
  },

  edgeRows(): Prisma.Sql {
    return Prisma.sql`WITH source_counts AS (
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
