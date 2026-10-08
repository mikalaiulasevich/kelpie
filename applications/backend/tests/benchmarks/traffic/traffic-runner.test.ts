import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrafficRunner, TrafficProfile } from './traffic-runner.js';
import { BackendApplicationFixture } from '../../fixtures/backend-application.js';
import { TrafficSession } from '../../fixtures/traffic/traffic-session.js';

const directories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('synthetic traffic runner boundaries and recovery', () => {
  it('rejects unknown remote targets and invalid workloads, preserving equals in output paths', () => {
    expect(() => TrafficRunner.options(['--url=https://example.com'])).toThrow();
    expect(() => TrafficRunner.options(['--sessions=0'])).toThrow();
    expect(() => TrafficRunner.options(['--concurrency=33'])).toThrow();
    expect(() => TrafficRunner.options(['--sessions'])).toThrow();
    expect(() => TrafficRunner.options(['--sessions=2', '--sessions=3'])).toThrow();
    expect(() => TrafficRunner.options(['--seed=1', '--seed=1'])).toThrow();
    expect(TrafficRunner.options(['--sessions=2', '--output=directory=with-equals'])).toMatchObject(
      { sessions: 2, output: 'directory=with-equals' },
    );
  });

  it('keeps completed manifest and HTTP failure evidence, then closes the real backend', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'kelpie-traffic-failure-'));
    directories.push(directory);
    const backend = await BackendApplicationFixture.create({
      TRUST_PROXY_LOOPBACK: 'true',
      LOG_LEVEL: 'fatal',
    });
    const close = vi.spyOn(backend, 'close');
    const original = TrafficSession.run.bind(TrafficSession);
    vi.spyOn(TrafficSession, 'run').mockImplementation(
      async (http, cookie, version, index, seed) => {
        if (index === 1) {
          // The unauthenticated command exercises an actual HTTP 401 rejection.
          await http.request('/api/sessions/current/answers', { invalid: true });
          assert.fail();
        }

        return original(http, cookie, version, index, seed);
      },
    );
    const profile = new TrafficProfile(backend, {
      sessions: 2,
      concurrency: 1,
      seed: 20261008,
      output: directory,
    });

    try {
      await expect(profile.execute()).rejects.toThrow();
      expect(close).toHaveBeenCalledTimes(1);
      const failure: unknown = JSON.parse(
        await readFile(resolve(directory, 'failure.json'), 'utf8'),
      );
      expect(failure).toMatchObject({ status: 'failed', completedSessions: 1 });
      const partial: unknown = JSON.parse(
        await readFile(resolve(directory, 'partial-manifest.json'), 'utf8'),
      );
      expect(partial).toEqual([expect.objectContaining({ index: 0 })]);
      expect(() => backend.getApplication()).toThrow();
    } finally {
      await backend.close();
    }
  });
});
