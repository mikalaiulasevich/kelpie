import { AnswerValidation } from './answers/answer-validation.js';
import { ConditionEvaluation } from './conditions/condition-evaluation.js';
import { ExperimentResolution } from './experiments/experiment-resolution.js';
import { ResultResolution } from './results/result-resolution.js';
import { RouteResolution } from './routes/route-resolution.js';

/** Grouped domain entry points. */
export const FunnelRuntime = {
  Answers: AnswerValidation,
  Conditions: ConditionEvaluation,
  Experiments: ExperimentResolution,
  Results: ResultResolution,
  Routes: RouteResolution,
} as const;
