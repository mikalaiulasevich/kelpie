import { createClient, type Client } from '@libsql/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const RemoteMigrationDatabase = {
  async restoreBeforeConversionWindow(client: Client): Promise<void> {
    // Remove both trailing migrations so the ledger remains a contiguous historical prefix.
    await client.batch(
      [
        'DROP INDEX "Event_sessionIdentifier_name_source_serverTimestamp_stepIdentifier_idx"',
        'ALTER TABLE ExperimentPlan DROP COLUMN conversionWindowHours',
        "DELETE FROM _prisma_migrations WHERE migration_name IN ('20261008000400_experiment_conversion_window', '20261008000500_event_analytics_covering_index')",
      ],
      'write',
    );
  },

  async create() {
    const directory = await mkdtemp(join(tmpdir(), 'kelpie-libsql-migration-'));
    const url = `file:${join(directory, 'database.sqlite')}`;
    const client = createClient({ url });

    return {
      client,
      url,
      async close() {
        client.close();
        await rm(directory, { recursive: true, force: true });
      },
    };
  },
} as const;
