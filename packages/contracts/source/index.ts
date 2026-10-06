export {
  ConditionOperator,
  ConfigurationStatus,
  ExperimentVariant,
  StepType,
} from './domain_values.js';

export type {
  AllConditions,
  AnyCondition,
  AnswerCondition,
  Condition,
  ContainsCondition,
  EqualCondition,
  IncludedCondition,
  MinimumCondition,
} from './condition_types.js';

export type {
  AnswerValidation,
  FunnelStep,
  InformationStep,
  InteractiveStep,
  MultipleSelectionStep,
  NumberInput,
  NumberStep,
  ResultStep,
  SelectionInput,
  SelectionOption,
  SelectionStep,
  SessionAnswers,
  SingleSelectionStep,
  StepAnswer,
  StepContent,
} from './step_types.js';

export type { FunnelResult, PrimaryAction, ResultOverride, ResultRule } from './result_types.js';

export type {
  ConfigurationIssue,
  ConfigurationValidationResult,
  EventDeclaration,
  EventPrivacyConfiguration,
  EventsConfiguration,
  ExperimentConfiguration,
  FunnelConfiguration,
  ProgressConfiguration,
  SessionConfiguration,
  StepOverride,
  VariantConfiguration,
} from './configuration_types.js';

export { configurationLimits, validateFunnelConfiguration } from './configuration_validation.js';
