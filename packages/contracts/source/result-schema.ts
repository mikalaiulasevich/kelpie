import { Type } from 'typebox';

import { ConfigurationSchemaPolicy } from './configuration-policy.js';

import { conditionReferenceSchema } from './condition-schema.js';
import { identifierSchema, textSchema } from './schema-primitives.js';

export const primaryActionSchema = Type.Object(
  {
    label: textSchema,
    action: Type.Literal('expand_recommendation'),
  },
  { additionalProperties: false },
);

const recommendationsSchema = Type.Array(textSchema, ConfigurationSchemaPolicy.recommendations);
const resultContentProperties = {
  title: textSchema,
  summary: textSchema,
  recommendations: recommendationsSchema,
  cta: primaryActionSchema,
};

export const resultOverrideSchema = Type.Partial(
  Type.Object(resultContentProperties, {
    additionalProperties: false,
  }),
);

export const funnelResultSchema = Type.Object(
  {
    id: identifierSchema,
    ...resultContentProperties,
  },
  { additionalProperties: false },
);

export const resultRuleSchema = Type.Object(
  {
    resultId: identifierSchema,
    when: conditionReferenceSchema,
  },
  { additionalProperties: false },
);
