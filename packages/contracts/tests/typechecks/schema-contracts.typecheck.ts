import {
  ConditionOperator,
  type Condition,
  type FunnelConfiguration,
  type FunnelResult,
  type FunnelStep,
  type InformationStep,
  type ResultRule,
} from '../../source/index.js';

export const deeplyNestedCondition: Condition = {
  all: [
    {
      any: [{ all: [{ any: [{ answer: 'age', operator: ConditionOperator.Equal, value: 18 }] }] }],
    },
  ],
};

export const invalidNestedOperator: Condition = {
  all: [
    {
      any: [
        {
          all: [
            {
              any: [
                {
                  answer: 'age',
                  // @ts-expect-error Recursive leaves must retain the operator vocabulary at every depth.
                  operator: 'unknown-operator',
                  value: 18,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const invalidNestedValue: Condition = {
  all: [
    {
      any: [
        {
          all: [
            {
              any: [
                // @ts-expect-error Equal predicates accept strings or numbers, never booleans.
                {
                  answer: 'age',
                  operator: ConditionOperator.Equal,
                  value: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const invalidStepCondition: NonNullable<FunnelStep['visibleWhen']> = {
  all: [
    {
      any: [
        {
          all: [
            // @ts-expect-error Schema references must resolve to Condition rather than unknown or any.
            false,
          ],
        },
      ],
    },
  ],
};

export const invalidResultCondition: ResultRule['when'] = {
  all: [
    {
      any: [
        {
          all: [
            // @ts-expect-error Result rule references must preserve recursive condition safety.
            false,
          ],
        },
      ],
    },
  ],
};

declare const configuration: FunnelConfiguration;
declare const result: FunnelResult;

// @ts-expect-error Schema-derived configuration arrays must remain readonly.
configuration.experiment.variants.A.stepSequence.push('extra-step');

// @ts-expect-error Schema-derived nested objects must remain readonly.
configuration.session.ttlHours = 24;

// @ts-expect-error Schema-derived result arrays must remain readonly.
result.recommendations.push('extra-recommendation');

// @ts-expect-error Recursive configuration edges must remain readonly.
configuration.resultRules.push({ resultId: 'result', when: deeplyNestedCondition });

declare const informationStep: InformationStep;

export const informationContent: Readonly<{ title: string; body: string }> = {
  title: informationStep.content.title,
  body: informationStep.content.body,
};

// @ts-expect-error Information content must include all required fields from its schema.
export const incompleteInformationContent: InformationStep['content'] = { title: 'Only a title' };

export const optionalValue: Optional<string> = undefined;
export const nullableValue: Nullable<string> = null;
export const maybeValues: readonly Maybe<string>[] = ['present', null, undefined];

// @ts-expect-error Optional does not add null to the allowed values.
export const invalidOptionalValue: Optional<string> = null;

export const undefinedNullableValue: Nullable<string> = undefined;

// Global utility declarations must be available without a utility-type import.
declare const sessionIdentifier: Nominal<string, 'SessionIdentifier'>;
export const sessionIdentifierText: string = sessionIdentifier;

// @ts-expect-error Distinct nominal identities must not be interchangeable.
export const configurationIdentifier: Nominal<string, 'ConfigurationIdentifier'> =
  sessionIdentifier;

export const conditionVocabulary: Readonly<{ operator: ValueOf<typeof ConditionOperator> }> = {
  operator: ConditionOperator.Equal,
};
export const textDictionary: ReadonlyDictionary<string, string> = { key: 'value' };

// @ts-expect-error Global readonly dictionaries cannot be mutated.
textDictionary['key'] = 'changed';
