import 'reflect-metadata';
import { mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Server } from 'node:http';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applicationDirectory } from '../source/application-directory.js';
import { createApplication } from '../source/create-application.js';
import { DatabaseService } from '../source/database/database.service.js';

const executeFile = promisify(execFile);

describe('Backend foundation with a real SQLite database', () => {
  let application: NestExpressApplication;
  let temporaryDirectory: string;
  let baseUrl: string;
  const originalDatabaseUrl = process.env['DATABASE_URL'];
  const originalMode = process.env['NODE_ENV'];

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(resolve(tmpdir(), 'kelpie-backend-'));
    const databasePath = resolve(temporaryDirectory, 'integration.sqlite');
    await executeFile('npm', ['run', 'database:migrate'], {
      cwd: applicationDirectory,
      env: { ...process.env, DATABASE_URL: `file:${databasePath}`, NODE_ENV: 'test' },
      timeout: 15_000,
    });
    process.env['DATABASE_URL'] = `file:${databasePath}`;
    process.env['NODE_ENV'] = 'test';
    application = await createApplication();
    await application.listen(0, '127.0.0.1');
    const server: unknown = application.getHttpServer();
    if (!(server instanceof Server)) throw new Error('Test HTTP server adapter is unsupported.');
    const address = server.address();
    if (address === null || typeof address === 'string')
      throw new Error('Test server has no network address.');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await application?.close();
    if (temporaryDirectory !== undefined)
      await rm(temporaryDirectory, { recursive: true, force: true });
    if (originalDatabaseUrl === undefined) delete process.env['DATABASE_URL'];
    else process.env['DATABASE_URL'] = originalDatabaseUrl;
    if (originalMode === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = originalMode;
  });

  it('reports liveness and real database readiness with security headers', async () => {
    const liveResponse = await fetch(`${baseUrl}/api/health/live`);
    expect(liveResponse.status).toBe(200);
    expect(await liveResponse.json()).toEqual({ status: 'healthy' });
    expect(liveResponse.headers.get('x-powered-by')).toBeNull();
    expect(liveResponse.headers.get('x-content-type-options')).toBe('nosniff');
    const readyResponse = await fetch(`${baseUrl}/api/health/ready`);
    expect(readyResponse.status).toBe(200);
    expect(await readyResponse.json()).toEqual({ status: 'ready' });
  });

  it('rejects oversized bodies without echoing input', async () => {
    const response = await fetch(`${baseUrl}/api/health/live`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: 'x'.repeat(270_000) }),
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      statusCode: 413,
      message: 'Request body is too large.',
    });
  });

  it('enforces journal, bounded busy timeout, and foreign keys', async () => {
    const database = application.get(DatabaseService).client;
    expect(await database.$queryRawUnsafe('PRAGMA journal_mode')).toEqual([
      { journal_mode: 'wal' },
    ]);
    expect(await database.$queryRawUnsafe('PRAGMA busy_timeout')).toEqual([{ timeout: 5000n }]);
    expect(await database.$queryRawUnsafe('PRAGMA foreign_keys')).toEqual([{ foreign_keys: 1n }]);
  });

  it('rejects duplicate event identifiers and preserves historical version references', async () => {
    const database = application.get(DatabaseService).client;
    await database.funnel.create({ data: { identifier: 'test-funnel' } });
    const version = await database.funnelVersion.create({
      data: {
        funnelIdentifier: 'test-funnel',
        version: 1,
        schemaVersion: '1.0',
        document: {},
        checksum: 'test-checksum',
      },
    });
    const session = await database.session.create({
      data: {
        versionIdentifier: version.identifier,
        experimentIdentifier: 'test-experiment',
        variant: 'A',
        assignmentSource: 'random',
        trafficOrigin: 'synthetic',
        acquisitionParameters: {},
        currentStepIdentifier: 'welcome',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const eventData = {
      identifier: 'test-event',
      contentFingerprint: 'test-fingerprint',
      sessionIdentifier: session.identifier,
      name: 'session_started',
      source: 'server',
      clientTimestamp: new Date(),
      properties: {},
    };
    await database.event.create({ data: eventData });
    await expect(database.event.create({ data: eventData })).rejects.toMatchObject({
      code: 'P2002',
    });
    expect(await database.event.count()).toBe(1);
    await expect(
      database.funnelVersion.delete({ where: { identifier: version.identifier } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects unresolved migration attempts even with a successful initial migration', async () => {
    const database = application.get(DatabaseService).client;
    await database.$executeRawUnsafe(
      'INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name") VALUES (\'failed-migration\', \'test-checksum\', \'failed_migration\')',
    );
    const response = await fetch(`${baseUrl}/api/health/ready`);
    expect(response.status).toBe(503);
    await database.$executeRawUnsafe(
      'DELETE FROM "_prisma_migrations" WHERE "migration_name" = \'failed_migration\'',
    );
  });

  it('returns a redacted unavailable response when migration readiness is lost', async () => {
    await application
      .get(DatabaseService)
      .client.$executeRawUnsafe('DELETE FROM "_prisma_migrations"');
    const response = await fetch(`${baseUrl}/api/health/ready`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      statusCode: 503,
      message: 'Application is not ready.',
    });
  });
});
