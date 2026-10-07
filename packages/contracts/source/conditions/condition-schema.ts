import { Type } from 'typebox';

import { ConfigurationFormat } from '../configurations/configuration-format.js';
import { ConfigurationSchemaPolicy } from '../configurations/configuration-policy.js';
import { ConditionOperator } from '../shared/domain-values.js';
import { SchemaPrimitives } from '../shared/schema-primitives.js';

const conditionValueSchema = Type.Union([
  Type.String(ConfigurationSchemaPolicy.ConditionText),
  Type.Number(),
]);
const conditionReferenceSchema = Type.Ref(ConfigurationFormat.ConditionReference);

const equalConditionSchema = Type.Object(
  {
    answer: SchemaPrimitives.Identifier,
    operator: Type.Literal(ConditionOperator.Equal),
    value: conditionValueSchema,
  },
  { additionalProperties: false },
);

const includedConditionSchema = Type.Object(
  {
    answer: SchemaPrimitives.Identifier,
    operator: Type.Literal(ConditionOperator.In),
    value: Type.Array(conditionValueSchema, ConfigurationSchemaPolicy.ConditionValues),
  },
  { additionalProperties: false },
);

const containsConditionSchema = Type.Object(
  {
    answer: SchemaPrimitives.Identifier,
    operator: Type.Literal(ConditionOperator.Contains),
    value: SchemaPrimitives.Identifier,
  },
  { additionalProperties: false },
);

const minimumConditionSchema = Type.Object(
  {
    answer: SchemaPrimitives.Identifier,
    operator: Type.Literal(ConditionOperator.GreaterThanOrEqual),
    value: Type.Number(),
  },
  { additionalProperties: false },
);

const conditionListSchema = Type.Array(
  conditionReferenceSchema,
  ConfigurationSchemaPolicy.ConditionChildren,
);

const conditionSchema = Type.Union([
  Type.Object({ all: conditionListSchema }, { additionalProperties: false }),
  Type.Object({ any: conditionListSchema }, { additionalProperties: false }),
  equalConditionSchema,
  includedConditionSchema,
  containsConditionSchema,
  minimumConditionSchema,
]);

export const ConditionSchemas = {
  ConditionReference: conditionReferenceSchema,
  EqualCondition: equalConditionSchema,
  IncludedCondition: includedConditionSchema,
  ContainsCondition: containsConditionSchema,
  MinimumCondition: minimumConditionSchema,
  Condition: conditionSchema,
} as const;
