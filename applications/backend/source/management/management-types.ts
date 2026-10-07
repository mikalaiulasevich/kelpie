import { Type, type Static } from 'typebox';
import { ManagementPolicy } from './management-policy.js';

const ManagementFields = {
  Identifier: Type.String({
    minLength: 1,
    maxLength: ManagementPolicy.MaximumIdentifierLength,
    pattern: ManagementPolicy.IdentifierPattern,
  }),
  PageSize: Type.Integer({ minimum: 1, maximum: ManagementPolicy.MaximumPageSize }),
  Offset: Type.Integer({ minimum: 0, maximum: ManagementPolicy.MaximumOffset }),
} as const;

export const ManagementSchemas = {
  Identifier: ManagementFields.Identifier,
  FunnelReference: Type.Object({
    identifier: Type.String(),
    activeVersionIdentifier: Type.Union([Type.String(), Type.Null()]),
    revision: Type.Integer(),
  }),
  Query: Type.Object(
    {
      funnelIdentifier: ManagementFields.Identifier,
      limit: Type.Optional(Type.String({ pattern: ManagementPolicy.PageSizePattern })),
      offset: Type.Optional(Type.String({ pattern: ManagementPolicy.OffsetPattern })),
    },
    { additionalProperties: false },
  ),
  ResolvedQuery: Type.Object(
    {
      funnelIdentifier: ManagementFields.Identifier,
      limit: ManagementFields.PageSize,
      offset: ManagementFields.Offset,
    },
    { additionalProperties: false },
  ),
} as const;

export type ManagementQuery = Readonly<Static<typeof ManagementSchemas.ResolvedQuery>>;
export type ManagementQueryInput = Readonly<Static<typeof ManagementSchemas.Query>>;
export type FunnelReference = Readonly<Static<typeof ManagementSchemas.FunnelReference>>;

export interface ManagementPage<Item> {
  readonly items: ReadonlyList<Item>;
  readonly nextOffset: number | null;
}
