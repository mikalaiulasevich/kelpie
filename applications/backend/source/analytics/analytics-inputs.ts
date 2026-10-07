import { BadRequestException } from '@nestjs/common';
import { Ajv } from 'ajv';
import {
  AnalyticsSchemas,
  type AnalyticsQueryInput,
  type AnalyticsQuery,
} from './analytics-types.js';
import { AnalyticsMessages } from './analytics-messages.js';
import { AnalyticsPolicy, AnalyticsTrafficOrigin } from './analytics-policy.js';

const compiler = new Ajv({
  strict: true,
  allErrors: false,
  coerceTypes: false,
  ownProperties: true,
});
const AnalyticsValidators = {
  query: compiler.compile<AnalyticsQueryInput>(AnalyticsSchemas.Query),
  resolved: compiler.compile<AnalyticsQuery>(AnalyticsSchemas.ResolvedQuery),
} as const;

export const AnalyticsInputs = {
  query(value: unknown): AnalyticsQuery {
    if (!AnalyticsValidators.query(value)) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    const query = {
      ...value,
      limit: Number(value.limit ?? AnalyticsPolicy.DefaultLimit),
      offset: Number(value.offset ?? 0),
      includeForced: value.includeForced === 'true',
      trafficOrigin: value.trafficOrigin ?? AnalyticsTrafficOrigin.Production,
    };
    if (!AnalyticsValidators.resolved(query)) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    return query;
  },
} as const;
