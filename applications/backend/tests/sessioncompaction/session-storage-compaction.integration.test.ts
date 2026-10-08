import { isUndefined } from 'es-toolkit/predicate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { SessionStorageCompactionFixture } from '../fixtures/sessioncompaction/session-storage-compaction-fixture.js';
import { SessionStorageCompaction } from '../../source/sessions/session-storage-compaction.js';
import { SessionStorageCompactionCommand } from '../../source/sessions/session-storage-compaction-command.js';
import { SessionSnapshots } from '../../source/sessions/session-snapshots.js';
import { SessionFlowFixture } from '../fixtures/session-flow.js';

describe('operator-controlled historical session snapshot compaction', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
  });

  afterEach(async () => {
    await backend?.close();
  });

  it('measures dry run without changes, compacts batches and preserves exact command replay', async () => {
    const fixture = await SessionStorageCompactionFixture.prepare(backend);
    const before = await SessionStorageCompactionFixture.rows(backend);
    const options = { apply: false, batchSize: 1, maximumRecords: 10 };
    const dryRun = await SessionStorageCompaction.run(backend.database, options);
    expect(await SessionStorageCompactionFixture.rows(backend)).toEqual(before);
    expect(dryRun.operations.converted).toBe(before.operations.length);
    expect(dryRun.sessions.converted).toBe(1);
    expect(dryRun.operations.bytesAfter).toBeLessThan(dryRun.operations.bytesBefore);
    const applied = await SessionStorageCompaction.run(backend.database, {
      ...options,
      apply: true,
    });
    expect(applied.operations.complete).toBe(true);
    expect(applied.sessions.complete).toBe(true);
    expect(
      await SessionFlowFixture.state(
        await fixture.browser.post('/current/continue', fixture.command),
      ),
    ).toEqual(fixture.historical);
    const after = await SessionStorageCompactionFixture.rows(backend);
    expect(after.operations.every((row) => SessionSnapshots.isCompact(row.response))).toBe(true);
    expect(SessionSnapshots.read(after.sessions[0]?.initialState, fixture.owner)).toEqual(
      fixture.initial,
    );
    const repeated = await SessionStorageCompaction.run(backend.database, {
      ...options,
      apply: true,
    });
    expect(repeated.operations.converted).toBe(0);
    expect(repeated.sessions.converted).toBe(0);
    expect(await SessionStorageCompactionFixture.rows(backend)).toEqual(after);
  });

  it('stops at a bounded limit and resumes from stable composite cursors', async () => {
    await SessionStorageCompactionFixture.prepare(backend);
    const first = await SessionStorageCompaction.run(backend.database, {
      apply: true,
      batchSize: 1,
      maximumRecords: 1,
    });
    expect(first.operations.examined).toBe(1);
    expect(first.operations.complete).toBe(false);
    const second = await SessionStorageCompaction.run(backend.database, {
      apply: true,
      batchSize: 1,
      maximumRecords: 10,
      ...(isUndefined(first.operations.cursor) ? {} : { operationCursor: first.operations.cursor }),
      ...(isUndefined(first.sessions.cursor) ? {} : { sessionCursor: first.sessions.cursor }),
    });
    expect(second.operations.complete).toBe(true);
    expect(second.operations.converted).toBe(1);
    expect(second.sessions.examined).toBe(0);
  });

  it('rejects malformed persisted content and rolls back the whole failing batch', async () => {
    await SessionStorageCompactionFixture.prepare(backend);
    const rows = await SessionStorageCompactionFixture.rows(backend);
    const last = rows.operations.at(-1);
    expect(last).toBeDefined();
    if (!last) {
      throw new Error('Missing test operation');
    }

    await backend.database.sessionOperation.update({
      where: {
        sessionIdentifier_operationIdentifier: {
          sessionIdentifier: last.sessionIdentifier,
          operationIdentifier: last.operationIdentifier,
        },
      },
      data: { response: { invalid: true } },
    });
    const before = await SessionStorageCompactionFixture.rows(backend);
    await expect(
      SessionStorageCompaction.run(backend.database, {
        apply: true,
        batchSize: 100,
        maximumRecords: 10,
      }),
    ).rejects.toThrow();
    expect(await SessionStorageCompactionFixture.rows(backend)).toEqual(before);
  });

  it('defaults to dry run and rejects unknown or unbounded command options before startup', () => {
    expect(SessionStorageCompactionCommand.options([]).apply).toBe(false);
    expect(() => SessionStorageCompactionCommand.options(['--batch-size=101'])).toThrow();
    expect(() => SessionStorageCompactionCommand.options(['--after-operation=x'])).toThrow();
    expect(() => SessionStorageCompactionCommand.options(['--apply=yes'])).toThrow();
    expect(() => SessionStorageCompactionCommand.options(['--apply='])).toThrow();
    expect(() => SessionStorageCompactionCommand.options(['--apply', '--apply'])).toThrow();
    expect(() => SessionStorageCompactionCommand.options(['--maximum-records=NaN'])).toThrow();
    expect(() => SessionStorageCompactionCommand.options(['--batch-size=1.5'])).toThrow();
    expect(() => SessionStorageCompactionCommand.options(['--remote-url=x'])).toThrow();
  });
});
