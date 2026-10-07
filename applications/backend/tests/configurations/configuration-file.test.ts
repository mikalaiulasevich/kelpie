import * as FileSystem from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationFile } from '../../source/configurations/configuration-file.js';
import { ConfigurationCommandPolicy } from '../../source/configurations/configuration-command-policy.js';
import { ConfigurationFileFixture } from '../fixtures/configuration-file-fixture.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof FileSystem>();

  return { ...original, open: vi.fn(original.open) };
});

afterEach(async () => {
  try {
    for (const result of vi.mocked(FileSystem.open).mock.results) {
      if (result.type === 'return') {
        const file = await result.value;

        try {
          expect(file.fd).toBe(-1);
        } finally {
          await file.close();
        }
      }
    }
  } finally {
    vi.clearAllMocks();
  }
});

describe('bounded local configuration input', () => {
  it('parses valid UTF-8 JSON and closes the actual file descriptor', async () => {
    await using fixture = await ConfigurationFileFixture.create();
    const path = await fixture.write('{"title":"Funnel → result","version":1}');

    await expect(ConfigurationFile.read(path)).resolves.toEqual({
      title: 'Funnel → result',
      version: 1,
    });
  });

  it('accepts a JSON file exactly at the byte limit', async () => {
    await using fixture = await ConfigurationFileFixture.create();
    const path = await fixture.write('{}'.padEnd(ConfigurationCommandPolicy.MaximumFileBytes, ' '));

    await expect(ConfigurationFile.read(path)).resolves.toEqual({});
  });

  it('rejects a file one byte beyond the limit and closes its descriptor', async () => {
    await using fixture = await ConfigurationFileFixture.create();
    const path = await fixture.write(
      '{}'.padEnd(ConfigurationCommandPolicy.MaximumFileBytes + 1, ' '),
    );

    await expect(ConfigurationFile.read(path)).rejects.toThrow(
      'Configuration input must be a regular file within the document size limit.',
    );
  });

  it('detects file growth after stat instead of importing a truncated prefix', async () => {
    await using fixture = await ConfigurationFileFixture.create();
    const path = await fixture.write('{}'.padEnd(ConfigurationCommandPolicy.MaximumFileBytes, ' '));
    const original = await vi.importActual<typeof FileSystem>('node:fs/promises');
    vi.mocked(FileSystem.open).mockImplementationOnce(async (...parameters) => {
      const file = await original.open(...parameters);
      fixture.growBeforeStreaming(file, path);

      return file;
    });

    await expect(ConfigurationFile.read(path)).rejects.toThrow(
      'Configuration input must be a regular file within the document size limit.',
    );
  });

  it('rejects malformed JSON without exposing the contents or leaking its descriptor', async () => {
    await using fixture = await ConfigurationFileFixture.create();
    const path = await fixture.write('{"private":"secret",');

    await expect(ConfigurationFile.read(path)).rejects.toThrow(
      'Configuration input must contain valid JSON.',
    );
  });

  it('rejects a directory and closes its descriptor', async () => {
    await using fixture = await ConfigurationFileFixture.create();

    await expect(ConfigurationFile.read(fixture.directory)).rejects.toThrow(
      'Configuration input must be a regular file within the document size limit.',
    );
  });
});
