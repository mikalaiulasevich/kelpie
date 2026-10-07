import { MigrationFixtures } from '../fixtures/migration-history.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { HealthRequestCases } from '../cases/health-request-cases.js';

describe('Backend foundation with a real SQLite database', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
  });

  afterEach(async () => {
    await backend?.close();
  });

  it('reports liveness and real database readiness with security headers', async () => {
    const liveResponse = await backend.request('/api/health/live');
    expect(liveResponse.status).toBe(200);
    expect(await liveResponse.json()).toEqual({ status: 'healthy' });
    expect(liveResponse.headers.get('x-powered-by')).toBeNull();
    expect(liveResponse.headers.get('x-content-type-options')).toBe('nosniff');
    const readyResponse = await backend.request('/api/health/ready');
    expect(readyResponse.status).toBe(200);
    expect(await readyResponse.json()).toEqual({ status: 'ready' });
  });

  it.each(HealthRequestCases)(
    '$name',
    async ({ body, headers, expectedStatus, expectedResponse }) => {
      const response = await backend.request('/api/health/live', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body,
      });

      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
      expect(response.status).toBe(expectedStatus);
      expect(await response.json()).toEqual({
        ...expectedResponse,
        requestIdentifier: response.headers.get('x-request-id'),
      });
    },
  );

  it('rejects unresolved migration attempts even with a successful initial migration', async () => {
    const database = backend.database;
    await MigrationFixtures.insertFailedAttempt(database);
    const response = await backend.request('/api/health/ready');
    expect(response.status).toBe(503);
    expect((await backend.request('/api/health/live')).status).toBe(200);

    await MigrationFixtures.removeFailedAttempt(database);
    expect((await backend.request('/api/health/ready')).status).toBe(200);
  });

  it('returns a redacted unavailable response when migration readiness is lost', async () => {
    await MigrationFixtures.clearHistory(backend.database);
    const response = await backend.request('/api/health/ready');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      statusCode: 503,
      code: 'unavailable',
      requestIdentifier: response.headers.get('x-request-id'),
      message: 'Application is not ready.',
    });
  });
});
