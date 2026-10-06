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

      expect(response.status).toBe(expectedStatus);
      expect(await response.json()).toEqual(expectedResponse);
    },
  );

  it('rejects unresolved migration attempts even with a successful initial migration', async () => {
    const database = backend.database;
    await database.$executeRawUnsafe(
      'INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name") VALUES (\'failed-migration\', \'test-checksum\', \'failed_migration\')',
    );
    const response = await backend.request('/api/health/ready');
    expect(response.status).toBe(503);
    expect((await backend.request('/api/health/live')).status).toBe(200);

    await database.$executeRawUnsafe(
      'DELETE FROM "_prisma_migrations" WHERE "id" = ?',
      'failed-migration',
    );
    expect((await backend.request('/api/health/ready')).status).toBe(200);
  });

  it('returns a redacted unavailable response when migration readiness is lost', async () => {
    await backend.database.$executeRawUnsafe('DELETE FROM "_prisma_migrations"');
    const response = await backend.request('/api/health/ready');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      statusCode: 503,
      message: 'Application is not ready.',
    });
  });
});
