import { Prisma } from '../../generated/prisma/client.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import type { AnalyticsQuery } from './analytics-types.js';

export const AnalyticsPeriod = {
  previous(query: AnalyticsQuery): Optional<AnalyticsQuery> {
    if (!query.from || !query.to) {
      return undefined;
    }

    const start = Date.parse(query.from);
    const duration = Date.parse(query.to) - start;

    return { ...query, from: new Date(start - duration).toISOString(), to: new Date(start).toISOString() };
  },

  bounds(query: AnalyticsQuery, now: Date) {
    return {
      from: query.from ?? new Date(now.getTime() - AnalyticsPolicy.MaximumPeriodMilliseconds).toISOString(),
      to: query.to ?? now.toISOString(),
    };
  },

  day(timestamp: number, formatter: Intl.DateTimeFormat): string {
    const parts = formatter.formatToParts(timestamp);

    return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)?.value ?? '').join('-');
  },

  buckets(query: AnalyticsQuery, now: Date): Prisma.Sql {
    const { from, to } = AnalyticsPeriod.bounds(query, now);
    const end = Date.parse(to);
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: query.timezone ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
    const branches: Prisma.Sql[] = [];
    let start = Date.parse(from);

    // Find each local midnight, including DST and fractional-offset zones, without assuming a 24-hour day.
    while (start < end) {
      const date = AnalyticsPeriod.day(start, formatter);
      let low = start + 1;
      let high = Math.min(end, start + AnalyticsPolicy.MaximumLocalDayMilliseconds);

      while (low < high) {
        const middle = Math.floor((low + high) / 2);

        if (AnalyticsPeriod.day(middle, formatter) === date) {
          low = middle + 1;
        } else {
          high = middle;
        }
      }

      branches.push(Prisma.sql`WHEN c."startedAt" >= ${start} AND c."startedAt" < ${low} THEN ${date}`);
      start = low;
    }

    return Prisma.sql`CASE ${Prisma.join(branches, ' ')} ELSE NULL END`;
  },
} as const;
