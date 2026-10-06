import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApplicationFactory } from '../../source/application/create-application.js';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';

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
    const originalClose = BackendApplicationFixture.prototype.close;
    const CleanupFailure = {
      async close(this: BackendApplicationFixture): Promise<void> {
        // Release real temporary resources before simulating the cleanup failure.
        await originalClose.call(this);
        throw cleanupError;
      },
    } as const;
    vi.spyOn(ApplicationFactory, 'create').mockRejectedValue(setupError);
    vi.spyOn(BackendApplicationFixture.prototype, 'close').mockImplementation(CleanupFailure.close);

    await expect(BackendApplicationFixture.create()).rejects.toMatchObject({
      name: 'AggregateError',
      message: 'Backend fixture setup failed and cleanup also failed.',
      errors: [setupError, cleanupError],
      cause: cleanupError,
    });
  });
});
