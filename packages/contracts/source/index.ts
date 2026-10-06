export {
  ConditionOperator,
  ConfigurationStatus,
  ExperimentVariant,
  StepType,
} from './domain-values.js';

export type {
  AllConditions,
  AnyCondition,
  AnswerCondition,
  Condition,
  ContainsCondition,
  EqualCondition,
  IncludedCondition,
  MinimumCondition,
} from './condition-types.js';

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
} from './step-types.js';

export type { FunnelResult, PrimaryAction, ResultOverride, ResultRule } from './result-types.js';

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
} from './configuration-types.js';

export { DictionaryAccess } from './dictionary.js';
export type { SelectionLimits } from './step-rules.js';

export { FunnelConfigurations } from './funnel-configurations.js';
export { StepRules } from './step-rules.js';
export { ConfigurationDocumentBounds } from './configuration-document-bounds.js';
