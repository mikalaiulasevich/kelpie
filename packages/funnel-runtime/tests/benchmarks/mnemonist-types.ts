import type { MultipleSelectionStep } from '@kelpie/contracts';

export interface SelectionMembershipResult {
  readonly duplicate: boolean;
  readonly unavailable: boolean;
}

export interface SelectionMembershipScenario {
  readonly name: string;
  readonly answers: ReadonlyList<string>;
  readonly expected: SelectionMembershipResult;
}

export interface SelectionMembershipImplementation {
  readonly name: string;
  readonly run: (
    step: MultipleSelectionStep,
    answers: ReadonlyList<string>,
  ) => SelectionMembershipResult;
}

export interface TraversalPayload {
  readonly position: number;
  readonly value: { readonly identifier: string };
}
