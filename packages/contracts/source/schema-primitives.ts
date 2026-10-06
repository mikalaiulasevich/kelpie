import { Type, type TSchema } from 'typebox';

export const identifierSchema = Type.String({
  minLength: 1,
  maxLength: 100,
  pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
});

export const textSchema = Type.String({ minLength: 1, maxLength: 4000 });
export const nonBlankTextSchema = Type.String({
  minLength: 1,
  maxLength: 4000,
  pattern: /\S/.source,
});
export const identifierListSchema = Type.Array(identifierSchema, {
  maxItems: 100,
  uniqueItems: true,
});

export function dictionarySchema<Value extends TSchema>(values: Value, minimum = 0) {
  return Type.Record(Type.String(), values, {
    propertyNames: identifierSchema,
    minProperties: minimum,
    maxProperties: 100,
    additionalProperties: false,
  });
}
