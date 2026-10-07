import { Type } from 'typebox';

import { ConfigurationFormat } from '../configurations/configuration-format.js';
import { ConfigurationSchemaPolicy } from '../configurations/configuration-policy.js';
import { ConditionSchemas } from '../conditions/condition-schema.js';
import { StepType } from '../shared/domain-values.js';
import { SchemaPrimitives } from '../shared/schema-primitives.js';

const stepContentSchema = Type.Partial(
  Type.Object(
    {
      title: SchemaPrimitives.Text,
      helperText: SchemaPrimitives.Text,
      eyebrow: SchemaPrimitives.Text,
      body: SchemaPrimitives.Text,
      primaryActionLabel: SchemaPrimitives.Text,
      loadingTitle: SchemaPrimitives.Text,
      errorTitle: SchemaPrimitives.Text,
      retryLabel: SchemaPrimitives.Text,
    },
    { additionalProperties: false },
  ),
);

const informationContentSchema = Type.Object(
  {
    ...stepContentSchema.properties,
    title: SchemaPrimitives.NonBlankText,
    body: SchemaPrimitives.NonBlankText,
    primaryActionLabel: SchemaPrimitives.NonBlankText,
  },
  { additionalProperties: false },
);

const interactiveContentSchema = Type.Object(
  {
    ...stepContentSchema.properties,
    title: SchemaPrimitives.NonBlankText,
  },
  { additionalProperties: false },
);

const answerValidationSchema = Type.Object(
  {
    required: Type.Boolean(),
    minSelections: Type.Optional(Type.Integer(ConfigurationSchemaPolicy.MinimumSelections)),
    maxSelections: Type.Optional(Type.Integer(ConfigurationSchemaPolicy.MaximumSelections)),
    messages: SchemaPrimitives.dictionary(SchemaPrimitives.Text),
  },
  { additionalProperties: false },
);

const commonStepProperties = {
  id: SchemaPrimitives.Identifier,
  content: stepContentSchema,
  visibleWhen: Type.Optional(ConditionSchemas.ConditionReference),
};

const numberInputSchema = Type.Object(
  {
    name: SchemaPrimitives.Identifier,
    min: Type.Number(),
    max: Type.Number(),
    step: Type.Number({ exclusiveMinimum: 0 }),
    unit: Type.Optional(SchemaPrimitives.Text),
  },
  { additionalProperties: false },
);

const selectionOptionSchema = Type.Object(
  {
    value: SchemaPrimitives.Identifier,
    label: SchemaPrimitives.Text,
  },
  { additionalProperties: false },
);

const selectionInputSchema = Type.Object(
  {
    name: SchemaPrimitives.Identifier,
    options: Type.Array(selectionOptionSchema, ConfigurationSchemaPolicy.SelectionOptions),
  },
  { additionalProperties: false },
);

const informationStepSchema = Type.Object(
  {
    ...commonStepProperties,
    type: Type.Literal(StepType.Information),
    content: informationContentSchema,
  },
  { additionalProperties: false },
);

const resultStepSchema = Type.Object(
  {
    ...commonStepProperties,
    type: Type.Literal(StepType.Result),
    resultSource: Type.Literal(ConfigurationFormat.ResultSource),
  },
  { additionalProperties: false },
);

const numberStepSchema = Type.Object(
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

const singleSelectionStepSchema = Type.Object(
  {
    ...commonSelectionProperties,
    type: Type.Literal(StepType.SingleSelect),
  },
  { additionalProperties: false },
);

const multipleSelectionStepSchema = Type.Object(
  {
    ...commonSelectionProperties,
    type: Type.Literal(StepType.MultiSelect),
  },
  { additionalProperties: false },
);

const funnelStepSchema = Type.Union([
  informationStepSchema,
  resultStepSchema,
  numberStepSchema,
  singleSelectionStepSchema,
  multipleSelectionStepSchema,
]);

export const StepSchemas = {
  StepContent: stepContentSchema,
  InformationContent: informationContentSchema,
  InteractiveContent: interactiveContentSchema,
  AnswerValidation: answerValidationSchema,
  NumberInput: numberInputSchema,
  SelectionOption: selectionOptionSchema,
  SelectionInput: selectionInputSchema,
  InformationStep: informationStepSchema,
  ResultStep: resultStepSchema,
  NumberStep: numberStepSchema,
  SingleSelectionStep: singleSelectionStepSchema,
  MultipleSelectionStep: multipleSelectionStepSchema,
  FunnelStep: funnelStepSchema,
} as const;
