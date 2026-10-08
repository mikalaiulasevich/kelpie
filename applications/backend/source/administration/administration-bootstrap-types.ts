import { Type, type Static } from 'typebox';

export const AdministrationBootstrapStatus = {
  Created: 'created',
  Existing: 'existing',
} as const;

export const AdministrationBootstrapResultSchema = Type.Object({
  status: Type.Union([
    Type.Literal(AdministrationBootstrapStatus.Created),
    Type.Literal(AdministrationBootstrapStatus.Existing),
  ]),
});

export type AdministrationBootstrapResult = Static<typeof AdministrationBootstrapResultSchema>;
