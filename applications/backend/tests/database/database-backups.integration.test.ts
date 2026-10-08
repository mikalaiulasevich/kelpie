import { afterEach, describe, expect, it } from 'vitest';
import { readFile, stat, writeFile } from 'node:fs/promises';
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
      funnelIdentifier: 'workstyle-planner',
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
    expect(restoredReport.sha256).toBe(report.sha256);
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
    expect(await EventAcceptanceFixture.analytics(restored, administratorCookie, query)).toEqual(
      before,
    );
    const fresh = new SessionBrowserFixture(restored);
    expect((await fresh.create()).versionIdentifier).toBe(secondVersion.version.identifier);
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
