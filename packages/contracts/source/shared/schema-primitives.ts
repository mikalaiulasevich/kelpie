import { Type, type TSchema } from 'typebox';

import { ConfigurationSchemaPolicy } from '../configurations/configuration-policy.js';

const identifierSchema = Type.String(ConfigurationSchemaPolicy.Identifier);

export const SchemaPrimitives = {
  Identifier: identifierSchema,
  Text: Type.String(ConfigurationSchemaPolicy.Text),
  NonBlankText: Type.String({
    ...ConfigurationSchemaPolicy.Text,
    pattern: /\S/.source,
  }),
  IdentifierList: Type.Array(identifierSchema, {
    maxItems: ConfigurationSchemaPolicy.MaximumIdentifierListItems,
    uniqueItems: true,
  }),

  dictionary<Value extends TSchema>(values: Value, minimum = 0) {
    return Type.Record(Type.String(), values, {
      propertyNames: identifierSchema,
      minProperties: minimum,
      maxProperties: ConfigurationSchemaPolicy.MaximumDictionaryEntries,
      additionalProperties: false,
    });
  },
} as const;
