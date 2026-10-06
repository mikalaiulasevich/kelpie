import { Type } from 'typebox';

import { ConditionOperator } from './domain-values.js';
import { identifierSchema } from './schema-primitives.js';

const conditionValueSchema = Type.Union([Type.String({ maxLength: 100 }), Type.Number()]);
export const conditionReferenceSchema = Type.Ref('#/$defs/condition');

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
    value: Type.Array(conditionValueSchema, { minItems: 1, maxItems: 100, uniqueItems: true }),
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

const conditionListSchema = Type.Array(conditionReferenceSchema, { minItems: 1, maxItems: 30 });

export const conditionSchema = Type.Union([
  Type.Object({ all: conditionListSchema }, { additionalProperties: false }),
  Type.Object({ any: conditionListSchema }, { additionalProperties: false }),
  equalConditionSchema,
  includedConditionSchema,
  containsConditionSchema,
  minimumConditionSchema,
]);
