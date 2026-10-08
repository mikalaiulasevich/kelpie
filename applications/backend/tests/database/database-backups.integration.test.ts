import { afterEach, describe, expect, it } from 'vitest';
import { readFile, stat, writeFile, readdir } from 'node:fs/promises';
import { createClient } from '@libsql/client';
import { pathToFileURL } from 'node:url';
import { omit } from 'es-toolkit/object';
import { resolve } from 'node:path';
import { DatabaseBackups } from '../../source/database/database-backups.js';
import { RecoveryFixture, RecoveryCleanup } from '../fixtures/database-recovery.js';
import { SessionBrowserFixture, SessionFlowFixture } from '../fixtures/session-flow.js';
import { PublicationFixtures } from '../fixtures/publication-fixtures.js';
import { ConfigurationImportFixtures } from '../fixtures/configuration-import-fixtures.js';
import { EventAcceptanceFixture } from '../fixtures/event-acceptance.js';

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
    const eventCount = await restored.database.event.count();
    const duplicate = await EventAcceptanceFixture.post(restored, returning, [observation]);
    expect(await duplicate.json()).toMatchObject({
      receipts: [{ status: 'duplicate', event_id: observation.event_id }],
    });
    expect(await restored.database.event.count()).toBe(eventCount);
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
