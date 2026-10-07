import { Type, type Static } from 'typebox';
import { AdministrationPasswordPolicy, AdministrationPolicy } from './administration-policy.js';

export const AdministrationSchemas = {
  EncodedPassword: Type.String({ pattern: AdministrationPasswordPolicy.EncodedPattern }),
  Credentials: Type.Object(
    {
      username: Type.String({ pattern: AdministrationPolicy.UsernamePattern }),
      password: Type.String({
        minLength: 1,
        maxLength: AdministrationPolicy.MaximumPasswordCharacters,
      }),
    },
    { additionalProperties: false },
  ),
  Provisioning: Type.Object(
    {
      username: Type.String({ pattern: AdministrationPolicy.UsernamePattern }),
      password: Type.String({
        minLength: AdministrationPolicy.MinimumProvisionPasswordCharacters,
        maxLength: AdministrationPolicy.MaximumPasswordCharacters,
      }),
    },
    { additionalProperties: false },
  ),
  Identity: Type.Object({ identifier: Type.String(), username: Type.String() }),
} as const;

export type AdministratorCredentials = Readonly<Static<typeof AdministrationSchemas.Credentials>>;
export type AdministratorIdentity = Readonly<Static<typeof AdministrationSchemas.Identity>>;
