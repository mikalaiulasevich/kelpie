import * as filesystem from 'node:fs/promises';
import { BackendApplicationFixture } from '../../fixtures/backend-application.js';
import { PrismaClient } from '../../../generated/prisma/client.js';
import { TrafficSeedTarget } from './traffic-seed-target.js';
import { readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
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

  it('preserves a source query failure and both real client disconnect failures', async () => {
    const fixture = await TrafficSeedCommandFixture.checkpoint();
    const destination = resolve(fixture.output, 'target.sqlite');
    await writeFile(destination, '');
    const disconnect = PrismaClient.prototype.$disconnect;
    const sourceCleanup = new Error('Source disconnect failed');
    const targetCleanup = new Error('Target disconnect failed');
    const released: PrismaClient[] = [];

    try {
      vi.spyOn(TrafficSeedCommand, 'destination').mockResolvedValue(`file:${destination}`);
      vi.spyOn(TrafficSeedTarget, 'prepare').mockImplementation(async (target) => {
        await target.$connect();
      });
      vi.spyOn(PrismaClient.prototype, '$disconnect').mockImplementation(async function (
        this: PrismaClient,
      ) {
        await disconnect.call(this);
        released.push(this);

        if (released.length === 1) {
          throw sourceCleanup;
        }

        throw targetCleanup;
      });
      // The source fixture bytes are not a SQLite file: session.count fails inside the real command.
      const failure: unknown = await TrafficSeedCommand.run(fixture.options).catch(
        (error: unknown) => error,
      );

      expect(released).toHaveLength(2);
      expect(released[0]).not.toBe(released[1]);
      expect(failure).toBeInstanceOf(AggregateError);

      if (!(failure instanceof AggregateError) || !(failure.errors[0] instanceof AggregateError)) {
        throw new Error('Missing database cleanup failure evidence');
      }

      const sourceFailure = failure.errors[0];
      expect(failure.errors).toEqual([sourceFailure, targetCleanup]);
      expect(failure.cause).toBe(targetCleanup);
      expect(sourceFailure.errors).toEqual([sourceFailure.errors[0], sourceCleanup]);
      expect(sourceFailure.cause).toBe(sourceCleanup);
      expect(sourceFailure.errors[0]).toBeInstanceOf(Error);
      expect(sourceFailure.errors[0]).not.toBe(sourceCleanup);
      expect(sourceFailure.errors[0]).not.toBe(targetCleanup);
    } finally {
      vi.restoreAllMocks();
      await rm(fixture.output, { recursive: true, force: true });
    }
  });

  it('removes an acquired checkpoint directory when setup fails', async () => {
    const fixture = await TrafficSeedCommandFixture.checkpoint();
    const primary = new Error('Checkpoint setup failed');

    try {
      vi.spyOn(filesystem, 'mkdtemp').mockResolvedValueOnce(fixture.output);
      vi.spyOn(TrafficSeedCommand, 'options').mockImplementationOnce(() => {
        throw primary;
      });

      await expect(TrafficSeedCommandFixture.checkpoint()).rejects.toBe(primary);
      await expect(filesystem.access(fixture.output)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      vi.restoreAllMocks();
      await rm(fixture.output, { recursive: true, force: true });
    }
  });

  it('removes the checkpoint when target backend acquisition fails', async () => {
    const fixture = await TrafficSeedCommandFixture.checkpoint();
    const primary = new Error('Backend acquisition failed');

    try {
      vi.spyOn(TrafficSeedCommandFixture, 'checkpoint').mockResolvedValueOnce(fixture);
      vi.spyOn(BackendApplicationFixture, 'create').mockRejectedValueOnce(primary);

      await expect(TrafficSeedCommandFixture.target()).rejects.toBe(primary);
      await expect(filesystem.access(fixture.output)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      vi.restoreAllMocks();
      await rm(fixture.output, { recursive: true, force: true });
    }
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
      expect((await TrafficSeedCheckpoint.dataset(fixture.options)).path).toBe(
        await realpath(fixture.path),
      );
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
