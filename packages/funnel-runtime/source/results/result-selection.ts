import {
  DictionaryAccess,
  type FunnelConfiguration,
  type ExperimentVariant,
  type FunnelResult,
  type SessionAnswers,
} from '@kelpie/contracts';
import { ConditionEvaluation } from '../conditions/condition-evaluation.js';
import { VariantOverrides } from '../experiments/variant-overrides.js';
import type { EvaluatedRoute } from '../routes/route-types.js';

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

export const ResultSelection = {
  select(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    evaluation: EvaluatedRoute,
  ): Optional<FunnelResult> {
    if (!evaluation.isComplete) {
      return undefined;
    }

    const resultIdentifier = ResultRules.selectIdentifier(
      configuration,
      evaluation.route.activeAnswers,
    );
    const result = DictionaryAccess.readOwn(configuration.results, resultIdentifier);

    if (result === undefined) {
      return undefined;
    }

    return VariantOverrides.result(result, configuration.experiment.variants[variant]);
  },
} as const;
