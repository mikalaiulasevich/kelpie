import {
  ConditionOperator,
  ConfigurationStatus,
  ExperimentVariant,
  StepType,
} from './domain_values.js';

const identifierSchema = {
  type: 'string',
  minLength: 1,
  maxLength: 100,
  pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
};
const textSchema = { type: 'string', minLength: 1, maxLength: 4000 };
const identifierListSchema = {
  type: 'array',
  items: identifierSchema,
  maxItems: 100,
  uniqueItems: true,
};
const createObjectSchema = (
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const createDictionarySchema = (values: unknown, maximum = 100) => ({
  type: 'object',
  propertyNames: identifierSchema,
  additionalProperties: values,
  minProperties: 1,
  maxProperties: maximum,
});
const createOptionalDictionarySchema = (values: unknown) => ({
  ...createDictionarySchema(values),
  minProperties: 0,
});
const stepContentSchema = createObjectSchema(
  Object.fromEntries(
    [
      'title',
      'helperText',
      'eyebrow',
      'body',
      'primaryActionLabel',
      'loadingTitle',
      'errorTitle',
      'retryLabel',
    ].map((name) => [name, textSchema]),
  ),
  [],
);
const conditionReferenceSchema = { $ref: '#/$defs/condition' };
const primaryActionSchema = createObjectSchema({
  label: textSchema,
  action: { const: 'expand_recommendation' },
});
const recommendationsSchema = { type: 'array', minItems: 1, maxItems: 30, items: textSchema };
const answerValidationSchema = createObjectSchema(
  {
    required: { type: 'boolean' },
    minSelections: { type: 'integer', minimum: 0, maximum: 100 },
    maxSelections: { type: 'integer', minimum: 1, maximum: 100 },
    messages: createOptionalDictionarySchema(textSchema),
  },
  ['required', 'messages'],
);
const commonStepProperties = {
  id: identifierSchema,
  content: stepContentSchema,
  visibleWhen: conditionReferenceSchema,
};
const selectionInputSchema = createObjectSchema({
  name: identifierSchema,
  options: {
    type: 'array',
    minItems: 1,
    maxItems: 100,
    items: createObjectSchema({ value: identifierSchema, label: textSchema }),
  },
});
const experimentVariantSchema = createObjectSchema({
  weight: { type: 'number', minimum: 0, maximum: 100 },
  stepSequence: { ...identifierListSchema, minItems: 6 },
  stepOverrides: createOptionalDictionarySchema(createObjectSchema({ content: stepContentSchema })),
  resultOverrides: createOptionalDictionarySchema(
    createObjectSchema(
      {
        title: textSchema,
        summary: textSchema,
        recommendations: recommendationsSchema,
        cta: primaryActionSchema,
      },
      [],
    ),
  ),
});

export const funnelConfigurationSchema = {
  $id: 'https://kelpie.local/schemas/funnel-1.0',
  ...createObjectSchema(
    {
      schemaVersion: { const: '1.0' },
      funnelId: identifierSchema,
      version: { type: 'integer', minimum: 1, maximum: 2147483647 },
      status: { enum: Object.values(ConfigurationStatus) },
      locale: { type: 'string', minLength: 2, maxLength: 35 },
      title: textSchema,
      description: textSchema,
      releaseNote: textSchema,
      session: createObjectSchema({
        ttlHours: { type: 'number', minimum: 1, maximum: 8760 },
        persistAnswers: { const: true },
        pinVersion: { const: true },
        pinExperimentVariant: { const: true },
      }),
      progress: createObjectSchema({
        countVisibleOnly: { const: true },
        excludeTypes: {
          type: 'array',
          items: { enum: Object.values(StepType) },
          maxItems: 5,
          uniqueItems: true,
        },
      }),
      experiment: createObjectSchema({
        id: identifierSchema,
        assignment: { const: 'server' },
        sticky: { const: true },
        overrideQueryParam: identifierSchema,
        variants: createObjectSchema({
          [ExperimentVariant.A]: experimentVariantSchema,
          [ExperimentVariant.B]: experimentVariantSchema,
        }),
      }),
      steps: createDictionarySchema({
        oneOf: [
          createObjectSchema({ ...commonStepProperties, type: { const: StepType.Information } }, [
            'id',
            'content',
            'type',
          ]),
          createObjectSchema(
            {
              ...commonStepProperties,
              type: { const: StepType.Result },
              resultSource: { const: 'resultRules' },
            },
            ['id', 'content', 'type', 'resultSource'],
          ),
          createObjectSchema(
            {
              ...commonStepProperties,
              type: { const: StepType.Number },
              input: createObjectSchema(
                {
                  name: identifierSchema,
                  min: { type: 'number' },
                  max: { type: 'number' },
                  step: { type: 'number', exclusiveMinimum: 0 },
                  unit: textSchema,
                },
                ['name', 'min', 'max', 'step'],
              ),
              validation: answerValidationSchema,
            },
            ['id', 'content', 'type', 'input', 'validation'],
          ),
          createObjectSchema(
            {
              ...commonStepProperties,
              type: { enum: [StepType.SingleSelect, StepType.MultiSelect] },
              input: selectionInputSchema,
              validation: answerValidationSchema,
            },
            ['id', 'content', 'type', 'input', 'validation'],
          ),
        ],
      }),
      resultRules: {
        type: 'array',
        maxItems: 100,
        items: createObjectSchema({ resultId: identifierSchema, when: conditionReferenceSchema }),
      },
      defaultResultId: identifierSchema,
      results: createDictionarySchema(
        createObjectSchema({
          id: identifierSchema,
          title: textSchema,
          summary: textSchema,
          recommendations: recommendationsSchema,
          cta: primaryActionSchema,
        }),
      ),
      events: createObjectSchema({
        baseProperties: identifierListSchema,
        allowed: {
          type: 'array',
          minItems: 7,
          maxItems: 50,
          items: createObjectSchema({
            name: identifierSchema,
            trigger: textSchema,
            properties: identifierListSchema,
          }),
        },
        privacy: createObjectSchema({
          storeRawAnswers: { const: false },
          allowAnswerKinds: { const: true },
        }),
      }),
    },
    [
      'schemaVersion',
      'funnelId',
      'version',
      'status',
      'locale',
      'title',
      'description',
      'session',
      'progress',
      'experiment',
      'steps',
      'resultRules',
      'defaultResultId',
      'results',
      'events',
    ],
  ),
  $defs: {
    condition: {
      oneOf: [
        createObjectSchema({
          all: { type: 'array', minItems: 1, maxItems: 30, items: conditionReferenceSchema },
        }),
        createObjectSchema({
          any: { type: 'array', minItems: 1, maxItems: 30, items: conditionReferenceSchema },
        }),
        createObjectSchema({
          answer: identifierSchema,
          operator: { const: ConditionOperator.Equal },
          value: { type: ['string', 'number'], maxLength: 100 },
        }),
        createObjectSchema({
          answer: identifierSchema,
          operator: { const: ConditionOperator.In },
          value: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            uniqueItems: true,
            items: { type: ['string', 'number'], maxLength: 100 },
          },
        }),
        createObjectSchema({
          answer: identifierSchema,
          operator: { const: ConditionOperator.Contains },
          value: identifierSchema,
        }),
        createObjectSchema({
          answer: identifierSchema,
          operator: { const: ConditionOperator.GreaterThanOrEqual },
          value: { type: 'number' },
        }),
      ],
    },
  },
};
