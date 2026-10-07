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
