import { BadRequestException } from '@nestjs/common';
import { isPlainObject, isUndefined } from 'es-toolkit/predicate';
import { omit } from 'es-toolkit/object';
import { Prisma } from '../../generated/prisma/client.js';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { AnalyticsInputs } from './analytics-inputs.js';
import { AnalyticsMessages } from './analytics-messages.js';
import { AnalyticsQueries } from './analytics-queries.js';
import { AnalyticsRows } from './analytics-results.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import {
  AnalyticsSessionSchemas,
  type AnalyticsSessionSelection,
  type AnalyticsSessionSegment,
  type AnalyticsSessionRow,
  type AnalyticsSessionResponse,
} from './analytics-session-types.js';
import type { AnalyticsQuery } from './analytics-types.js';

const Validators = {
  segment: SchemaCompiler.compile<AnalyticsSessionSegment>(AnalyticsSessionSchemas.Segment),
  selection: SchemaCompiler.compile<AnalyticsSessionSelection>(AnalyticsSessionSchemas.Selection),
  row: SchemaCompiler.compile<AnalyticsSessionRow>(AnalyticsSessionSchemas.Row),
};

export const AnalyticsSessionTimeline = {
  input(input: unknown) {
    if (!isPlainObject(input)) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    const selection = {
      stepIdentifier: input.stepIdentifier,
      sessionIdentifier: input.sessionIdentifier,
      variant: input.variant,
    };

    if (!Validators.selection(selection)) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    const query = AnalyticsInputs.query(
      omit(input, ['stepIdentifier', 'sessionIdentifier', 'variant']),
    );

    if (isUndefined(query.versionIdentifier)) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    return { query, selection };
  },

  async read(
    transaction: Prisma.TransactionClient,
    query: AnalyticsQuery,
    selection: AnalyticsSessionSelection,
    now: Date,
  ): Promise<AnalyticsSessionResponse> {
    const versions = await transaction.funnelVersion.findMany({
      where: {
        funnelIdentifier: query.funnelIdentifier,
        ...(query.versionIdentifier ? { identifier: query.versionIdentifier } : {}),
      },
      select: { identifier: true },
      take: 1,
    });
    const metadata = {
      generatedAt: now.toISOString(),
      filters: query,
      pagination: { limit: query.limit, offset: query.offset, hasMore: false },
    };

    if (!versions.length) {
      return { ...metadata, segments: [], segmentsHasMore: false, sessions: [] };
    }

    const cohort = AnalyticsQueries.cohort(
      query,
      versions.map((version) => version.identifier),
      now,
    );
    const conditions: Prisma.Sql[] = [Prisma.sql`1 = 1`];

    if (!isUndefined(selection.variant)) {
      conditions.push(Prisma.sql`c.variant = ${selection.variant}`);
    }

    if (!isUndefined(selection.sessionIdentifier)) {
      conditions.push(Prisma.sql`c.identifier = ${selection.sessionIdentifier}`);
    }

    if (!isUndefined(selection.stepIdentifier)) {
      conditions.push(
        Prisma.sql`(EXISTS (SELECT 1 FROM views v WHERE v."sessionIdentifier" = c.identifier AND v."stepIdentifier" = ${selection.stepIdentifier}) OR EXISTS (SELECT 1 FROM completions f WHERE f."sessionIdentifier" = c.identifier AND f."fromStepIdentifier" = ${selection.stepIdentifier}))`,
      );
    }

    const segments = isUndefined(selection.stepIdentifier)
      ? []
      : AnalyticsRows.validate(
          await transaction.$queryRaw<unknown[]>(Prisma.sql`${cohort}, selected_sessions AS (
      SELECT c.source, c.medium, c.campaign,
        EXISTS (SELECT 1 FROM views v WHERE v."sessionIdentifier" = c.identifier AND v."stepIdentifier" = ${selection.stepIdentifier}) AS reached,
        EXISTS (SELECT 1 FROM completions f WHERE f."sessionIdentifier" = c.identifier AND f."fromStepIdentifier" = ${selection.stepIdentifier}) AS completed
      FROM cohort c WHERE ${Prisma.join(conditions, ' AND ')}
    ) SELECT source, medium, campaign, COUNT(*) AS sessions, SUM(reached) AS reached, SUM(completed) AS completed, SUM(reached AND completed) AS "observedCompleted"
      FROM selected_sessions GROUP BY source, medium, campaign ORDER BY sessions DESC, source, medium, campaign
      LIMIT ${AnalyticsPolicy.MaximumTimelineSegments + 1}`),
          Validators.segment,
        );

    const rows = AnalyticsRows.validate(
      await transaction.$queryRaw<unknown[]>(
        Prisma.sql`${cohort} SELECT c.identifier FROM cohort c WHERE ${Prisma.join(conditions, ' AND ')} ORDER BY c."startedAt" DESC, c.identifier LIMIT ${query.limit + 1} OFFSET ${query.offset}`,
      ),
      Validators.row,
    );
    const sessions = await transaction.session.findMany({
      where: { identifier: { in: rows.slice(0, query.limit).map((row) => row.identifier) } },
      orderBy: [{ createdAt: 'desc' }, { identifier: 'asc' }],
      select: {
        identifier: true,
        versionIdentifier: true,
        variant: true,
        createdAt: true,
        expiresAt: true,
        events: {
          orderBy: [{ serverTimestamp: 'asc' }, { identifier: 'asc' }],
          take: AnalyticsPolicy.MaximumTimelineEvents + 1,
          select: { name: true, source: true, serverTimestamp: true, stepIdentifier: true },
        },
      },
    });

    return {
      ...metadata,
      segments: segments.slice(0, AnalyticsPolicy.MaximumTimelineSegments),
      segmentsHasMore: segments.length > AnalyticsPolicy.MaximumTimelineSegments,
      pagination: { ...metadata.pagination, hasMore: rows.length > query.limit },
      sessions: sessions.map((session) => ({
        sessionIdentifier: session.identifier,
        versionIdentifier: session.versionIdentifier,
        variant: session.variant,
        startedAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        eventsHasMore: session.events.length > AnalyticsPolicy.MaximumTimelineEvents,
        events: session.events.slice(0, AnalyticsPolicy.MaximumTimelineEvents).map((event) => ({
          name: event.name,
          source: event.source,
          occurredAt: event.serverTimestamp.toISOString(),
          stepIdentifier: event.stepIdentifier,
        })),
      })),
    };
  },
} as const;
