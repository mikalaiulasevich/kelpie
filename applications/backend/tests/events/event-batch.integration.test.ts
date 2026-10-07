import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { EventBatchCases } from '../cases/event-batch-cases.js';
import { EventAcceptanceFixture } from '../fixtures/event-acceptance.js';

describe('event batches', () => {
  let backend: BackendApplicationFixture;
  let browser: SessionBrowserFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
    await SessionFlowFixture.prepare(backend);
    browser = new SessionBrowserFixture(backend);
  });

  afterEach(async () => {
    await backend?.close();
  });

  it.each(EventBatchCases.InvalidEnvelope)(
    'rejects $name before creating facts',
    async ({ body }) => {
      await browser.create();
      const response = await backend.request('/api/events/batches', {
        method: 'POST',
        headers: { ...SessionFlowFixture.Headers, cookie: browser.cookie },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
      expect(await backend.database.event.count({ where: { source: 'client' } })).toBe(0);
    },
  );

  it('retains positions, isolates malformed elements and replays the original timestamp', async () => {
    const event = EventAcceptanceFixture.view(await browser.create());
    const response = await EventAcceptanceFixture.post(backend, browser, [null, event, event]);
    expect(response.status).toBe(200);
    const stored = await backend.database.event.findUniqueOrThrow({
      where: { identifier: event.event_id },
    });
    expect(await response.json()).toEqual({
      receipts: [
        { position: 0, status: 'rejected', code: 'invalid_event' },
        {
          position: 1,
          event_id: event.event_id,
          status: 'accepted',
          server_timestamp: stored.serverTimestamp.toISOString(),
        },
        {
          position: 2,
          event_id: event.event_id,
          status: 'duplicate',
          server_timestamp: stored.serverTimestamp.toISOString(),
        },
      ],
    });
    const replay = await EventAcceptanceFixture.post(backend, browser, [event]);
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
    expect(await backend.database.event.count({ where: { source: 'client' } })).toBe(1);
    expect(stored.observationRevision).toBe(0);
    expect(stored.properties).not.toHaveProperty('answers');
  });

  it('concurrent identical delivery produces one accepted event and one duplicate receipt', async () => {
    const event = EventAcceptanceFixture.view(await browser.create());
    const responses = await Promise.all([
      EventAcceptanceFixture.post(backend, browser, [event]),
      EventAcceptanceFixture.post(backend, browser, [event]),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const payloads = await Promise.all(responses.map((response) => response.text()));
    expect(payloads.filter((payload) => payload.includes('"accepted"'))).toHaveLength(1);
    expect(payloads.filter((payload) => payload.includes('"duplicate"'))).toHaveLength(1);
    expect(await backend.database.event.count({ where: { identifier: event.event_id } })).toBe(1);
  });

  it('rejects expiration before duplicate lookup and rejects missing CSRF evidence', async () => {
    const state = await browser.create();
    const event = EventAcceptanceFixture.view(state);
    expect((await EventAcceptanceFixture.post(backend, browser, [event])).status).toBe(200);
    await backend.database.session.update({
      where: { identifier: state.sessionIdentifier },
      data: { expiresAt: new Date(0) },
    });
    expect((await EventAcceptanceFixture.post(backend, browser, [event])).status).toBe(401);
    const forbidden = await backend.request('/api/events/batches', {
      method: 'POST',
      headers: { cookie: browser.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ events: [event] }),
    });
    expect(forbidden.status).toBe(403);
    expect(await backend.database.event.count({ where: { identifier: event.event_id } })).toBe(1);
  });
});
