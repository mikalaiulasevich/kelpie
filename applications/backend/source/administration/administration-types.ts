import { Type, type Static } from 'typebox';
import { AdministrationPasswordPolicy, AdministrationPolicy } from './administration-policy.js';

const AdministrationFields = {
  Username: Type.String({ pattern: AdministrationPolicy.UsernamePattern }),

  password(minimumLength: number) {
    return Type.String({
      minLength: minimumLength,
      maxLength: AdministrationPolicy.MaximumPasswordCharacters,
    });
  },
} as const;

export const AdministrationSchemas = {
  EncodedPassword: Type.String({ pattern: AdministrationPasswordPolicy.EncodedPattern }),
  Credentials: Type.Object(
    {
      username: AdministrationFields.Username,
      password: AdministrationFields.password(1),
    },
    { additionalProperties: false },
  ),
  Provisioning: Type.Object(
    {
      username: AdministrationFields.Username,
      password: AdministrationFields.password(
        AdministrationPolicy.MinimumProvisionPasswordCharacters,
      ),
    },
    { additionalProperties: false },
  ),
  Identity: Type.Object({ identifier: Type.String(), username: Type.String() }),
} as const;

export type AdministratorCredentials = Readonly<Static<typeof AdministrationSchemas.Credentials>>;

export type AdministratorIdentity = Readonly<Static<typeof AdministrationSchemas.Identity>>;

export type DecodedPasswordMaterial = Readonly<{
  valid: boolean;
  salt: Buffer;
  key: Buffer;
}>;
