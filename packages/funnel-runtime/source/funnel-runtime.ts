import { validateStepAnswer } from './answer-validation.js';
import { evaluateCondition } from './condition-evaluation.js';
import {
  resolveAvailableSteps,
  resolveExperimentConfiguration,
  resolveFunnelResult,
  resolveNextStep,
  resolvePreviousStep,
} from './route-resolution.js';

/** Domain entry points; each group owns one coherent runtime responsibility. */
export const FunnelRuntime = Object.freeze({
  Answers: Object.freeze({ validate: validateStepAnswer }),
  Conditions: Object.freeze({ evaluate: evaluateCondition }),
  Experiments: Object.freeze({ resolve: resolveExperimentConfiguration }),
  Results: Object.freeze({ resolve: resolveFunnelResult }),
  Routes: Object.freeze({
    resolve: resolveAvailableSteps,
    next: resolveNextStep,
    previous: resolvePreviousStep,
  }),
});
