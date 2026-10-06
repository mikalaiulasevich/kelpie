/** Serialized values are part of the supplied configuration contract. */
export const ExperimentVariant = {
  A: 'A',
  B: 'B',
} as const;

export type ExperimentVariant = ValueOf<typeof ExperimentVariant>;

export const StepType = {
  Information: 'info',
  SingleSelect: 'single-select',
  MultiSelect: 'multi-select',
  Number: 'number',
  Result: 'result',
} as const;

export type StepType = ValueOf<typeof StepType>;

export const ConditionOperator = {
  Equal: 'eq',
  In: 'in',
  Contains: 'contains',
  GreaterThanOrEqual: 'gte',
} as const;

export type ConditionOperator = ValueOf<typeof ConditionOperator>;

export const ConfigurationStatus = {
  Draft: 'draft',
  Published: 'published',
} as const;

export type ConfigurationStatus = ValueOf<typeof ConfigurationStatus>;
