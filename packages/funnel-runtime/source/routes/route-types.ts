import type { FunnelStep, SessionAnswers } from '@kelpie/contracts';

export interface AvailableRoute {
  readonly steps: readonly FunnelStep[];
  readonly activeAnswers: SessionAnswers;
  readonly questionCount: number;
  readonly completedQuestionCount: number;
}
