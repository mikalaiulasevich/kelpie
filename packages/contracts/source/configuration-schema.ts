const identifier = {
  type: 'string',
  minLength: 1,
  maxLength: 100,
  pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
};
const text = { type: 'string', minLength: 1, maxLength: 4000 };
const stringList = { type: 'array', items: identifier, maxItems: 100, uniqueItems: true };
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const dictionary = (values: unknown, maximum = 100) => ({
  type: 'object',
  propertyNames: identifier,
  additionalProperties: values,
  minProperties: 1,
  maxProperties: maximum,
});
const optionalDictionary = (values: unknown) => ({ ...dictionary(values), minProperties: 0 });
const content = object(
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
    ].map((name) => [name, text]),
  ),
  [],
);
const conditionReference = { $ref: '#/$defs/condition' };
const primaryAction = object({ label: text, action: { const: 'expand_recommendation' } });
const recommendations = { type: 'array', minItems: 1, maxItems: 30, items: text };
const validation = object(
  {
    required: { type: 'boolean' },
    minSelections: { type: 'integer', minimum: 0, maximum: 100 },
    maxSelections: { type: 'integer', minimum: 1, maximum: 100 },
    messages: optionalDictionary(text),
  },
  ['required', 'messages'],
);
const commonStep = { id: identifier, content, visibleWhen: conditionReference };
const selectionInput = object({
  name: identifier,
  options: {
    type: 'array',
    minItems: 1,
    maxItems: 100,
    items: object({ value: identifier, label: text }),
  },
});
const variant = object({
  weight: { type: 'number', minimum: 0, maximum: 100 },
  stepSequence: { ...stringList, minItems: 6 },
  stepOverrides: optionalDictionary(object({ content })),
  resultOverrides: optionalDictionary(
    object({ title: text, summary: text, recommendations, cta: primaryAction }, []),
  ),
});

export const funnelConfigurationSchema = {
  $id: 'https://kelpie.local/schemas/funnel-1.0',
  ...object(
    {
      schemaVersion: { const: '1.0' },
      funnelId: identifier,
      version: { type: 'integer', minimum: 1, maximum: 2147483647 },
      status: { enum: ['draft', 'published'] },
      locale: { type: 'string', minLength: 2, maxLength: 35 },
      title: text,
      description: text,
      releaseNote: text,
      session: object({
        ttlHours: { type: 'number', minimum: 1, maximum: 8760 },
        persistAnswers: { const: true },
        pinVersion: { const: true },
        pinExperimentVariant: { const: true },
      }),
      progress: object({
        countVisibleOnly: { const: true },
        excludeTypes: {
          type: 'array',
          items: { enum: ['info', 'single-select', 'multi-select', 'number', 'result'] },
          maxItems: 5,
          uniqueItems: true,
        },
      }),
      experiment: object({
        id: identifier,
        assignment: { const: 'server' },
        sticky: { const: true },
        overrideQueryParam: identifier,
        variants: object({ A: variant, B: variant }),
      }),
      steps: dictionary({
        oneOf: [
          object({ ...commonStep, type: { const: 'info' } }, ['id', 'content', 'type']),
          object(
            { ...commonStep, type: { const: 'result' }, resultSource: { const: 'resultRules' } },
            ['id', 'content', 'type', 'resultSource'],
          ),
          object(
            {
              ...commonStep,
              type: { const: 'number' },
              input: object(
                {
                  name: identifier,
                  min: { type: 'number' },
                  max: { type: 'number' },
                  step: { type: 'number', exclusiveMinimum: 0 },
                  unit: text,
                },
                ['name', 'min', 'max', 'step'],
              ),
              validation,
            },
            ['id', 'content', 'type', 'input', 'validation'],
          ),
          object(
            {
              ...commonStep,
              type: { enum: ['single-select', 'multi-select'] },
              input: selectionInput,
              validation,
            },
            ['id', 'content', 'type', 'input', 'validation'],
          ),
        ],
      }),
      resultRules: {
        type: 'array',
        maxItems: 100,
        items: object({ resultId: identifier, when: conditionReference }),
      },
      defaultResultId: identifier,
      results: dictionary(
        object({ id: identifier, title: text, summary: text, recommendations, cta: primaryAction }),
      ),
      events: object({
        baseProperties: stringList,
        allowed: {
          type: 'array',
          minItems: 7,
          maxItems: 50,
          items: object({ name: identifier, trigger: text, properties: stringList }),
        },
        privacy: object({ storeRawAnswers: { const: false }, allowAnswerKinds: { const: true } }),
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
        object({ all: { type: 'array', minItems: 1, maxItems: 30, items: conditionReference } }),
        object({ any: { type: 'array', minItems: 1, maxItems: 30, items: conditionReference } }),
        object({
          answer: identifier,
          operator: { const: 'eq' },
          value: { type: ['string', 'number'], maxLength: 100 },
        }),
        object({
          answer: identifier,
          operator: { const: 'in' },
          value: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            uniqueItems: true,
            items: { type: ['string', 'number'], maxLength: 100 },
          },
        }),
        object({ answer: identifier, operator: { const: 'contains' }, value: identifier }),
        object({ answer: identifier, operator: { const: 'gte' }, value: { type: 'number' } }),
      ],
    },
  },
};
