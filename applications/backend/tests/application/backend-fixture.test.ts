import * as FileSystem from 'node:fs/promises';
import { BackendCleanupFailure } from '../fixtures/backend-cleanup-failure.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationFactory } from '../../source/application/create-application.js';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';

vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof FileSystem>()),
  rm: vi.fn((...parameters: Parameters<typeof FileSystem.rm>) =>
    importOriginal<typeof FileSystem>().then((fileSystem) => fileSystem.rm(...parameters)),
  ),
}));

describe('Backend fixture setup failures', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('releases resources and preserves the original setup failure', async () => {
    const setupError = new Error('Application creation failed.');
    vi.spyOn(ApplicationFactory, 'create').mockRejectedValue(setupError);
    const close = vi.spyOn(BackendApplicationFixture.prototype, 'close');

    await expect(BackendApplicationFixture.create()).rejects.toBe(setupError);
    expect(close).toHaveBeenCalledOnce();
  });

  it('retains setup and cleanup failures together', async () => {
    const setupError = new Error('Application creation failed.');
    const cleanupError = new Error('Cleanup failed.');
    vi.spyOn(ApplicationFactory, 'create').mockRejectedValue(setupError);
    BackendCleanupFailure.application(cleanupError);

    await expect(BackendApplicationFixture.create()).rejects.toMatchObject({
      name: 'AggregateError',
      message: 'Backend fixture setup failed and cleanup also failed.',
      errors: [setupError, cleanupError],
      cause: cleanupError,
    });
  });
});

describe('Backend fixture cleanup failures', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retains both application and directory failures and permits repeated close', async () => {
    const backend = await BackendApplicationFixture.create();
    const applicationError = new Error('Application close failed.');
    const directoryError = new Error('Directory cleanup failed.');
    BackendCleanupFailure.server(applicationError);
    vi.mocked(FileSystem.rm).mockRejectedValueOnce(directoryError);

    try {
      await expect(backend.close()).rejects.toMatchObject({
        name: 'AggregateError',
        message: 'Backend application close failed and directory cleanup also failed.',
        errors: [applicationError, directoryError],
        cause: directoryError,
      });
      expect(() => backend.getApplication()).toThrow('The backend fixture is closed.');
      await expect(backend.request('/api/health/live')).rejects.toThrow(
        'The backend fixture is closed.',
      );
    } finally {
      await backend.close();
    }
  });
});
