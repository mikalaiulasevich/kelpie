import assert from 'node:assert/strict';
import { access, mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Ajv } from 'ajv';
import { isEqual, isError } from 'es-toolkit/predicate';
import { TrafficRunner } from '../traffic/traffic-runner.js';
import { TrafficPolicy } from '../traffic/traffic-policy.js';
import { TrafficOracle } from '../traffic-oracle/traffic-oracle.js';
import { TrafficSeedMessages } from './traffic-seed-messages.js';
import { TrafficSeedPolicy } from './traffic-seed-policy.js';
import { TrafficSeedCheckpointSchema, TrafficSeedSourceReportSchema, type TrafficSeedOptions, type TrafficSeedCheckpoint as SeedCheckpoint, type TrafficSeedSourceReport } from './traffic-seed-types.js';

const CheckpointValidators = {
  checkpoint: new Ajv().compile<SeedCheckpoint>(TrafficSeedCheckpointSchema),
  report: new Ajv().compile<TrafficSeedSourceReport>(TrafficSeedSourceReportSchema),
} as const;

export const TrafficSeedCheckpoint = {
  async read(options: TrafficSeedOptions): Promise<SeedCheckpoint> {
    await mkdir(resolve(options.output), { recursive: true });
    const path = resolve(options.output, TrafficSeedPolicy.CheckpointFilename);
    const checkpoint = { options, anchor: new Date().toISOString() };

    try {
      await writeFile(path, JSON.stringify(checkpoint, null, 2), { flag: 'wx', mode: 0o600 });

      return checkpoint;
    } catch (error) {
      if (!(isError(error)) || !('code' in error) || error.code !== 'EEXIST') {
        throw error;
      }
    }

    const existing: unknown = JSON.parse(await readFile(path, 'utf8'));
    assert.ok(CheckpointValidators.checkpoint(existing), TrafficSeedMessages.Checkpoint);
    // A verified dataset can be installed in both targets without regenerating or moving dates.
    assert.ok(
      isEqual({ ...existing.options, target: options.target }, options),
      TrafficSeedMessages.Checkpoint,
    );

    return existing;
  },

  async dataset(options: TrafficSeedOptions) {
    const directory = resolve(options.output, 'profile');
    const reportPath = resolve(directory, 'report.json');

    try {
      await access(reportPath);
    } catch (error) {
      if (!(isError(error)) || !('code' in error) || error.code !== 'ENOENT') {
        throw error;
      }

      await TrafficRunner.run({
        sessions: options.sessions,
        concurrency: TrafficPolicy.Concurrency,
        seed: options.seed,
        output: directory,
      });
    }

    const report: unknown = JSON.parse(await readFile(reportPath, 'utf8'));
    assert.ok(CheckpointValidators.report(report), TrafficSeedMessages.Source);
    const manifest = TrafficOracle.validate(
      JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8')),
    );
    assert.equal(manifest.length, options.sessions, TrafficSeedMessages.Source);

    return { path: await realpath(report.retainedDatabase.path), manifest };
  },
} as const;

