import { describe, expect, it } from 'vitest';
import { IncompleteRequestFixture } from '../fixtures/incomplete-request.js';
import { StartupPortFixture } from '../fixtures/startup-port.js';
import { StartupProcessFixture } from '../fixtures/startup-process.js';
import { StartupProcessPolicy } from '../fixtures/startup-policy.js';

describe('application process lifecycle', () => {
  it('releases an incomplete request when the backend rejects the connection', async () => {
    const listener = await StartupPortFixture.create();
    const port = listener.port;
    await listener.close();

    await expect(IncompleteRequestFixture.create(port)).rejects.toMatchObject({
      code: 'ECONNREFUSED',
    });
  });

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

  it(
    'bounds SIGTERM drain time when a client never finishes its request body',
    async () => {
      const listener = await StartupPortFixture.create();
      const port = listener.port;
      await listener.close();
      const application = await StartupProcessFixture.create({ PORT: String(port) });
      let request: Optional<IncompleteRequestFixture>;

      try {
        await application.waitUntilLive(port);
        request = await IncompleteRequestFixture.create(port);
        application.terminate();
        const outcome = await application.waitForExit(
          StartupProcessPolicy.SlowRequestExitMilliseconds,
        );
        await request.waitForClose();

        expect(outcome).toEqual({ code: null, signal: 'SIGTERM' });
        expect(application.diagnostics).toContain('shutdown_deadline_exceeded');
        expect(application.diagnostics).not.toContain('application_failed');
      } finally {
        request?.close();
        await application.close();
      }
    },
    StartupProcessPolicy.SlowRequestTestMilliseconds,
  );
});
