import { Ajv } from 'ajv';

/** Compile schemas once; validation never coerces, removes, or inserts document values. */
export const configurationSchemaCompiler = new Ajv({
  allErrors: false,
  strict: true,
  allowUnionTypes: true,
  ownProperties: true,
});
