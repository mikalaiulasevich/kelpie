import { Type, type TSchema } from 'typebox';

import { ConfigurationSchemaPolicy } from '../configurations/configuration-policy.js';

export const identifierSchema = Type.String(ConfigurationSchemaPolicy.Identifier);

export const textSchema = Type.String(ConfigurationSchemaPolicy.Text);
export const nonBlankTextSchema = Type.String({
  ...ConfigurationSchemaPolicy.Text,
  pattern: /\S/.source,
});
export const identifierListSchema = Type.Array(identifierSchema, {
  maxItems: ConfigurationSchemaPolicy.MaximumIdentifierListItems,
  uniqueItems: true,
});

export const SchemaPrimitives = {
  dictionary<Value extends TSchema>(values: Value, minimum = 0) {
    return Type.Record(Type.String(), values, {
      propertyNames: identifierSchema,
      minProperties: minimum,
      maxProperties: ConfigurationSchemaPolicy.MaximumDictionaryEntries,
      additionalProperties: false,
    });
  },
} as const;
