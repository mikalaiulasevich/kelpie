import { Type } from 'typebox';

import { ConfigurationFormat } from '../configurations/configuration-format.js';
import { ConfigurationSchemaPolicy } from '../configurations/configuration-policy.js';
import { ConditionSchemas } from '../conditions/condition-schema.js';
import { SchemaPrimitives } from '../shared/schema-primitives.js';

const primaryActionSchema = Type.Object(
  {
    label: SchemaPrimitives.Text,
    action: Type.Literal(ConfigurationFormat.PrimaryAction),
  },
  { additionalProperties: false },
);

const recommendationsSchema = Type.Array(
  SchemaPrimitives.Text,
  ConfigurationSchemaPolicy.Recommendations,
);

const resultContentProperties = {
  title: SchemaPrimitives.Text,
  summary: SchemaPrimitives.Text,
  recommendations: recommendationsSchema,
  cta: primaryActionSchema,
};

const resultOverrideSchema = Type.Partial(
  Type.Object(resultContentProperties, {
    additionalProperties: false,
  }),
);

const funnelResultSchema = Type.Object(
  {
    id: SchemaPrimitives.Identifier,
    ...resultContentProperties,
  },
  { additionalProperties: false },
);

const resultRuleSchema = Type.Object(
  {
    resultId: SchemaPrimitives.Identifier,
    when: ConditionSchemas.ConditionReference,
  },
  { additionalProperties: false },
);

export const ResultSchemas = {
  PrimaryAction: primaryActionSchema,
  ResultOverride: resultOverrideSchema,
  FunnelResult: funnelResultSchema,
  ResultRule: resultRuleSchema,
} as const;
