import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { EventAcceptanceFixture } from '../fixtures/event-acceptance.js';
import { AdministrationFixture } from '../fixtures/administration.js';

describe('separate public quiz origin', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create({ QUIZ_ORIGIN: 'https://quiz.example' });
    await SessionFlowFixture.prepare(backend);
  });

  afterEach(async () => {
    await backend?.close();
  });

  it('accepts quiz session creation, transitions and observation delivery without granting administration access', async () => {
    const browser = new SessionBrowserFixture(backend);
    await browser.current();
    const headers = {
      ...SessionFlowFixture.Headers,
      cookie: browser.cookie,
      origin: 'https://quiz.example',
    };
    const creation = await backend.request('/api/sessions', {
      method: 'POST',
      headers,
      body: JSON.stringify(SessionFlowFixture.creation()),
    });
    const state = await SessionFlowFixture.state(creation);
    const event = EventAcceptanceFixture.view(state);
    const observations = await backend.request('/api/events/batches', {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: [event] }),
    });
    expect(observations.status).toBe(200);
    expect(
      await backend.database.event.count({
        where: { identifier: event.event_id, source: 'client' },
      }),
    ).toBe(1);
    const continuation = await backend.request('/api/sessions/current/continue', {
      method: 'POST',
      headers,
      body: JSON.stringify(SessionFlowFixture.command(state)),
    });
    expect(continuation.status).toBe(200);
    const administrator = await backend.request('/api/administration/sign-in', {
      method: 'POST',
      headers: { ...AdministrationFixture.Headers, origin: 'https://quiz.example' },
      body: JSON.stringify(AdministrationFixture.Credentials),
    });
    expect(administrator.status).toBe(403);
  });

  it('still rejects foreign origins and missing CSRF headers for sessions and observations', async () => {
    const browser = new SessionBrowserFixture(backend);
    const state = await browser.create();
    const headers = {
      ...SessionFlowFixture.Headers,
      cookie: browser.cookie,
      origin: 'https://quiz.example.attacker.test',
    };
    const continuation = await backend.request('/api/sessions/current/continue', {
      method: 'POST',
      headers,
      body: JSON.stringify(SessionFlowFixture.command(state)),
    });
    expect(continuation.status).toBe(403);
    const observations = await backend.request('/api/events/batches', {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: [EventAcceptanceFixture.view(state)] }),
    });
    expect(observations.status).toBe(403);
    const missingHeader = await backend.request('/api/sessions/current/continue', {
      method: 'POST',
      headers: {
        origin: 'https://quiz.example',
        cookie: browser.cookie,
        'content-type': 'application/json',
      },
      body: JSON.stringify(SessionFlowFixture.command(state)),
    });
    expect(missingHeader.status).toBe(403);
    expect(await backend.database.event.count({ where: { source: 'client' } })).toBe(0);
  });
});
