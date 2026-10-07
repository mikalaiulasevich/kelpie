import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { EventBatchFixture } from '../fixtures/event-batch-fixture.js';
import { DatabaseWriterLock } from '../fixtures/database-writer-lock.js';
import { Diagnostics } from '../../source/diagnostics/diagnostics.js';

describe('event storage contention', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
    await SessionFlowFixture.prepare(backend);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await backend?.close();
  });

  it('reports actual writer contention as retryable and accepts the identical retry after release', async () => {
    const browser = new SessionBrowserFixture(backend);
    const event = EventBatchFixture.view(await browser.create());
    const diagnostics = vi.spyOn(Diagnostics, 'write');
    const response = await DatabaseWriterLock.run(backend, () =>
      EventBatchFixture.post(backend, browser, [event]),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('1');
    expect(await response.json()).toEqual({
      statusCode: 503,
      code: 'unavailable',
      message: 'Application is not ready.',
      requestIdentifier: expect.any(String),
    });
    expect(diagnostics).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'request_failed', status: 503 }),
    );
    expect(await backend.database.event.count({ where: { identifier: event.event_id } })).toBe(0);
    expect((await EventBatchFixture.post(backend, browser, [event])).status).toBe(200);
    expect(await backend.database.event.count({ where: { identifier: event.event_id } })).toBe(1);
  });
});
