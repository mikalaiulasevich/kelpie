import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Diagnostics, RequestContext } from '../../source/diagnostics/diagnostics.js';
import { RequestFailureFixture } from '../fixtures/request-failure.js';
import { DatabaseService } from '../../source/database/database.service.js';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';

describe('Request diagnostics and privacy', () => {
  let backend: BackendApplicationFixture;
  let records: ReadonlyDictionary<string, unknown>[];

  beforeEach(async () => {
    records = [];
    vi.spyOn(Diagnostics, 'write').mockImplementation((record) => {
      records.push({ ...RequestContext.getStore(), ...record });
    });
    backend = await BackendApplicationFixture.create();
    records.length = 0;
  });

  afterEach(async () => {
    try {
      await backend?.close();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('isolates concurrent requests and never trusts client correlation identifiers', async () => {
    const responses = await Promise.all([
      backend.request('/api/health/live?token=private-query', {
        headers: { 'x-request-id': 'private-client-identifier', cookie: 'private-cookie' },
      }),
      backend.request('/api/health/ready'),
    ]);
    const identifiers = responses.map((response) => response.headers.get('x-request-id'));

    expect(new Set(identifiers).size).toBe(2);
    for (const identifier of identifiers) {
      expect(identifier).toMatch(/^[0-9a-f-]{36}$/);
      expect(records.filter((record) => record.requestIdentifier === identifier)).toEqual([
        expect.objectContaining({ event: 'request_completed', status: 200, method: 'GET' }),
      ]);
    }

    expect(JSON.stringify(records)).not.toContain('private-');
  });

  it('correlates JSON parser errors without logging payloads or unmatched paths', async () => {
    const response = await backend.request('/private-path?token=private-query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"secret":"private-answer",',
    });

    expect(response.status).toBe(400);
    expect(records).toEqual([
      expect.objectContaining({
        event: 'request_completed',
        requestIdentifier: response.headers.get('x-request-id'),
        route: 'unmatched',
        status: 400,
      }),
    ]);
    expect(JSON.stringify(records)).not.toContain('private-');
  });

  it('does not trust status properties on an unrecognized application error', async () => {
    await backend.close();
    RequestFailureFixture.unrecognizedApplicationError();
    backend = await BackendApplicationFixture.create();
    records.length = 0;

    const response = await backend.request('/api/health/live');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      statusCode: 500,
      code: 'internal_error',
      requestIdentifier: response.headers.get('x-request-id'),
      message: 'An internal error occurred.',
    });
    expect(JSON.stringify(records)).not.toContain('private failure');
    expect(JSON.stringify(records)).not.toContain('PRIVATE_UNRECOGNIZED_CODE');
  });

  it('records a safe database failure reason and recovers without restarting', async () => {
    const failure = Object.assign(new Error('private-database-path and private-answer'), {
      code: 'SQLITE_BUSY',
    });
    vi.spyOn(DatabaseService.prototype, 'checkReadiness').mockRejectedValueOnce(failure);
    const response = await backend.request('/api/health/ready');

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      statusCode: 503,
      code: 'unavailable',
      requestIdentifier: response.headers.get('x-request-id'),
      message: 'Application is not ready.',
    });
    expect(records).toContainEqual(
      expect.objectContaining({
        event: 'readiness_failed',
        requestIdentifier: response.headers.get('x-request-id'),
        reason: 'database_query_failed',
        error: expect.objectContaining({ code: 'SQLITE_BUSY' }),
      }),
    );
    expect(JSON.stringify(records)).not.toContain('private-');
    expect((await backend.request('/api/health/ready')).status).toBe(200);
  });
});
