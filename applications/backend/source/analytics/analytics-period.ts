import { Prisma } from '../../generated/prisma/client.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import type { AnalyticsQuery } from './analytics-types.js';

interface AnalyticsDayRange {
  readonly date: string;
  readonly from: number;
  readonly to: number;
}

export const AnalyticsPeriod = {
  previous(query: AnalyticsQuery): Optional<AnalyticsQuery> {
    if (!query.from || !query.to) {
      return undefined;
    }

    const start = Date.parse(query.from);
    const end = Date.parse(query.to);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: query.timezone ?? 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const startDate = AnalyticsPeriod.day(start, formatter);
    const endDate = AnalyticsPeriod.day(end, formatter);
    const isCalendarRange =
      AnalyticsPeriod.day(start - 1, formatter) !== startDate &&
      AnalyticsPeriod.day(end - 1, formatter) !== endDate;
    const duration = end - start;
    const calendarDuration = Date.parse(endDate) - Date.parse(startDate);
    const previousDate = new Date(Date.parse(startDate) - calendarDuration)
      .toISOString()
      .slice(0, 10);
    const previousStart = isCalendarRange
      ? AnalyticsPeriod.startOfDay(previousDate, formatter)
      : start - duration;

    return {
      ...query,
      from: new Date(previousStart).toISOString(),
      to: new Date(start).toISOString(),
    };
  },

  bounds(query: AnalyticsQuery, now: Date) {
    return {
      from:
        query.from ??
        new Date(now.getTime() - AnalyticsPolicy.MaximumPeriodMilliseconds).toISOString(),
      to: query.to ?? now.toISOString(),
    };
  },

  day(timestamp: number, formatter: Intl.DateTimeFormat): string {
    const parts = formatter.formatToParts(timestamp);

    return ['year', 'month', 'day']
      .map((type) => parts.find((part) => part.type === type)?.value ?? '')
      .join('-');
  },

  startOfDay(date: string, formatter: Intl.DateTimeFormat): number {
    const target = Date.parse(`${date}T00:00:00Z`);
    let low = target - AnalyticsPolicy.CalendarBoundarySearchMilliseconds;
    let high = target + AnalyticsPolicy.CalendarBoundarySearchMilliseconds;

    // A date can begin after midnight during a timezone transition.
    while (low < high) {
      const middle = Math.floor((low + high) / 2);

      if (AnalyticsPeriod.day(middle, formatter) < date) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    return low;
  },

  days(query: AnalyticsQuery, now: Date): readonly AnalyticsDayRange[] {
    const { from, to } = AnalyticsPeriod.bounds(query, now);
    const end = Date.parse(to);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: query.timezone ?? 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const days: AnalyticsDayRange[] = [];
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

      days.push({ date, from: start, to: low });
      start = low;
    }

    return days;
  },

  buckets(query: AnalyticsQuery, now: Date): Prisma.Sql {
    const branches = AnalyticsPeriod.days(query, now).map(
      (day) =>
        Prisma.sql`WHEN c."startedAt" >= ${day.from} AND c."startedAt" < ${day.to} THEN ${day.date}`,
    );

    return Prisma.sql`CASE ${Prisma.join(branches, ' ')} ELSE NULL END`;
  },
} as const;
