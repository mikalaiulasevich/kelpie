import { Ajv } from 'ajv';
import { AdministrationSchemas, type AdministratorCredentials } from './administration-types.js';

const validator = new Ajv({ strict: true, ownProperties: true });

export const AdministrationValidation = {
  credentials: validator.compile<AdministratorCredentials>(AdministrationSchemas.Credentials),
  provisioning: validator.compile<AdministratorCredentials>(AdministrationSchemas.Provisioning),
  encodedPassword: validator.compile<string>(AdministrationSchemas.EncodedPassword),
} as const;
