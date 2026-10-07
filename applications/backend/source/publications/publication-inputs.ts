import { BadRequestException } from '@nestjs/common';
import { SchemaCompiler } from '../validation/schema-compiler.js';
import { PublicationMessages } from './publication-messages.js';
import {
  PublicationSchemas,
  type PublishRequest,
  type RollbackRequest,
} from './publication-types.js';

const PublicationValidators = {
  publish: SchemaCompiler.compile<PublishRequest>(PublicationSchemas.PublishRequest),
  rollback: SchemaCompiler.compile<RollbackRequest>(PublicationSchemas.RollbackRequest),
} as const;

export const PublicationInputs = {
  publish(value: unknown): PublishRequest {
    if (!PublicationValidators.publish(value)) {
      throw new BadRequestException(PublicationMessages.InvalidRequest);
    }

    return { ...value };
  },

  rollback(value: unknown): RollbackRequest {
    if (!PublicationValidators.rollback(value)) {
      throw new BadRequestException(PublicationMessages.InvalidRequest);
    }

    return { ...value };
  },
} as const;
