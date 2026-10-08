import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { LostResponseProxy } from '../fixtures/lost-response-proxy.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { EventAcceptanceFixture } from '../fixtures/event-acceptance.js';

describe('committed HTTP requests with lost downstream responses', () => {
  let backend: BackendApplicationFixture;
  let proxy: LostResponseProxy;
  let browser: SessionBrowserFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
    await SessionFlowFixture.prepare(backend);
    browser = new SessionBrowserFixture(backend);
    proxy = await LostResponseProxy.create(backend);
  });

  afterEach(async () => {
    const cleanup = await Promise.allSettled([proxy?.close(), backend?.close()]);
    const failures = cleanup.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    );
    expect(failures).toEqual([]);
  });

  it('retries the exact answer after losing its acknowledgement without repeating durable facts', async () => {
    const numeric = await browser.continue(await browser.create());
    const command = { ...SessionFlowFixture.command(numeric), answer: 10 };
    const path = '/api/sessions/current/answers';
    const options = {
      method: 'POST',
      headers: { ...SessionFlowFixture.Headers, cookie: browser.cookie },
      body: JSON.stringify(command),
    };
    proxy.dropNextResponse(path);

    await expect(proxy.request(path, options)).rejects.toThrow();
    const committed = proxy.readCommittedBody();
    expect(await (await browser.current()).json()).toEqual({ state: committed, expired: false });

    const replay = await SessionFlowFixture.state(await proxy.request(path, options));
    expect(replay).toEqual(committed);
    expect(replay.revision).toBe(numeric.revision + 1);
    const conflict = await proxy.request(path, {
      ...options,
      body: JSON.stringify({ ...command, answer: 25 }),
    });
    expect(conflict.status).toBe(409);
    expect(
      await backend.database.sessionOperation.count({
        where: {
          sessionIdentifier: numeric.sessionIdentifier,
          operationIdentifier: command.operationIdentifier,
        },
      }),
    ).toBe(1);
    expect(
      await backend.database.sessionTransition.count({
        where: {
          sessionIdentifier: numeric.sessionIdentifier,
          operationIdentifier: command.operationIdentifier,
        },
      }),
    ).toBe(1);
    expect(
      await backend.database.sessionAnswer.findMany({
        where: {
          sessionIdentifier: numeric.sessionIdentifier,
          stepIdentifier: numeric.currentStepIdentifier,
        },
        select: { value: true, confirmationRevision: true },
      }),
    ).toEqual([{ value: 10, confirmationRevision: replay.revision }]);
    expect(
      await backend.database.event.count({
        where: {
          sessionIdentifier: numeric.sessionIdentifier,
          stepIdentifier: numeric.currentStepIdentifier,
          name: 'answer_submitted',
          source: 'server',
        },
      }),
    ).toBe(1);
    expect(
      await backend.database.event.count({
        where: {
          sessionIdentifier: numeric.sessionIdentifier,
          stepIdentifier: numeric.currentStepIdentifier,
          name: 'step_completed',
          source: 'server',
        },
      }),
    ).toBe(1);
    expect(await (await browser.current()).json()).toEqual({ state: committed, expired: false });
  });

  it('retries an event batch after losing its acknowledgement with original timestamps and unchanged analytics', async () => {
    const initial = await browser.create();
    const event = EventAcceptanceFixture.view(initial);
    const administratorCookie = await EventAcceptanceFixture.administratorCookie(backend);
    const query = {
      funnelIdentifier: initial.funnelIdentifier,
      versionIdentifier: initial.versionIdentifier,
      includeForced: 'true',
    };
    const path = '/api/events/batches';
    const options = {
      method: 'POST',
      headers: { ...SessionFlowFixture.Headers, cookie: browser.cookie },
      body: JSON.stringify({ events: [event] }),
    };
    proxy.dropNextResponse(path);

    await expect(proxy.request(path, options)).rejects.toThrow();
    const stored = await backend.database.event.findUniqueOrThrow({
      where: { identifier: event.event_id },
    });
    expect(proxy.readCommittedBody()).toEqual({
      receipts: [
        {
          position: 0,
          event_id: event.event_id,
          status: 'accepted',
          server_timestamp: stored.serverTimestamp.toISOString(),
        },
      ],
    });
    const analyticsBefore = await EventAcceptanceFixture.analytics(
      backend,
      administratorCookie,
      query,
    );
    const replay = await proxy.request(path, options);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual({
      receipts: [
        {
          position: 0,
          event_id: event.event_id,
          status: 'duplicate',
          server_timestamp: stored.serverTimestamp.toISOString(),
        },
      ],
    });
    expect(
      await backend.database.event.findUniqueOrThrow({ where: { identifier: event.event_id } }),
    ).toEqual(stored);
    expect(await backend.database.event.count({ where: { identifier: event.event_id } })).toBe(1);
    const analyticsAfter = await EventAcceptanceFixture.analytics(
      backend,
      administratorCookie,
      query,
    );
    expect(analyticsAfter.versions).toEqual(analyticsBefore.versions);
    expect(analyticsAfter.insights?.acquisition).toEqual(analyticsBefore.insights?.acquisition);
    expect(analyticsAfter.insights?.trend).toEqual(analyticsBefore.insights?.trend);
    expect(
      analyticsBefore.versions[0]?.variants.find((variant) => variant.variant === initial.variant)
        ?.started,
    ).toBe(1);
  });
});
