import { SchemaCompiler } from '../validation/schema-compiler.js';
import { AdministrationSchemas, type AdministratorCredentials } from './administration-types.js';

export const AdministrationValidation = {
  credentials: SchemaCompiler.compile<AdministratorCredentials>(AdministrationSchemas.Credentials),
  provisioning: SchemaCompiler.compile<AdministratorCredentials>(
    AdministrationSchemas.Provisioning,
  ),
  encodedPassword: SchemaCompiler.compile<string>(AdministrationSchemas.EncodedPassword),
} as const;
