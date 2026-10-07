import { appendFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile, type FileHandle } from 'node:fs/promises';
import { vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export class ConfigurationFileFixture implements AsyncDisposable {
  private constructor(readonly directory: string) {}

  static async create(): Promise<ConfigurationFileFixture> {
    return new ConfigurationFileFixture(await mkdtemp(join(tmpdir(), 'kelpie-configuration-')));
  }

  async write(contents: string): Promise<string> {
    const path = join(this.directory, 'input.json');
    await writeFile(path, contents);

    return path;
  }

  growBeforeStreaming(file: FileHandle, path: string): void {
    const createReadStream = file.createReadStream.bind(file);
    vi.spyOn(file, 'createReadStream').mockImplementationOnce((options) => {
      appendFileSync(path, ' ');

      return createReadStream(options);
    });
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await rm(this.directory, { recursive: true, force: true });
  }
}
