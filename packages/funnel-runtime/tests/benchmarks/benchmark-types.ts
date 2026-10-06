import type { FunnelConfiguration, SessionAnswers } from '@kelpie/contracts';

export interface BenchmarkCase {
  readonly name: string;
  readonly size: number;
  readonly iterations: number;
  readonly run: () => unknown;
  readonly verify: () => void;
}

export interface BenchmarkFunnel {
  readonly configuration: FunnelConfiguration;
  readonly answers: SessionAnswers;
}
