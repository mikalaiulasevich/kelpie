import { Type, type TSchema } from 'typebox';

import { ConfigurationSchemaPolicy } from './configuration-policy.js';

export const identifierSchema = Type.String(ConfigurationSchemaPolicy.identifier);

export const textSchema = Type.String(ConfigurationSchemaPolicy.text);
export const nonBlankTextSchema = Type.String({
  ...ConfigurationSchemaPolicy.text,
  pattern: /\S/.source,
});
export const identifierListSchema = Type.Array(identifierSchema, {
  maxItems: ConfigurationSchemaPolicy.maximumIdentifierListItems,
  uniqueItems: true,
});

export const SchemaPrimitives = {
  dictionary<Value extends TSchema>(values: Value, minimum = 0) {
    return Type.Record(Type.String(), values, {
      propertyNames: identifierSchema,
      minProperties: minimum,
      maxProperties: ConfigurationSchemaPolicy.maximumDictionaryEntries,
      additionalProperties: false,
    });
  },
} as const;
