import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, rm, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { isError } from 'es-toolkit/predicate';

export const TrafficSeedFiles = {
  async digest(path: string): Promise<string> {
    const hash = createHash('sha256');
    await pipeline(createReadStream(path), hash);

    return hash.digest('hex');
  },

  async writeOnce(path: string, contents: string): Promise<boolean> {
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, contents, { flag: 'wx', mode: 0o600 });

    try {
      // Linking publishes the complete file atomically and cannot replace a competing run.
      await link(temporaryPath, path);

      return true;
    } catch (error) {
      if (!isError(error) || !('code' in error) || error.code !== 'EEXIST') {
        throw error;
      }

      return false;
    } finally {
      await rm(temporaryPath, { force: true });
    }
  },
} as const;
