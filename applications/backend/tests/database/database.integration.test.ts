import { isUndefined } from 'es-toolkit/predicate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { DatabaseRecords } from '../fixtures/database-records.js';
import { DatabaseConnectionFixture } from '../fixtures/database-connection.js';
import { DatabaseAdapters } from '../../source/database/database-adapters.js';

describe('SQLite persistence invariants', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
  });

  afterEach(async () => {
    await backend?.close();
  });

  it('isolates concurrent application instances and closes resources repeatedly', async () => {
    const otherBackend = await BackendApplicationFixture.create();

    try {
      await DatabaseRecords.createSession(backend.database);
      expect(await backend.database.session.count()).toBe(1);
      expect(await otherBackend.database.session.count()).toBe(0);
      expect((await otherBackend.request('/api/health/ready')).status).toBe(200);
    } finally {
      await otherBackend.close();
      await otherBackend.close();
    }

    await expect(otherBackend.request('/api/health/ready')).rejects.toThrow(
      'The backend fixture is closed.',
    );
    expect(() => otherBackend.database).toThrow('The backend fixture is closed.');
    expect((await backend.request('/api/health/ready')).status).toBe(200);
  });

  it('enforces journal, bounded busy timeout, and foreign keys', async () => {
    expect(await DatabaseConnectionFixture.settings(backend.database)).toEqual({
      timeout: [5000],
      foreignKeys: [1],
      journal: [{ journal_mode: 'wal' }],
    });
  });

  it('selects the driver for the actual executing runtime', () => {
    const adapter = DatabaseAdapters.create('file:unused-adapter-selection.sqlite');
    const expected = isUndefined(process.versions.bun)
      ? '@prisma/adapter-better-sqlite3'
      : '@prisma/adapter-libsql';

    expect(adapter.adapterName).toBe(expected);
  });

  it('preserves connection settings and persisted timestamps across successive transactions', async () => {
    const database = backend.database;
    const createdAt = new Date('2026-10-07T11:00:00.123Z');

    await database.applicationSecret.create({
      data: { identifier: 'driver-roundtrip', value: 'synthetic', createdAt },
    });

    for (const iteration of [0, 1, 2]) {
      const observed = await database.$transaction(async (transaction) => ({
        settings: await DatabaseConnectionFixture.settings(transaction),
        stored: await transaction.applicationSecret.findUniqueOrThrow({
          where: { identifier: 'driver-roundtrip' },
        }),
      }));

      expect(observed.settings, `transaction ${iteration}`).toEqual({
        timeout: [5000],
        foreignKeys: [1],
        journal: [{ journal_mode: 'wal' }],
      });
      expect(observed.stored.createdAt).toEqual(createdAt);
      expect(await DatabaseConnectionFixture.settings(database)).toEqual(observed.settings);
    }

    expect(
      await database.$queryRawUnsafe(
        `SELECT typeof("createdAt") AS "storage", CAST("createdAt" AS TEXT) AS "timestamp"
         FROM "ApplicationSecret" WHERE "identifier" = 'driver-roundtrip'`,
      ),
    ).toEqual([{ storage: 'text', timestamp: '2026-10-07T11:00:00.123+00:00' }]);
  });

  it('scopes operation identifiers to their session while rejecting retries as new rows', async () => {
    const database = backend.database;
    const { session, otherSession } = await DatabaseRecords.createOperationOwners(database);
    const operation = DatabaseRecords.operation(session.identifier);
    await database.sessionOperation.create({ data: operation });
    await database.sessionOperation.create({
      data: DatabaseRecords.operation(otherSession.identifier),
    });

    await expect(database.sessionOperation.create({ data: operation })).rejects.toMatchObject({
      code: 'P2002',
    });
    expect(await database.sessionOperation.count()).toBe(2);
    expect(
      await database.sessionOperation.findUnique({
        where: {
          sessionIdentifier_operationIdentifier: {
            sessionIdentifier: session.identifier,
            operationIdentifier: operation.operationIdentifier,
          },
        },
      }),
    ).toMatchObject(operation);
  });

  it('rejects duplicate event identifiers and preserves historical version references', async () => {
    const database = backend.database;
    const { version, eventData } = await DatabaseRecords.createSession(database);
    await database.event.create({ data: eventData });
    await expect(database.event.create({ data: eventData })).rejects.toMatchObject({
      code: 'P2002',
    });
    expect(await database.event.count()).toBe(1);
    await expect(
      database.funnelVersion.delete({ where: { identifier: version.identifier } }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
