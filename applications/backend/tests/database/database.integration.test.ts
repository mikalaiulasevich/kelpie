import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { DatabaseRecords } from '../fixtures/database-records.js';

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
    const database = backend.database;
    expect(await database.$queryRawUnsafe('PRAGMA journal_mode')).toEqual([
      { journal_mode: 'wal' },
    ]);
    expect(await database.$queryRawUnsafe('PRAGMA busy_timeout')).toEqual([{ timeout: 5000n }]);
    expect(await database.$queryRawUnsafe('PRAGMA foreign_keys')).toEqual([{ foreign_keys: 1n }]);
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
