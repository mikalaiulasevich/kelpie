import { BenchmarkCases } from '../cases/benchmark-cases.js';
import { BenchmarkMeasurement } from './benchmark-measurement.js';
import { BenchmarkReport } from './benchmark-report.js';
import { MeasurementMessages } from './measurement-messages.js';

const metadata = await BenchmarkReport.prepare();
const scenarios = BenchmarkCases.create();
const results = BenchmarkMeasurement.run(scenarios);
const directory = await BenchmarkReport.save(metadata, results);
console.info(MeasurementMessages.Saved(directory));
