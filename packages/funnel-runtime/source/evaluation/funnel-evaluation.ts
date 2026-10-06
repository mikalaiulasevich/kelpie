import type { ExperimentVariant, FunnelConfiguration, SessionAnswers } from '@kelpie/contracts';
import { RouteBuilder } from '../routes/route-builder.js';
import { ResultSelection } from '../results/result-selection.js';
import type { EvaluatedFunnel } from './evaluation-types.js';

export const FunnelEvaluation = {
  evaluate(
    configuration: FunnelConfiguration,
    variant: ExperimentVariant,
    answers: SessionAnswers,
  ): EvaluatedFunnel {
    const evaluation = RouteBuilder.resolve(configuration, variant, answers);

    return {
      route: evaluation.route,
      result: ResultSelection.select(configuration, variant, evaluation),
    };
  },
} as const;
