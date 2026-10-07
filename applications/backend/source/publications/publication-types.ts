import { Type, type Static } from 'typebox';
import { ConfigurationImportResultSchema } from '../configurations/configuration-import-types.js';
import type { PublicationAction } from './publication-policy.js';
import type { PublishRequest, RollbackRequest } from './publication-inputs.js';

export type PublicationIntent =
  | (PublishRequest & {
      readonly action: typeof PublicationAction.Publish;
      readonly administratorIdentifier: string;
    })
  | (RollbackRequest & {
      readonly action: typeof PublicationAction.Rollback;
      readonly administratorIdentifier: string;
    });

export const PublicationResponseSchema = Type.Object({
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
export type PublicationResponse = Readonly<Static<typeof PublicationResponseSchema>>;
const funnelReferenceSchema = Type.Object({
  identifier: Type.String(),
  activeVersionIdentifier: Type.Union([Type.String(), Type.Null()]),
  revision: Type.Integer(),
});
export const PublicationHistorySchema = Type.Object({
  funnel: funnelReferenceSchema,
  items: Type.Array(PublicationResponseSchema),
  nextOffset: Type.Union([Type.Integer(), Type.Null()]),
});
export type PublicationHistory = DeepReadonly<Static<typeof PublicationHistorySchema>>;
export const ConfigurationListSchema = Type.Object({
  funnel: funnelReferenceSchema,
  items: Type.Array(ConfigurationImportResultSchema.properties.version),
  nextOffset: Type.Union([Type.Integer(), Type.Null()]),
});
export type ConfigurationList = DeepReadonly<Static<typeof ConfigurationListSchema>>;
