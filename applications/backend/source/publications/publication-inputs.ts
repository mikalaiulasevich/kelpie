import { BadRequestException } from '@nestjs/common';
import { Ajv } from 'ajv';
import { Type, type Static } from 'typebox';
import { PublicationMessages } from './publication-messages.js';
import { PublicationPolicy } from './publication-policy.js';

const identifier = Type.String({
  minLength: 1,
  maxLength: 100,
  pattern: PublicationPolicy.IdentifierPattern,
});
const uuid = Type.String({ pattern: PublicationPolicy.UuidPattern });
const commandProperties = {
  operationIdentifier: uuid,
  funnelIdentifier: identifier,
  expectedRevision: Type.Integer({ minimum: 0, maximum: PublicationPolicy.MaximumRevision }),
};
export const PublishRequestSchema = Type.Object(
  { ...commandProperties, targetVersionIdentifier: uuid },
  { additionalProperties: false },
);
export const RollbackRequestSchema = Type.Object(commandProperties, {
  additionalProperties: false,
});
export const ManagementQuerySchema = Type.Object(
  {
    funnelIdentifier: identifier,
    limit: Type.Optional(Type.String({ pattern: '^[1-9][0-9]{0,2}$' })),
    offset: Type.Optional(Type.String({ pattern: '^(0|[1-9][0-9]{0,4})$' })),
  },
  { additionalProperties: false },
);
export type PublishRequest = Readonly<Static<typeof PublishRequestSchema>>;
export type RollbackRequest = Readonly<Static<typeof RollbackRequestSchema>>;
export const ResolvedManagementQuerySchema = Type.Object({
  funnelIdentifier: identifier,
  limit: Type.Integer(),
  offset: Type.Integer(),
});
export type ManagementQuery = Readonly<Static<typeof ResolvedManagementQuerySchema>>;
const compiler = new Ajv({
  strict: true,
  allErrors: false,
  coerceTypes: false,
  ownProperties: true,
});
const validators = {
  publish: compiler.compile<PublishRequest>(PublishRequestSchema),
  rollback: compiler.compile<RollbackRequest>(RollbackRequestSchema),
  query: compiler.compile<Static<typeof ManagementQuerySchema>>(ManagementQuerySchema),
};
export const PublicationInputs = {
  publish(value: unknown): PublishRequest {
    if (!validators.publish(value)) {
      throw new BadRequestException(PublicationMessages.InvalidRequest);
    }

    return { ...value };
  },
  rollback(value: unknown): RollbackRequest {
    if (!validators.rollback(value)) {
      throw new BadRequestException(PublicationMessages.InvalidRequest);
    }

    return { ...value };
  },
  query(value: unknown): ManagementQuery {
    if (!validators.query(value)) {
      throw new BadRequestException(PublicationMessages.InvalidQuery);
    }

    const limit = Number(value.limit ?? PublicationPolicy.DefaultPageSize);
    const offset = Number(value.offset ?? 0);
    if (limit > PublicationPolicy.MaximumPageSize || offset > PublicationPolicy.MaximumOffset) {
      throw new BadRequestException(PublicationMessages.InvalidQuery);
    }

    return { funnelIdentifier: value.funnelIdentifier, limit, offset };
  },
} as const;
