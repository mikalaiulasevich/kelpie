import {
  readOwnProperty,
  type ExperimentVariant,
  type FunnelConfiguration,
  type FunnelResult,
  type SessionAnswers,
} from '@kelpie/contracts';
import { ConditionEvaluation } from './condition-evaluation.js';
import { RouteResolution } from './route-resolution.js';
import { RouteSteps } from './route-steps.js';
import { VariantOverrides } from './variant-overrides.js';

/** Rules are ordered: stop at the first match and never evaluate later rules. */
const ResultRules = {
  selectIdentifier(configuration: FunnelConfiguration, answers: SessionAnswers): string {
    for (const rule of configuration.resultRules) {
      if (ConditionEvaluation.evaluate(rule.when, answers)) {
        return rule.resultId;
      }
    }

    return configuration.defaultResultId;
  },
} as const;

export const ResultResolution = {
  resolve(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    answers: SessionAnswers,
  ): Optional<FunnelResult> {
    const route = RouteResolution.resolve(configuration, variant, answers);
    const isComplete = route.steps.every((step) =>
      RouteSteps.isComplete(step, route.activeAnswers),
    );

    if (!isComplete) {
      return undefined;
    }

    const resultIdentifier = ResultRules.selectIdentifier(configuration, route.activeAnswers);
    const result = readOwnProperty(configuration.results, resultIdentifier);

    if (result === undefined) {
      return undefined;
    }

    return VariantOverrides.result(result, configuration.experiment.variants[variant]);
  },
} as const;
