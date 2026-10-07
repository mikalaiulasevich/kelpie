import { describe, expect, it } from 'vitest';
import { ApplicationStartup } from '../../source/application/application-startup.js';
import { StartupFailureCases } from '../cases/startup-failure-cases.js';
import { StartupFailureFixture } from '../fixtures/startup-failure.js';

describe('Application startup creation failures', () => {
  it.each(StartupFailureCases)(
    'handles $name without announcing startup',
    async ({ error, classification }) => {
      const fixture = StartupFailureFixture.create(error);

      try {
        await expect(ApplicationStartup.start()).resolves.toBeUndefined();

        expect(process.exitCode).toBe(1);
        expect(fixture.creation).toHaveBeenCalledOnce();
        expect(fixture.diagnostics).toHaveBeenCalledExactlyOnceWith({
          event: 'application_failed',
          phase: 'creation',
          error: expect.objectContaining({ classification }),
        });
        expect(JSON.stringify(fixture.diagnostics.mock.calls)).not.toContain(
          'private creation failure',
        );
      } finally {
        fixture.restore();
      }
    },
  );
});
