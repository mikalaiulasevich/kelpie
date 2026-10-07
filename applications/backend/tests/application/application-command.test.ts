import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationCommand } from '../../source/application/application-command.js';
import { ConfigurationCommandMessages } from '../../source/configurations/configuration-command-messages.js';
import { ConfigurationImportError } from '../../source/configurations/configuration-import-error.js';
import { ConfigurationImportService } from '../../source/configurations/configuration-import.service.js';
import { DatabaseService } from '../../source/database/database.service.js';
import { ApplicationCommandFixture } from '../fixtures/application-command.js';

describe('application command lifecycle', () => {
  let fixture: Awaited<ReturnType<typeof ApplicationCommandFixture.create>>;

  beforeEach(async () => {
    fixture = await ApplicationCommandFixture.create();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fixture?.backend.close();
  });

  it('returns the operation result only after application shutdown finishes', async () => {
    const shutdown = vi.spyOn(fixture.application.get(DatabaseService), 'onApplicationShutdown');
    const result = { imported: true };

    await expect(
      ApplicationCommand.run(fixture.application, async () => result, ConfigurationCommandMessages),
    ).resolves.toBe(result);
    expect(shutdown).toHaveBeenCalledOnce();
    await expect(fixture.backend.request('/api/health/live')).rejects.toThrow();
  });

  it('closes the real application after configuration validation rejects', async () => {
    const close = vi.spyOn(fixture.application, 'close');
    const service = fixture.application.get(ConfigurationImportService);

    await expect(
      ApplicationCommand.run(
        fixture.application,
        () => service.import({}),
        ConfigurationCommandMessages,
      ),
    ).rejects.toBeInstanceOf(ConfigurationImportError);
    expect(close).toHaveBeenCalledOnce();
    await expect(fixture.backend.request('/api/health/live')).rejects.toThrow();
  });

  it('closes after initialization rejects without executing the operation', async () => {
    const failure = new Error('Initialization failed.');
    vi.spyOn(fixture.application, 'init').mockRejectedValueOnce(failure);
    const close = vi.spyOn(fixture.application, 'close');
    const operation = vi.fn();

    await expect(
      ApplicationCommand.run(fixture.application, operation, ConfigurationCommandMessages),
    ).rejects.toBe(failure);
    expect(operation).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it('closes an unready application and preserves the command-specific message', async () => {
    vi.spyOn(fixture.application.get(DatabaseService), 'checkReadiness').mockResolvedValueOnce(
      false,
    );
    const close = vi.spyOn(fixture.application, 'close');
    const operation = vi.fn();

    await expect(
      ApplicationCommand.run(fixture.application, operation, ConfigurationCommandMessages),
    ).rejects.toThrow('Apply database migrations before importing configurations.');
    expect(operation).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
  });

  it('retains a null operation rejection alongside the cleanup failure', async () => {
    const cleanupFailure = new Error('Cleanup failed.');
    const close = ApplicationCommandFixture.failAfterClose(fixture.application, cleanupFailure);
    const operation = vi.fn().mockRejectedValue(null);

    await expect(
      ApplicationCommand.run(fixture.application, operation, ConfigurationCommandMessages),
    ).rejects.toMatchObject({
      name: 'AggregateError',
      message: 'Configuration import failed and application cleanup also failed.',
      errors: [null, cleanupFailure],
      cause: cleanupFailure,
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it('propagates a lone cleanup failure without retrying close', async () => {
    const cleanupFailure = new Error('Cleanup failed.');
    const close = ApplicationCommandFixture.failAfterClose(fixture.application, cleanupFailure);

    await expect(
      ApplicationCommand.run(
        fixture.application,
        async () => ({ imported: true }),
        ConfigurationCommandMessages,
      ),
    ).rejects.toBe(cleanupFailure);
    expect(close).toHaveBeenCalledOnce();
  });
});
