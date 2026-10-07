import { Type, type TSchema } from 'typebox';

import { ConfigurationSchemaPolicy } from '../configurations/configuration-policy.js';

const identifierSchema = Type.String(ConfigurationSchemaPolicy.Identifier);

const textSchema = Type.String(ConfigurationSchemaPolicy.Text);
const nonBlankTextSchema = Type.String({
  ...ConfigurationSchemaPolicy.Text,
  pattern: /\S/.source,
});
const identifierListSchema = Type.Array(identifierSchema, {
  maxItems: ConfigurationSchemaPolicy.MaximumIdentifierListItems,
  uniqueItems: true,
});

export const SchemaPrimitives = {
  Identifier: identifierSchema,
  Text: textSchema,
  NonBlankText: nonBlankTextSchema,
  IdentifierList: identifierListSchema,
  dictionary<Value extends TSchema>(values: Value, minimum = 0) {
    return Type.Record(Type.String(), values, {
      propertyNames: identifierSchema,
      minProperties: minimum,
      maxProperties: ConfigurationSchemaPolicy.MaximumDictionaryEntries,
      additionalProperties: false,
    });
  },
} as const;
