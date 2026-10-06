import type { ExperimentVariant, FunnelConfiguration, FunnelResult, SessionAnswers } from '@kelpie/contracts';
import { FunnelEvaluation } from '../evaluation/funnel-evaluation.js';

export const ResultResolution = {
  resolve(configuration: FunnelConfiguration, variant: ExperimentVariant, answers: SessionAnswers): Optional<FunnelResult> {
    return FunnelEvaluation.evaluate(configuration, variant, answers).result;
  },
} as const;
