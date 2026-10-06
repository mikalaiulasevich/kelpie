import type { FunnelStep, SessionAnswers, StepAnswer } from '@kelpie/contracts';

export interface AvailableRoute {
  readonly steps: ReadonlyList<FunnelStep>;
  readonly activeAnswers: SessionAnswers;
  readonly questionCount: number;
  readonly completedQuestionCount: number;
}

export interface AcceptedStepAnswer {
  readonly name: string;
  readonly value: StepAnswer;
}
