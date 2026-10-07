import { BadRequestException } from '@nestjs/common';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { ManagementMessages } from './management-messages.js';
import { ManagementPolicy } from './management-policy.js';
import {
  ManagementSchemas,
  type ManagementQuery,
  type ManagementQueryInput,
} from './management-types.js';

const ManagementValidators = {
  query: SchemaCompiler.compile<ManagementQueryInput>(ManagementSchemas.Query),
  resolved: SchemaCompiler.compile<ManagementQuery>(ManagementSchemas.ResolvedQuery),
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
