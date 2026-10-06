import { AnswerValidation } from './answer-validation.js';
import { ConditionEvaluation } from './condition-evaluation.js';
import { ExperimentResolution } from './experiment-resolution.js';
import { ResultResolution } from './result-resolution.js';
import { RouteResolution } from './route-resolution.js';

/** Grouped domain entry points. */
export const FunnelRuntime = {
  Answers: AnswerValidation,
  Conditions: ConditionEvaluation,
  Experiments: ExperimentResolution,
  Results: ResultResolution,
  Routes: RouteResolution,
} as const;
