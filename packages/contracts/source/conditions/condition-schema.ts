import { Type } from 'typebox';

import { ConfigurationFormat } from '../configurations/configuration-format.js';
import { ConfigurationSchemaPolicy } from '../configurations/configuration-policy.js';
import { ConditionOperator } from '../shared/domain-values.js';
import { identifierSchema } from '../shared/schema-primitives.js';

const conditionValueSchema = Type.Union([
  Type.String(ConfigurationSchemaPolicy.conditionText),
  Type.Number(),
]);
export const conditionReferenceSchema = Type.Ref(ConfigurationFormat.conditionReference);

export const equalConditionSchema = Type.Object(
  {
    answer: identifierSchema,
    operator: Type.Literal(ConditionOperator.Equal),
    value: conditionValueSchema,
  },
  { additionalProperties: false },
);

export const includedConditionSchema = Type.Object(
  {
    answer: identifierSchema,
    operator: Type.Literal(ConditionOperator.In),
    value: Type.Array(conditionValueSchema, ConfigurationSchemaPolicy.conditionValues),
  },
  { additionalProperties: false },
);

export const containsConditionSchema = Type.Object(
  {
    answer: identifierSchema,
    operator: Type.Literal(ConditionOperator.Contains),
    value: identifierSchema,
  },
  { additionalProperties: false },
);

export const minimumConditionSchema = Type.Object(
  {
    answer: identifierSchema,
    operator: Type.Literal(ConditionOperator.GreaterThanOrEqual),
    value: Type.Number(),
  },
  { additionalProperties: false },
);

const conditionListSchema = Type.Array(
  conditionReferenceSchema,
  ConfigurationSchemaPolicy.conditionChildren,
);

export const conditionSchema = Type.Union([
  Type.Object({ all: conditionListSchema }, { additionalProperties: false }),
  Type.Object({ any: conditionListSchema }, { additionalProperties: false }),
  equalConditionSchema,
  includedConditionSchema,
  containsConditionSchema,
  minimumConditionSchema,
]);
