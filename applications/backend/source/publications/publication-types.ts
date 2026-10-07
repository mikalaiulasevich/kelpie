import { Type, type Static } from 'typebox';
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
export const FunnelReferenceSchema = Type.Object({
  identifier: Type.String(),
  activeVersionIdentifier: Type.Union([Type.String(), Type.Null()]),
  revision: Type.Integer(),
});
export const PublicationHistorySchema = Type.Object({
  funnel: FunnelReferenceSchema,
  items: Type.Array(PublicationResponseSchema),
  nextOffset: Type.Union([Type.Integer(), Type.Null()]),
});
export type PublicationHistory = DeepReadonly<Static<typeof PublicationHistorySchema>>;
