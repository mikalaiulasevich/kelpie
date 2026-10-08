import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TrafficSeedCases } from '../../cases/traffic-seed-cases.js';
import { TrafficSeedCommandFixture } from '../../fixtures/traffic-seed-command-fixture.js';
import { TrafficSeedCommand } from './traffic-seed-command.js';
import { TrafficSeedCheckpoint } from './traffic-seed-checkpoint.js';
import { TrafficSeedFiles } from './traffic-seed-files.js';

describe('synthetic seed CLI and durable checkpoint', () => {
  it.each(TrafficSeedCases.InvalidArguments)(
    'rejects invalid arguments $arguments',
    ({ arguments: arguments_ }) => {
      expect(() => TrafficSeedCommand.options(arguments_)).toThrow();
    },
  );

  it('defaults to 10000 sessions with separate local and remote artifact directories', () => {
    const local = TrafficSeedCommand.options(['--target=local', '--run=demo']);
    const remote = TrafficSeedCommand.options(['--target=remote', '--run=demo']);
    expect(local.sessions).toBe(10000);
    expect(local.days).toBe(28);
    expect(local.output).not.toBe(remote.output);
  });

  it('preserves anchor across retries and rejects changed workload or target', async () => {
    const fixture = await TrafficSeedCommandFixture.checkpoint();

    try {
      const first = await TrafficSeedCheckpoint.read(fixture.options);
      expect(await TrafficSeedCheckpoint.read(fixture.options)).toEqual(first);
      await expect(
        TrafficSeedCheckpoint.read({ ...fixture.options, target: 'remote' }),
      ).rejects.toThrow();
      await expect(TrafficSeedCheckpoint.read({ ...fixture.options, seed: 1 })).rejects.toThrow();
    } finally {
      await rm(fixture.output, { recursive: true, force: true });
    }
  });

  it('binds source bytes before import and rejects subsequent dataset changes', async () => {
    const fixture = await TrafficSeedCommandFixture.checkpoint();

    try {
      expect((await TrafficSeedCheckpoint.dataset(fixture.options)).manifest).toHaveLength(1);
      expect((await TrafficSeedCheckpoint.dataset(fixture.options)).path).toBe(fixture.path);
      await writeFile(fixture.path, 'changed-snapshot');
      await expect(TrafficSeedCheckpoint.dataset(fixture.options)).rejects.toThrow();
    } finally {
      await rm(fixture.output, { recursive: true, force: true });
    }
  });

  it('rejects an unverified or mismatched generation report', async () => {
    const fixture = await TrafficSeedCommandFixture.checkpoint();
    const reportPath = resolve(fixture.profile, 'report.json');

    try {
      await writeFile(
        reportPath,
        JSON.stringify({ ...fixture.report, oracle: { verified: false } }),
      );
      await expect(TrafficSeedCheckpoint.dataset(fixture.options)).rejects.toThrow();
      await writeFile(
        reportPath,
        JSON.stringify({ ...fixture.report, options: { ...fixture.report.options, seed: 0 } }),
      );
      await expect(TrafficSeedCheckpoint.dataset(fixture.options)).rejects.toThrow();
    } finally {
      await rm(fixture.output, { recursive: true, force: true });
    }
  });

  it('atomically publishes one complete checkpoint under concurrent attempts', async () => {
    const fixture = await TrafficSeedCommandFixture.checkpoint();

    try {
      const path = resolve(fixture.output, 'competing.json');
      const outcomes = await Promise.all([
        TrafficSeedFiles.writeOnce(path, 'first'),
        TrafficSeedFiles.writeOnce(path, 'second'),
      ]);
      expect(outcomes.filter(Boolean)).toHaveLength(1);
      expect(['first', 'second']).toContain(await readFile(path, 'utf8'));
    } finally {
      await rm(fixture.output, { recursive: true, force: true });
    }
  });
});
