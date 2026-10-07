import type { BenchmarkCase } from './benchmark-types.js';

export interface BenchmarkSampleCollection {
  readonly scenario: BenchmarkCase;
  readonly samples: number[];
}

export const BenchmarkSuite = { Runtime: 'runtime' } as const;

export type BenchmarkSuite = ValueOf<typeof BenchmarkSuite>;

export interface BenchmarkMeasurementResult {
  readonly name: string;
  readonly size: number;
  readonly iterations: number;
  readonly samplesNanosecondsPerOperation: ReadonlyList<number>;
  readonly medianNanosecondsPerOperation: number;
  readonly minimumNanosecondsPerOperation: number;
  readonly maximumNanosecondsPerOperation: number;
}

export interface BenchmarkEnvironment {
  readonly node: string;
  readonly v8: string;
  readonly platform: string;
  readonly architecture: string;
  readonly processor: Optional<string>;
  readonly revision: string;
  readonly workingTreeChanged: boolean;
  readonly sourceHash: string;
  readonly compiledHash: string;
}

export interface BenchmarkReportMetadata {
  readonly suite: BenchmarkSuite;
  readonly run: string;
  readonly scope: string;
  readonly warmupIterations: number;
  readonly samplingOrder: string;
  readonly environment: BenchmarkEnvironment;
}

export interface BenchmarkReportData extends BenchmarkReportMetadata {
  readonly results: ReadonlyList<BenchmarkMeasurementResult>;
}
