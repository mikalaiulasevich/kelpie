export {
  ConditionOperator,
  ConfigurationStatus,
  ExperimentVariant,
  StepType,
} from './shared/domain-values.js';

export type {
  AllConditions,
  AnyCondition,
  AnswerCondition,
  Condition,
  ContainsCondition,
  EqualCondition,
  IncludedCondition,
  MinimumCondition,
} from './conditions/condition-types.js';

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
} from './steps/step-types.js';

export type { FunnelResult, PrimaryAction, ResultOverride, ResultRule } from './results/result-types.js';

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
} from './configurations/configuration-types.js';

export { DictionaryAccess } from './shared/dictionary.js';
export type { SelectionLimits } from './steps/step-rules.js';

export { FunnelConfigurations } from './configurations/funnel-configurations.js';
export { StepRules } from './steps/step-rules.js';
export { ConfigurationDocumentBounds } from './configurations/validation/configuration-document-bounds.js';
