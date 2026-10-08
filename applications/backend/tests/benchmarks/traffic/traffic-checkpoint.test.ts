import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BackendApplicationFixture } from '../../fixtures/backend-application.js';
import { TrafficHttp } from '../../fixtures/traffic/traffic-http.js';
import { TrafficProfile, TrafficRunner } from './traffic-runner.js';
import { TrafficProfileDatabase } from '../traffic-profile-database.js';

const directories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('synthetic traffic durable checkpoints', () => {
  it('requires both a checkpoint directory and an explicit local snapshot for resume', () => {
    expect(() => TrafficRunner.options(['--resume=checkpoint'])).toThrow();
    expect(() => TrafficRunner.options(['--database=snapshot.sqlite'])).toThrow();
    expect(
      TrafficRunner.options(['--resume=checkpoint', '--database=snapshot.sqlite']),
    ).toMatchObject({ resume: 'checkpoint', database: 'snapshot.sqlite' });
  });

  it('counts failures while consuming a response body', async () => {
    const backend = await BackendApplicationFixture.create();
    const transferFailure = new Error('Response transfer interrupted');
    vi.spyOn(backend, 'request').mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.error(transferFailure);
          },
        }),
      ),
    );
    const http = new TrafficHttp(backend);

    try {
      await expect(http.request('/api/health/ready', undefined)).rejects.toThrow();
      expect(http.networkFailures).toBe(1);
    } finally {
      await backend.close();
    }
  });

  it('restores a disposable copy without changing the saved SQLite snapshot', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'kelpie-traffic-copy-'));
    directories.push(directory);
    const original = await BackendApplicationFixture.create();

    try {
      const snapshot = await TrafficProfileDatabase.snapshot(original, directory);
      const before = createHash('sha256')
        .update(await readFile(snapshot.path))
        .digest('hex');
      const restored = await BackendApplicationFixture.createFromSnapshot(snapshot.path);

      try {
        await restored.database.funnel.create({ data: { identifier: 'copy-only' } });
        expect(await original.database.funnel.count()).toBe(0);
      } finally {
        await restored.close();
      }

      expect(
        createHash('sha256')
          .update(await readFile(snapshot.path))
          .digest('hex'),
      ).toBe(before);
    } finally {
      await original.close();
    }
  });

  it('saves manifest and generation measurements before an analytics HTTP failure', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'kelpie-traffic-checkpoint-'));
    directories.push(directory);
    const backend = await BackendApplicationFixture.create({
      TRUST_PROXY_LOOPBACK: 'true',
      LOG_LEVEL: 'fatal',
    });
    const original = TrafficHttp.prototype.request;
    vi.spyOn(TrafficHttp.prototype, 'request').mockImplementation(function (
      this: TrafficHttp,
      path,
      body,
      cookie,
      visitor,
    ) {
      if (path.startsWith('/api/administration/analytics')) {
        return original.call(this, '/api/nonexistent-profile-endpoint', body, cookie, visitor);
      }

      return original.call(this, path, body, cookie, visitor);
    });

    try {
      await expect(
        new TrafficProfile(backend, {
          sessions: 3,
          concurrency: 1,
          seed: 20261008,
          output: directory,
        }).execute(),
      ).rejects.toThrow();
      expect(JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'))).toHaveLength(
        3,
      );
      expect(
        JSON.parse(await readFile(resolve(directory, 'generation.json'), 'utf8')),
      ).toMatchObject({ elapsedMilliseconds: expect.any(Number), traffic: expect.any(Object) });
      expect(JSON.parse(await readFile(resolve(directory, 'failure.json'), 'utf8'))).toMatchObject({
        completedSessions: 3,
        retainedDatabase: { path: expect.any(String) },
      });
      expect(() => backend.getApplication()).toThrow();
      vi.restoreAllMocks();
      const snapshot = (await readdir(directory)).find((filename) => filename.endsWith('.sqlite'));
      assert.ok(snapshot);
      const resumedOutput = resolve(directory, 'resumed');
      await TrafficRunner.run({
        sessions: 3,
        concurrency: 1,
        seed: 20261008,
        output: resumedOutput,
        resume: directory,
        database: resolve(directory, snapshot),
      });
      expect(
        JSON.parse(await readFile(resolve(resumedOutput, 'report.json'), 'utf8')),
      ).toMatchObject({ database: { sessions: 3 }, oracle: { verified: true } });
    } finally {
      await backend.close();
    }
  });
});
