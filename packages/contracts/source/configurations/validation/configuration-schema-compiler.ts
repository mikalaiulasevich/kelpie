import { Ajv } from 'ajv';

import { ConfigurationCompilerPolicy } from '../configuration-policy.js';

/** Compile schemas once; validation never coerces, removes, or inserts document values. */
export const configurationSchemaCompiler = new Ajv({
  allErrors: ConfigurationCompilerPolicy.AllErrors,
  strict: ConfigurationCompilerPolicy.Strict,
  allowUnionTypes: ConfigurationCompilerPolicy.AllowUnionTypes,
  ownProperties: ConfigurationCompilerPolicy.OwnProperties,
});
