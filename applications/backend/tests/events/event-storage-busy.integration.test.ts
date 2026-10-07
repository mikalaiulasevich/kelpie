import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { EventBatchFixture } from '../fixtures/event-batch-fixture.js';
import { DatabaseWriterLock } from '../fixtures/database-writer-lock.js';
import { DatabaseErrors } from '../../source/database/database-errors.js';
import { DatabaseErrorFixture } from '../fixtures/database-error-fixture.js';
import { EventIngestionService } from '../../source/events/event-ingestion.service.js';
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

  it('contains a throwing database code accessor at the public error boundary', async () => {
    const error = DatabaseErrorFixture.withCode(() => {
      throw new Error('Code getter failed.');
    });
    vi.spyOn(backend.getService(EventIngestionService), 'ingest').mockRejectedValue(error);
    const response = await EventBatchFixture.post(backend, new SessionBrowserFixture(backend), []);
    expect(response.status).toBe(500);
    expect(response.headers.get('retry-after')).toBeNull();
    expect(await response.json()).toEqual({
      statusCode: 500,
      code: 'internal_error',
      message: 'An internal error occurred.',
      requestIdentifier: expect.any(String),
    });
  });

  it('classifies a changing database code once for both status and retry header', async () => {
    const readCode = vi.fn<() => string>().mockReturnValueOnce('P1008').mockReturnValue('P2002');
    const error = DatabaseErrorFixture.withCode(readCode);
    const classify = vi.spyOn(DatabaseErrors, 'isUnavailable');
    vi.spyOn(backend.getService(EventIngestionService), 'ingest').mockRejectedValue(error);
    const response = await EventBatchFixture.post(backend, new SessionBrowserFixture(backend), []);
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('1');
    expect(classify).toHaveBeenCalledExactlyOnceWith(error);
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
