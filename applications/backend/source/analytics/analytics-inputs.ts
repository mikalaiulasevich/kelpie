import { isUndefined } from 'es-toolkit/predicate';
import { BadRequestException } from '@nestjs/common';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import {
  AnalyticsSchemas,
  type AnalyticsQueryInput,
  type AnalyticsQuery,
} from './analytics-types.js';
import { AnalyticsMessages } from './analytics-messages.js';
import { AnalyticsPolicy, AnalyticsTrafficOrigin } from './analytics-policy.js';

const AnalyticsValidators = {
  query: SchemaCompiler.compile<AnalyticsQueryInput>(AnalyticsSchemas.Query),
  resolved: SchemaCompiler.compile<AnalyticsQuery>(AnalyticsSchemas.ResolvedQuery),
} as const;

const AnalyticsTimestamps = {
  isValid(value: string): boolean {
    const calendarPart = value.slice(0, 19);
    const calendarDate = new Date(`${calendarPart}Z`);

    // Date.parse normalizes impossible calendar dates; reject them before applying the offset.
    return (
      Number.isFinite(Date.parse(value)) &&
      Number.isFinite(calendarDate.getTime()) &&
      calendarDate.toISOString().slice(0, 19) === calendarPart
    );
  },
} as const;

export const AnalyticsInputs = {
  query(value: unknown): AnalyticsQuery {
    if (!AnalyticsValidators.query(value)) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    const query = {
      ...value,
      ...(isUndefined(value.conversionWindowHours)
        ? {}
        : { conversionWindowHours: Number(value.conversionWindowHours) }),
      limit: Number(value.limit ?? AnalyticsPolicy.DefaultLimit),
      offset: Number(value.offset ?? 0),
      includeForced: value.includeForced === 'true',
      trafficOrigin: value.trafficOrigin ?? AnalyticsTrafficOrigin.Production,
    };

    if (!AnalyticsValidators.resolved(query)) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    if (Boolean(query.from) !== Boolean(query.to)) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    if (query.from && query.to) {
      const start = Date.parse(query.from);
      const end = Date.parse(query.to);

      if (
        !AnalyticsTimestamps.isValid(query.from) ||
        !AnalyticsTimestamps.isValid(query.to) ||
        start >= end ||
        end - start > AnalyticsPolicy.MaximumPeriodMilliseconds
      ) {
        throw new BadRequestException(AnalyticsMessages.InvalidQuery);
      }
    }

    try {
      new Intl.DateTimeFormat('en', { timeZone: query.timezone ?? 'UTC' }).format();
    } catch {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    return query;
  },
} as const;
