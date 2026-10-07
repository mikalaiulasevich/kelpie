import { BadRequestException } from '@nestjs/common';
import { Ajv } from 'ajv';
import { PublicationMessages } from './publication-messages.js';
import {
  PublicationSchemas,
  type PublishRequest,
  type RollbackRequest,
} from './publication-types.js';

const compiler = new Ajv({
  strict: true,
  allErrors: false,
  coerceTypes: false,
  ownProperties: true,
});

const PublicationValidators = {
  publish: compiler.compile<PublishRequest>(PublicationSchemas.PublishRequest),
  rollback: compiler.compile<RollbackRequest>(PublicationSchemas.RollbackRequest),
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
