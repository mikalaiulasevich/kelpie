import { describe, expect, it } from 'vitest';
import {
  StartupPortFixture,
  StartupProcessFixture,
  StartupProcessPolicy,
} from '../fixtures/startup-process.js';

describe('application process lifecycle', () => {
  it('exits after invalid environment input without disclosing its value', async () => {
    const invalidPortSecret = 'secret-environment-marker';
    const application = await StartupProcessFixture.create({
      PORT: invalidPortSecret,
    });

    try {
      const outcome = await application.waitForExit();

      expect(outcome).toEqual({ code: 1, signal: null });
      expect(application.diagnostics).toContain('application_failed');
      expect(application.diagnostics).not.toContain(invalidPortSecret);
      expect(application.diagnostics).not.toContain(application.databaseUrl);
    } finally {
      await application.close();
    }
  });

  it('exits after an occupied port without leaking database paths', async () => {
    const listener = await StartupPortFixture.create();
    let application: Optional<StartupProcessFixture>;

    try {
      application = await StartupProcessFixture.create({ PORT: String(listener.port) });
      const outcome = await application.waitForExit();

      expect(outcome).toEqual({ code: 1, signal: null });
      expect(application.diagnostics).toContain('application_failed');
      expect(application.diagnostics).toContain('EADDRINUSE');
      expect(application.diagnostics).not.toContain(application.databaseUrl);
      expect(application.diagnostics).not.toContain('private-database-marker');
    } finally {
      try {
        await application?.close();
      } finally {
        await listener.close();
      }
    }
  });

  it('shuts down on SIGTERM and releases its listening port', async () => {
    const listener = await StartupPortFixture.create();
    const port = listener.port;
    await listener.close();
    const application = await StartupProcessFixture.create({ PORT: String(port) });

    try {
      await application.waitUntilLive(port);
      application.terminate();
      const outcome = await application.waitForExit();

      expect(outcome).toEqual({ code: null, signal: 'SIGTERM' });
      await expect(
        fetch(`http://127.0.0.1:${port}/api/health/live`, {
          signal: AbortSignal.timeout(StartupProcessPolicy.RequestTimeoutMilliseconds),
        }),
      ).rejects.toThrow();
      expect(application.diagnostics).not.toContain('application_failed');
    } finally {
      await application.close();
    }
  });
});
