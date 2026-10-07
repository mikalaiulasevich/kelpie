import { Type, type Static } from 'typebox';

export const AdministrationSchemas = {
  Credentials: Type.Object(
    { username: Type.String(), password: Type.String() },
    { additionalProperties: false },
  ),
  Identity: Type.Object({ identifier: Type.String(), username: Type.String() }),
} as const;

export type AdministratorCredentials = Readonly<Static<typeof AdministrationSchemas.Credentials>>;

export type AdministratorIdentity = Readonly<Static<typeof AdministrationSchemas.Identity>>;
