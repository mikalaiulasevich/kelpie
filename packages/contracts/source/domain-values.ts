/** Serialized values are part of the supplied configuration contract. */
export const ExperimentVariant = Object.freeze({
  A: 'A',
  B: 'B',
} as const);

export type ExperimentVariant = (typeof ExperimentVariant)[keyof typeof ExperimentVariant];

export const StepType = Object.freeze({
  Information: 'info',
  SingleSelect: 'single-select',
  MultiSelect: 'multi-select',
  Number: 'number',
  Result: 'result',
} as const);

export type StepType = (typeof StepType)[keyof typeof StepType];

export const ConditionOperator = Object.freeze({
  Equal: 'eq',
  In: 'in',
  Contains: 'contains',
  GreaterThanOrEqual: 'gte',
} as const);

export type ConditionOperator = (typeof ConditionOperator)[keyof typeof ConditionOperator];

export const ConfigurationStatus = Object.freeze({
  Draft: 'draft',
  Published: 'published',
} as const);

export type ConfigurationStatus = (typeof ConfigurationStatus)[keyof typeof ConfigurationStatus];
