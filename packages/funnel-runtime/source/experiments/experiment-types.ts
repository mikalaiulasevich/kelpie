import type { ExperimentVariant, FunnelResult, FunnelStep } from '@kelpie/contracts';

export interface ResolvedExperimentConfiguration {
  readonly variant: ExperimentVariant;
  readonly stepSequence: readonly string[];
  readonly steps: ReadonlyDictionary<string, FunnelStep>;
  readonly results: ReadonlyDictionary<string, FunnelResult>;
}
