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
const validators = {
  query: compiler.compile<AnalyticsQueryInput>(AnalyticsSchemas.Query),
} as const;

export const AnalyticsInputs = {
  query(value: unknown): AnalyticsQuery {
    if (!validators.query(value)) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    const limit = Number(value.limit ?? AnalyticsPolicy.DefaultLimit);
    const offset = Number(value.offset ?? 0);
    if (
      limit < 1 ||
      limit > AnalyticsPolicy.MaximumLimit ||
      offset > AnalyticsPolicy.MaximumOffset
    ) {
      throw new BadRequestException(AnalyticsMessages.InvalidQuery);
    }

    return {
      ...value,
      limit,
      offset,
      includeForced: value.includeForced === 'true',
      trafficOrigin: value.trafficOrigin ?? AnalyticsTrafficOrigin.Production,
    };
  },
} as const;
