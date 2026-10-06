import {
  ConditionOperator,
  type Condition,
  type FunnelStep,
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
