import * as filesystem from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { TrafficSeedFilesFixture } from '../../fixtures/traffic-seed-files-fixture.js';
import { TrafficSeedFiles } from './traffic-seed-files.js';

vi.mock(import('node:fs/promises'), async (importOriginal) => {
  const original = await importOriginal();

  return {
    ...original,
    open: vi.fn(original.open),
    rm: vi.fn(original.rm),
    link: vi.fn(original.link),
  };
});

describe('seed checkpoint file lifecycle', () => {
  it('removes a partially written temporary file while retaining the primary failure', async () => {
    const fixture = await TrafficSeedFilesFixture.create();
    const primary = new Error('Injected write failure after partial bytes');
    await TrafficSeedFilesFixture.rejectAfterPartialWrite(primary);

    try {
      await expect(
        TrafficSeedFiles.writeOnce(fixture.destination, 'complete-content'),
      ).rejects.toBe(primary);
      expect(await filesystem.readdir(fixture.directory)).toEqual([]);
    } finally {
      vi.restoreAllMocks();
      vi.resetAllMocks();
      await filesystem.rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it('retains primary and cleanup errors when partial-write disposal also fails', async () => {
    const fixture = await TrafficSeedFilesFixture.create();
    const primary = new Error('Injected partial-write failure');
    const cleanup = new Error('Injected temporary-file removal failure');
    await TrafficSeedFilesFixture.rejectAfterPartialWrite(primary);
    vi.mocked(filesystem.rm).mockRejectedValueOnce(cleanup);

    try {
      await expect(
        TrafficSeedFiles.writeOnce(fixture.destination, 'complete-content'),
      ).rejects.toMatchObject({
        errors: [primary, expect.objectContaining({ errors: [cleanup] })],
      });
      expect(await filesystem.readdir(fixture.directory)).toHaveLength(1);
    } finally {
      vi.restoreAllMocks();
      vi.resetAllMocks();
      await filesystem.rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it('retains publication and removal failures after a failed link', async () => {
    const fixture = await TrafficSeedFilesFixture.create();
    const primary = new Error('Injected checkpoint publication failure');
    const cleanup = new Error('Injected checkpoint removal failure');
    vi.mocked(filesystem.link).mockRejectedValueOnce(primary);
    vi.mocked(filesystem.rm).mockRejectedValueOnce(cleanup);

    try {
      await expect(
        TrafficSeedFiles.writeOnce(fixture.destination, 'complete-content'),
      ).rejects.toMatchObject({
        cause: expect.objectContaining({ errors: [cleanup] }),
        errors: [primary, expect.objectContaining({ errors: [cleanup] })],
      });
      expect(await filesystem.readdir(fixture.directory)).toHaveLength(1);
    } finally {
      vi.resetAllMocks();
      await filesystem.rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it('does not remove an existing file when exclusive acquisition fails', async () => {
    const fixture = await TrafficSeedFilesFixture.create();
    await filesystem.writeFile(fixture.destination, 'existing-checkpoint');
    const collision = Object.assign(new Error('Injected exclusive acquisition collision'), {
      code: 'EEXIST',
    });
    vi.mocked(filesystem.open).mockRejectedValueOnce(collision);

    try {
      await expect(TrafficSeedFiles.writeOnce(fixture.destination, 'replacement')).rejects.toBe(
        collision,
      );
      expect(filesystem.rm).not.toHaveBeenCalled();
      expect(await filesystem.readFile(fixture.destination, 'utf8')).toBe('existing-checkpoint');
    } finally {
      vi.resetAllMocks();
      await filesystem.rm(fixture.directory, { recursive: true, force: true });
    }
  });
});
