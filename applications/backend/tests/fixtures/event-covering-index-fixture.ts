import { readFile } from 'node:fs/promises';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { DatabaseRecords } from './database-records.js';

export const EventCoveringIndexFixture = {
  async prepare(database: PrismaClient) {
    // Reproduce the prior schema inside an isolated migrated fixture, then migrate populated rows.
    await database.$executeRawUnsafe(
      'DROP INDEX "Event_sessionIdentifier_name_source_serverTimestamp_stepIdentifier_idx"',
    );
    const records = await DatabaseRecords.createSession(database);
    await database.event.createMany({
      data: [
        { ...records.eventData, serverTimestamp: new Date('2026-01-01T00:00:01.000Z') },
        {
          ...records.eventData,
          identifier: 'legacy-view',
          name: 'step_viewed',
          source: 'client',
          stepIdentifier: 'welcome',
          serverTimestamp: new Date('2026-01-01T00:00:02.000Z'),
        },
      ],
    });

    return records;
  },

  async migrate(database: PrismaClient): Promise<void> {
    const statement = await readFile(
      new URL(
        '../../prisma/migrations/20261008000500_event_analytics_covering_index/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    await database.$executeRawUnsafe(statement);
  },

  async indexes(database: PrismaClient): Promise<unknown[]> {
    return database.$queryRawUnsafe('PRAGMA index_list("Event")');
  },
} as const;
