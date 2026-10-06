export const AnswerIssueCode = {
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
} as const;

export type AnswerIssueCode = ValueOf<typeof AnswerIssueCode>;

export interface AnswerIssue {
  readonly code: AnswerIssueCode;
  readonly message: string;
}

export type AnswerValidationResult =
  | { readonly valid: true; readonly issues: readonly [] }
  | { readonly valid: false; readonly issues: ReadonlyList<AnswerIssue> };
