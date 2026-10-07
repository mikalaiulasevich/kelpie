import { BadRequestException } from '@nestjs/common';
import { Ajv } from 'ajv';
import { ManagementMessages } from './management-messages.js';
import { ManagementPolicy } from './management-policy.js';
import {
  ManagementSchemas,
  type ManagementQuery,
  type ManagementQueryInput,
} from './management-types.js';

const compiler = new Ajv({
  strict: true,
  allErrors: false,
  coerceTypes: false,
  ownProperties: true,
});

const ManagementValidators = {
  query: compiler.compile<ManagementQueryInput>(ManagementSchemas.Query),
  resolved: compiler.compile<ManagementQuery>(ManagementSchemas.ResolvedQuery),
} as const;

export const ManagementQueries = {
  read(value: unknown): ManagementQuery {
    if (!ManagementValidators.query(value)) {
      throw new BadRequestException(ManagementMessages.InvalidQuery);
    }

    const query = {
      funnelIdentifier: value.funnelIdentifier,
      limit: Number(value.limit ?? ManagementPolicy.DefaultPageSize),
      offset: Number(value.offset ?? 0),
    };

    if (!ManagementValidators.resolved(query)) {
      throw new BadRequestException(ManagementMessages.InvalidQuery);
    }

    return query;
  },
} as const;
