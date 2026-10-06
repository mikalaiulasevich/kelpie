import { Type } from 'typebox';

import { ConfigurationSchemaPolicy } from './configuration-policy.js';

import { conditionReferenceSchema } from './condition-schema.js';
import { StepType } from './domain-values.js';
import {
  dictionarySchema,
  identifierSchema,
  nonBlankTextSchema,
  textSchema,
} from './schema-primitives.js';

export const stepContentSchema = Type.Partial(
  Type.Object(
    {
      title: textSchema,
      helperText: textSchema,
      eyebrow: textSchema,
      body: textSchema,
      primaryActionLabel: textSchema,
      loadingTitle: textSchema,
      errorTitle: textSchema,
      retryLabel: textSchema,
    },
    { additionalProperties: false },
  ),
);

export const informationContentSchema = Type.Object(
  {
    ...stepContentSchema.properties,
    title: nonBlankTextSchema,
    body: nonBlankTextSchema,
    primaryActionLabel: nonBlankTextSchema,
  },
  { additionalProperties: false },
);

export const interactiveContentSchema = Type.Object(
  {
    ...stepContentSchema.properties,
    title: nonBlankTextSchema,
  },
  { additionalProperties: false },
);

export const answerValidationSchema = Type.Object(
  {
    required: Type.Boolean(),
    minSelections: Type.Optional(Type.Integer(ConfigurationSchemaPolicy.minimumSelections)),
    maxSelections: Type.Optional(Type.Integer(ConfigurationSchemaPolicy.maximumSelections)),
    messages: dictionarySchema(textSchema),
  },
  { additionalProperties: false },
);

const commonStepProperties = {
  id: identifierSchema,
  content: stepContentSchema,
  visibleWhen: Type.Optional(conditionReferenceSchema),
};

export const numberInputSchema = Type.Object(
  {
    name: identifierSchema,
    min: Type.Number(),
    max: Type.Number(),
    step: Type.Number({ exclusiveMinimum: 0 }),
    unit: Type.Optional(textSchema),
  },
  { additionalProperties: false },
);

export const selectionOptionSchema = Type.Object(
  {
    value: identifierSchema,
    label: textSchema,
  },
  { additionalProperties: false },
);

export const selectionInputSchema = Type.Object(
  {
    name: identifierSchema,
    options: Type.Array(selectionOptionSchema, ConfigurationSchemaPolicy.selectionOptions),
  },
  { additionalProperties: false },
);

export const informationStepSchema = Type.Object(
  {
    ...commonStepProperties,
    type: Type.Literal(StepType.Information),
    content: informationContentSchema,
  },
  { additionalProperties: false },
);

export const resultStepSchema = Type.Object(
  {
    ...commonStepProperties,
    type: Type.Literal(StepType.Result),
    resultSource: Type.Literal('resultRules'),
  },
  { additionalProperties: false },
);

export const numberStepSchema = Type.Object(
  {
    ...commonStepProperties,
    type: Type.Literal(StepType.Number),
    content: interactiveContentSchema,
    input: numberInputSchema,
    validation: answerValidationSchema,
  },
  { additionalProperties: false },
);

const commonSelectionProperties = {
  ...commonStepProperties,
  content: interactiveContentSchema,
  input: selectionInputSchema,
  validation: answerValidationSchema,
};

export const singleSelectionStepSchema = Type.Object(
  {
    ...commonSelectionProperties,
    type: Type.Literal(StepType.SingleSelect),
  },
  { additionalProperties: false },
);

export const multipleSelectionStepSchema = Type.Object(
  {
    ...commonSelectionProperties,
    type: Type.Literal(StepType.MultiSelect),
  },
  { additionalProperties: false },
);

export const funnelStepSchema = Type.Union([
  informationStepSchema,
  resultStepSchema,
  numberStepSchema,
  singleSelectionStepSchema,
  multipleSelectionStepSchema,
]);
