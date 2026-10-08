import * as filesystem from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { TrafficSeedFilesFixture } from '../../fixtures/traffic-seed-files-fixture.js';
import { TrafficSeedFiles } from './traffic-seed-files.js';

describe('seed checkpoint file lifecycle', () => {
  it('removes a partially written temporary file while retaining the primary failure', async () => {
    const fixture = await TrafficSeedFilesFixture.create();
    const primary = new Error('Injected write failure after partial bytes');
    TrafficSeedFilesFixture.rejectAfterPartialWrite(primary);

    try {
      await expect(
        TrafficSeedFiles.writeOnce(fixture.destination, 'complete-content'),
      ).rejects.toBe(primary);
      expect(await filesystem.readdir(fixture.directory)).toEqual([]);
    } finally {
      vi.restoreAllMocks();
      await filesystem.rm(fixture.directory, { recursive: true, force: true });
    }
  });

  it('retains primary and cleanup errors when partial-write disposal also fails', async () => {
    const fixture = await TrafficSeedFilesFixture.create();
    const primary = new Error('Injected partial-write failure');
    const cleanup = new Error('Injected temporary-file removal failure');
    TrafficSeedFilesFixture.rejectAfterPartialWrite(primary);
    vi.spyOn(filesystem, 'rm').mockRejectedValueOnce(cleanup);

    try {
      await expect(
        TrafficSeedFiles.writeOnce(fixture.destination, 'complete-content'),
      ).rejects.toMatchObject({
        cause: primary,
        errors: [primary, expect.objectContaining({ errors: [cleanup] })],
      });
      expect(await filesystem.readdir(fixture.directory)).toHaveLength(1);
    } finally {
      vi.restoreAllMocks();
      await filesystem.rm(fixture.directory, { recursive: true, force: true });
    }
  });
});
