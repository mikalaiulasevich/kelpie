import type {
  ExperimentVariant,
  FunnelResult,
  FunnelStep,
  SessionAnswers,
} from '@kelpie/contracts';

export const AnswerIssueCode = Object.freeze({
  NotInteractive: 'not_interactive',
  Required: 'required',
  Type: 'type',
  Minimum: 'min',
  Maximum: 'max',
  Increment: 'step',
  Option: 'option',
  Duplicate: 'duplicate',
  MinimumSelections: 'minSelections',
  MaximumSelections: 'maxSelections',
} as const);

export type AnswerIssueCode = (typeof AnswerIssueCode)[keyof typeof AnswerIssueCode];

export interface AnswerIssue {
  readonly code: AnswerIssueCode;
  readonly message: string;
}

export type AnswerValidationResult =
  | { readonly valid: true; readonly issues: readonly [] }
  | { readonly valid: false; readonly issues: readonly AnswerIssue[] };

export interface ResolvedExperimentConfiguration {
  readonly variant: ExperimentVariant;
  readonly stepSequence: readonly string[];
  readonly steps: Readonly<Record<string, FunnelStep>>;
  readonly results: Readonly<Record<string, FunnelResult>>;
}

export interface AvailableRoute {
  readonly steps: readonly FunnelStep[];
  readonly activeAnswers: SessionAnswers;
  readonly questionCount: number;
  readonly completedQuestionCount: number;
}
