import { Ajv, type SchemaObject, type ValidateFunction } from 'ajv';

const SchemaPolicy = {
  Strict: true,
  AllErrors: false,
  CoerceTypes: false,
  OwnProperties: true,
} as const;

// Domain validators compile once and share non-mutating, own-property validation.
const compiler = new Ajv({
  strict: SchemaPolicy.Strict,
  allErrors: SchemaPolicy.AllErrors,
  coerceTypes: SchemaPolicy.CoerceTypes,
  ownProperties: SchemaPolicy.OwnProperties,
});

export const SchemaCompiler = {
  compile<Value>(schema: SchemaObject): ValidateFunction<Value> {
    return compiler.compile<Value>(schema);
  },
} as const;
