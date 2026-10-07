import { Type, type Static } from 'typebox';
import type { PublicationAction } from './publication-policy.js';
import { ManagementSchemas } from '../management/management-types.js';
import { PublicationPolicy } from './publication-policy.js';

export type PublicationIntent =
  | (PublishRequest & {
      readonly action: typeof PublicationAction.Publish;
      readonly administratorIdentifier: string;
    })
  | (RollbackRequest & {
      readonly action: typeof PublicationAction.Rollback;
      readonly administratorIdentifier: string;
    });

const responseSchema = Type.Object({
  identifier: Type.String(),
  operationIdentifier: Type.String(),
  action: Type.String(),
  administratorIdentifier: Type.String(),
  funnelIdentifier: Type.String(),
  targetVersionIdentifier: Type.String(),
  previousVersionIdentifier: Type.Union([Type.String(), Type.Null()]),
  revision: Type.Integer(),
  createdAt: Type.String(),
});

const commandProperties = {
  operationIdentifier: Type.String({ pattern: PublicationPolicy.UuidPattern }),
  funnelIdentifier: ManagementSchemas.Identifier,
  expectedRevision: Type.Integer({ minimum: 0, maximum: PublicationPolicy.MaximumRevision }),
};

export const PublicationSchemas = {
  PublishRequest: Type.Object(
    {
      ...commandProperties,
      targetVersionIdentifier: Type.String({ pattern: PublicationPolicy.UuidPattern }),
    },
    { additionalProperties: false },
  ),
  RollbackRequest: Type.Object(commandProperties, { additionalProperties: false }),
  Response: responseSchema,
  History: Type.Object({
    funnel: ManagementSchemas.FunnelReference,
    items: Type.Array(responseSchema),
    nextOffset: Type.Union([Type.Integer(), Type.Null()]),
  }),
} as const;

export type PublishRequest = Readonly<Static<typeof PublicationSchemas.PublishRequest>>;

export type RollbackRequest = Readonly<Static<typeof PublicationSchemas.RollbackRequest>>;

export type PublicationResponse = Readonly<Static<typeof PublicationSchemas.Response>>;

export type PublicationHistory = DeepReadonly<Static<typeof PublicationSchemas.History>>;
