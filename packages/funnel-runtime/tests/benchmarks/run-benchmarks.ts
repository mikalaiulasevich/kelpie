import { MnemonistCases } from '../cases/mnemonist-cases.js';
import { MeasurementPolicy } from './measurement-policy.js';
import { BenchmarkSuite } from './measurement-types.js';
import { BenchmarkCases } from '../cases/benchmark-cases.js';
import { BenchmarkMeasurement } from './benchmark-measurement.js';
import { BenchmarkReport } from './benchmark-report.js';
import { MeasurementMessages } from './measurement-messages.js';

const suite = process.argv.includes(MeasurementPolicy.MnemonistArgument) ? BenchmarkSuite.Mnemonist : BenchmarkSuite.Runtime;
const scenarios = suite === BenchmarkSuite.Mnemonist ? MnemonistCases.create() : BenchmarkCases.create();
const metadata = await BenchmarkReport.prepare(suite);
const results = BenchmarkMeasurement.run(scenarios);
const directory = await BenchmarkReport.save(metadata, results);
console.info(MeasurementMessages.Saved(directory));
