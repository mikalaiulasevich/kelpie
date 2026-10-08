import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, open, rm, type FileHandle } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { isError } from 'es-toolkit/predicate';
import { TrafficSeedMessages } from './traffic-seed-messages.js';

const TemporarySeedFile = {
  async remove(handle: FileHandle, path: string): Promise<void> {
    const errors: unknown[] = [];

    try {
      await handle.close();
    } catch (error) {
      errors.push(error);
    }

    try {
      await rm(path, { force: true });
    } catch (error) {
      errors.push(error);
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, TrafficSeedMessages.CleanupFailed);
    }
  },

  async publish(
    handle: FileHandle,
    temporaryPath: string,
    path: string,
    contents: string,
  ): Promise<boolean> {
    await handle.writeFile(contents);

    try {
      // Linking publishes the complete file atomically and cannot replace a competing run.
      await link(temporaryPath, path);

      return true;
    } catch (error) {
      if (!isError(error) || !('code' in error) || error.code !== 'EEXIST') {
        throw error;
      }

      return false;
    }
  },
} as const;

export const TrafficSeedFiles = {
  async digest(path: string): Promise<string> {
    const hash = createHash('sha256');
    await pipeline(createReadStream(path), hash);

    return hash.digest('hex');
  },

  async writeOnce(path: string, contents: string): Promise<boolean> {
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    const handle = await open(temporaryPath, 'wx', 0o600);
    const publish = {
      async run() {
        try {
          return await TemporarySeedFile.publish(handle, temporaryPath, path, contents);
        } catch (error) {
          try {
            await TemporarySeedFile.remove(handle, temporaryPath);
          } catch (cleanupError) {
            throw new AggregateError([error, cleanupError], TrafficSeedMessages.CleanupFailed, {
              cause: cleanupError,
            });
          }

          throw error;
        }
      },
    };
    const published = await publish.run();
    await TemporarySeedFile.remove(handle, temporaryPath);

    return published;
  },
} as const;
