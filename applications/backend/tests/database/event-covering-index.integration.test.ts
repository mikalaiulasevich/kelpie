import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { EventCoveringIndexFixture } from '../fixtures/event-covering-index-fixture.js';
import { EventCoveringIndexCases } from '../cases/event-covering-index-cases.js';
import { AnalyticsFixture } from '../fixtures/analytics-fixture.js';

describe('covering analytics event index migration', () => {
  let backend: BackendApplicationFixture;

  beforeEach(async () => {
    backend = await BackendApplicationFixture.create();
  });

  afterEach(async () => {
    await backend?.close();
  });

  it('adds the exact covering columns without modifying historical records or existing indexes', async () => {
    await EventCoveringIndexFixture.prepare(backend.database);
    const events = await backend.database.event.findMany({ orderBy: { identifier: 'asc' } });
    const sessions = await backend.database.session.findMany();
    await EventCoveringIndexFixture.migrate(backend.database);

    expect(await backend.database.event.findMany({ orderBy: { identifier: 'asc' } })).toEqual(
      events,
    );
    expect(await backend.database.session.findMany()).toEqual(sessions);
    expect(await EventCoveringIndexFixture.indexes(backend.database)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Event_sessionIdentifier_name_stepIdentifier_idx' }),
        expect.objectContaining({ name: 'Event_name_stepIdentifier_sessionIdentifier_idx' }),
        expect.objectContaining({ name: 'Event_serverTimestamp_idx' }),
        expect.objectContaining({ name: 'sqlite_autoindex_Event_1' }),
      ]),
    );
    expect(
      await backend.database.$queryRawUnsafe(
        'PRAGMA index_info("Event_sessionIdentifier_name_source_serverTimestamp_stepIdentifier_idx")',
      ),
    ).toMatchObject([
      { name: 'sessionIdentifier' },
      { name: 'name' },
      { name: 'source' },
      { name: 'serverTimestamp' },
      { name: 'stepIdentifier' },
    ]);
    expect(await backend.database.$queryRawUnsafe('PRAGMA foreign_key_check')).toEqual([]);
  });

  it('selects covering indexed probes for the actual summary, views, and quality SQL', async () => {
    const { version } = await EventCoveringIndexFixture.prepare(backend.database);
    const statements = EventCoveringIndexCases.forVersion(version.identifier);
    const before = await Promise.all(
      statements.map(({ statement }) => backend.database.$queryRaw(statement)),
    );
    await EventCoveringIndexFixture.migrate(backend.database);

    for (const [index, { name, statement }] of statements.entries()) {
      const rows = await backend.database.$queryRaw<unknown[]>(
        Prisma.sql`EXPLAIN QUERY PLAN ${statement}`,
      );
      const plan = AnalyticsFixture.queryPlan(rows);
      expect(plan, name).toContain(
        'USING COVERING INDEX Event_sessionIdentifier_name_source_serverTimestamp_stepIdentifier_idx',
      );
      expect(plan, name).not.toMatch(/SCAN e\b(?! USING (?:COVERING )?INDEX)/);
      expect(await backend.database.$queryRaw(statement), name).toEqual(before[index]);
    }
  });
});
