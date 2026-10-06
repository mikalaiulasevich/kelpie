import { Type } from 'typebox';

import { ConfigurationFormat } from '../configurations/configuration-format.js';
import { ConfigurationSchemaPolicy } from '../configurations/configuration-policy.js';
import { conditionReferenceSchema } from '../conditions/condition-schema.js';
import { identifierSchema, textSchema } from '../shared/schema-primitives.js';

export const primaryActionSchema = Type.Object(
  {
    label: textSchema,
    action: Type.Literal(ConfigurationFormat.PrimaryAction),
  },
  { additionalProperties: false },
);

const recommendationsSchema = Type.Array(textSchema, ConfigurationSchemaPolicy.Recommendations);
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
