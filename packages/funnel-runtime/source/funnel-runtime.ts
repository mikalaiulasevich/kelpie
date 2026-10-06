import { validateStepAnswer } from './answer-validation.js';
import { evaluateCondition } from './condition-evaluation.js';
import { ExperimentResolution } from './experiment-resolution.js';
import { ResultResolution } from './result-resolution.js';
import { RouteResolution } from './route-resolution.js';

/** Domain entry points share implementations with the compatibility exports. */
export const FunnelRuntime = Object.freeze({
  Answers: Object.freeze({ validate: validateStepAnswer }),
  Conditions: Object.freeze({ evaluate: evaluateCondition }),
  Experiments: ExperimentResolution,
  Results: ResultResolution,
  Routes: RouteResolution,
});
