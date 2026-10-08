import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFile, stat, writeFile, readdir, rm } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { pathToFileURL } from 'node:url';
import { omit } from 'es-toolkit/object';
import { resolve } from 'node:path';
import type * as FileOperations from 'node:fs/promises';
import { DatabaseBackups } from '../../source/database/database-backups.js';
import { RecoveryFixture, RecoveryCleanup } from '../fixtures/database-recovery.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { PublicationFixtures } from '../fixtures/publication-fixtures.js';
import { ConfigurationImportFixtures } from '../fixtures/configuration-import-fixtures.js';
import { EventAcceptanceFixture } from '../fixtures/event-acceptance.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof FileOperations>();

  return { ...original, rm: vi.fn(original.rm) };
});

afterEach(RecoveryCleanup.run);

describe('database recovery', () => {
  it('restores cookies, pinned versions, command replay, observations and analytics through HTTP', async () => {
    const directory = await RecoveryFixture.directory();
    const source = await RecoveryFixture.backend();
    const publication = await SessionFlowFixture.prepare(source);
    const administratorCookie = await EventAcceptanceFixture.administratorCookie(source);
    const browser = new SessionBrowserFixture(source);
    const initial = await browser.create('B');
    const observation = EventAcceptanceFixture.view(initial);
    expect((await EventAcceptanceFixture.post(source, browser, [observation])).status).toBe(200);
    const command = SessionFlowFixture.command(initial);
    const committed = await SessionFlowFixture.state(
      await browser.post('/current/continue', command),
    );
    const secondVersion = await source.configurationImports.import(
      ConfigurationImportFixtures.original(2),
    );
    await publication.service.publish(
      PublicationFixtures.request('workstyle-planner', secondVersion.version.identifier, 1),
      publication.administrator.identifier,
    );
    const query = {
      from: '2026-10-01T00:00:00Z',
      to: '2026-10-09T00:00:00Z',
      funnelIdentifier: 'workstyle-planner',
      versionIdentifier: publication.firstVersion.identifier,
      trafficOrigin: 'all',
      includeForced: 'true',
    };
    const before = await EventAcceptanceFixture.analytics(source, administratorCookie, query);
    const snapshot = resolve(directory, 'backup.sqlite');
    const report = await DatabaseBackups.create({
      sourcePath: RecoveryFixture.path(source),
      destinationPath: snapshot,
    });
    expect(report.tables.find((table) => table.name === 'ApplicationSecret')?.rows).toBe('1');
    expect((await stat(snapshot)).mode & 0o777).toBe(0o600);
    await source.close();
    RecoveryFixture.forget(source);
    const recovered = resolve(directory, 'recovered.sqlite');
    const restoredReport = await DatabaseBackups.restore({
      sourcePath: snapshot,
      destinationPath: recovered,
    });
    expect(restoredReport.tables).toEqual(report.tables);
    expect(restoredReport.migrations).toEqual(report.migrations);
    const restored = await RecoveryFixture.backend(recovered);
    const returning = new SessionBrowserFixture(restored);
    returning.cookie = browser.cookie;
    expect(await (await returning.current()).json()).toEqual({ state: committed, expired: false });
    expect(committed.variant).toBe('B');
    expect(committed.versionIdentifier).toBe(publication.firstVersion.identifier);
    expect(
      await SessionFlowFixture.state(await returning.post('/current/continue', command)),
    ).toEqual(committed);
    const conflicting = await returning.post('/current/continue', {
      ...command,
      clientTimestamp: '2026-10-08T12:00:00.000Z',
    });
    expect(conflicting.status).toBe(409);
    expect(await conflicting.json()).toMatchObject({ code: 'operation_conflict' });
    const originalEvent = await restored.database.event.findUniqueOrThrow({
      where: { identifier: observation.event_id },
    });
    const eventCount = await restored.database.event.count();
    const duplicate = await EventAcceptanceFixture.post(restored, returning, [observation]);
    expect(await duplicate.json()).toMatchObject({
      receipts: [{ status: 'duplicate', event_id: observation.event_id }],
    });
    expect(await restored.database.event.count()).toBe(eventCount);
    expect(
      await restored.database.event.findUniqueOrThrow({
        where: { identifier: observation.event_id },
      }),
    ).toEqual(originalEvent);
    const conflictingObservation = await EventAcceptanceFixture.post(restored, returning, [
      { ...observation, client_timestamp: '2026-10-08T12:00:00.000Z' },
    ]);
    expect(await conflictingObservation.json()).toMatchObject({
      receipts: [{ status: 'rejected', event_id: observation.event_id }],
    });
    const after = await EventAcceptanceFixture.analytics(restored, administratorCookie, query);
    expect(omit(after, ['generatedAt'])).toEqual(omit(before, ['generatedAt']));
    const fresh = new SessionBrowserFixture(restored);
    expect((await fresh.create()).versionIdentifier).toBe(secondVersion.version.identifier);
  });

  it('restores committed WAL writes while the source connection remains open', async () => {
    const backend = await RecoveryFixture.backend();
    const directory = await RecoveryFixture.directory();
    const source = resolve(directory, 'wal.sqlite');
    await DatabaseBackups.create({
      sourcePath: RecoveryFixture.path(backend),
      destinationPath: source,
    });
    const client = createClient({ url: pathToFileURL(source).href });

    try {
      await client.execute('PRAGMA journal_mode=WAL');
      await client.execute('PRAGMA wal_autocheckpoint=0');
      await client.execute(`INSERT INTO Funnel (identifier, revision) VALUES ('wal-retained', 0)`);
      expect((await stat(`${source}-wal`)).size).toBeGreaterThan(0);
      const destination = resolve(directory, 'wal-restored.sqlite');
      const report = await DatabaseBackups.restore({
        sourcePath: source,
        destinationPath: destination,
      });
      expect(report.tables.find((table) => table.name === 'Funnel')?.rows).toBe('1');
    } finally {
      client.close();
    }
  });

  it('refuses schema drift and removes unpublished temporary files', async () => {
    const backend = await RecoveryFixture.backend();
    const directory = await RecoveryFixture.directory();
    const source = resolve(directory, 'drift.sqlite');
    await DatabaseBackups.create({
      sourcePath: RecoveryFixture.path(backend),
      destinationPath: source,
    });
    const client = createClient({ url: pathToFileURL(source).href });

    try {
      const indexes = await client.execute(
        `SELECT name FROM sqlite_schema WHERE type = 'index' AND sql IS NOT NULL LIMIT 1`,
      );
      const name = String(indexes.rows[0]?.name).replaceAll('"', '""');
      await client.execute(`DROP INDEX "${name}"`);
    } finally {
      client.close();
    }

    await expect(
      DatabaseBackups.restore({
        sourcePath: source,
        destinationPath: resolve(directory, 'rejected.sqlite'),
      }),
    ).rejects.toThrow('validation');
    expect(await readdir(directory)).toEqual(['drift.sqlite']);
  });

  it('rejects a tampered migration ledger', async () => {
    const backend = await RecoveryFixture.backend();
    const directory = await RecoveryFixture.directory();
    await backend.database.$executeRawUnsafe(`UPDATE _prisma_migrations SET checksum = 'changed'`);
    await expect(
      DatabaseBackups.create({
        sourcePath: RecoveryFixture.path(backend),
        destinationPath: resolve(directory, 'rejected.sqlite'),
      }),
    ).rejects.toThrow('validation');
    expect(await readdir(directory)).toEqual([]);
  });

  it('rejects orphaned records even when the SQLite integrity check succeeds', async () => {
    const backend = await RecoveryFixture.backend();
    const directory = await RecoveryFixture.directory();
    const source = resolve(directory, 'orphan.sqlite');
    await DatabaseBackups.create({
      sourcePath: RecoveryFixture.path(backend),
      destinationPath: source,
    });
    const client = createClient({ url: pathToFileURL(source).href });

    try {
      await client.execute('PRAGMA foreign_keys=OFF');
      await client.execute(
        `INSERT INTO Funnel (identifier, activeVersionIdentifier, revision) VALUES ('orphan', 'missing-version', 0)`,
      );
      expect((await client.execute('PRAGMA integrity_check')).rows[0]?.[0]).toBe('ok');
    } finally {
      client.close();
    }

    await expect(
      DatabaseBackups.restore({
        sourcePath: source,
        destinationPath: resolve(directory, 'rejected.sqlite'),
      }),
    ).rejects.toThrow('validation');
    expect(await readdir(directory)).toEqual(['orphan.sqlite']);
  });

  it('preserves the validation error when temporary cleanup also fails', async () => {
    const directory = await RecoveryFixture.directory();
    const source = resolve(directory, 'corrupt.sqlite');
    await writeFile(source, 'invalid');
    const cleanupError = new Error('injected cleanup failure');
    vi.mocked(rm).mockRejectedValueOnce(cleanupError);
    const failure = await DatabaseBackups.restore({
      sourcePath: source,
      destinationPath: resolve(directory, 'rejected.sqlite'),
    }).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(AggregateError);

    if (!(failure instanceof AggregateError)) {
      throw new Error('Expected both recovery failures.');
    }

    expect(failure.errors).toHaveLength(2);
    expect(failure.errors[1]).toBe(cleanupError);
    await expect(stat(resolve(directory, 'rejected.sqlite'))).rejects.toThrow();
  });

  it('reports cleanup failure after publication without deleting the valid backup', async () => {
    const backend = await RecoveryFixture.backend();
    const directory = await RecoveryFixture.directory();
    const destination = resolve(directory, 'published.sqlite');
    vi.mocked(rm).mockRejectedValueOnce(new Error('injected cleanup failure'));
    await expect(
      DatabaseBackups.create({
        sourcePath: RecoveryFixture.path(backend),
        destinationPath: destination,
      }),
    ).rejects.toThrow('snapshot was published');
    expect((await DatabaseBackups.validate(destination)).tables).toHaveLength(14);
  });

  it('rejects existing destinations without altering their bytes', async () => {
    const backend = await RecoveryFixture.backend();
    const directory = await RecoveryFixture.directory();
    const destination = resolve(directory, 'existing.sqlite');
    await writeFile(destination, 'retain-me');
    await expect(
      DatabaseBackups.create({
        sourcePath: RecoveryFixture.path(backend),
        destinationPath: destination,
      }),
    ).rejects.toThrow('already exists');
    expect(await readFile(destination, 'utf8')).toBe('retain-me');
    await expect(
      DatabaseBackups.create({
        sourcePath: RecoveryFixture.path(backend),
        destinationPath: RecoveryFixture.path(backend),
      }),
    ).rejects.toThrow('already exists');
  });

  it('rejects corrupt and missing sources before publishing a destination', async () => {
    const directory = await RecoveryFixture.directory();
    const source = resolve(directory, 'corrupt.sqlite');
    const destination = resolve(directory, 'recovered.sqlite');
    await writeFile(source, 'invalid');
    await expect(
      DatabaseBackups.restore({ sourcePath: source, destinationPath: destination }),
    ).rejects.toThrow();
    await expect(stat(destination)).rejects.toThrow();
    await expect(
      DatabaseBackups.create({
        sourcePath: resolve(directory, 'missing.sqlite'),
        destinationPath: destination,
      }),
    ).rejects.toThrow();
  });
});
