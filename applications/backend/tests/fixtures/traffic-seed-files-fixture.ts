import * as filesystem from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { vi } from 'vitest';

export const TrafficSeedFilesFixture = {
  async create() {
    const directory = await filesystem.mkdtemp(resolve(tmpdir(), 'kelpie-seed-files-'));

    return { directory, destination: resolve(directory, 'checkpoint.json') };
  },

  async rejectAfterPartialWrite(failure: Error): Promise<void> {
    const original = await vi.importActual<typeof filesystem>('node:fs/promises');
    vi.mocked(filesystem.open).mockImplementation(async (path, flags, mode) => {
      const handle = await original.open(path, flags, mode);
      const writeFile = handle.writeFile.bind(handle);
      vi.spyOn(handle, 'writeFile').mockImplementation(async () => {
        await writeFile('partial-checkpoint');

        throw failure;
      });

      return handle;
    });
  },
} as const;
