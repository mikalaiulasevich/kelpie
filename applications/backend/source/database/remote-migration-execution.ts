import type { Client } from '@libsql/client';
import { DatabaseMessages } from './database-messages.js';
import { RemoteMigrations } from './remote-migrations.js';

const MigrationExecution = {
  async apply(client: Client): Promise<number> {
    try {
      return await RemoteMigrations.apply(client);
    } catch (error) {
      try {
        client.close();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          DatabaseMessages.RemoteMigrationClientCleanupFailed,
          { cause: cleanupError },
        );
      }

      throw error;
    }
  },
} as const;

export const RemoteMigrationExecution = {
  async run(client: Client): Promise<number> {
    const applied = await MigrationExecution.apply(client);
    // A failed successful-run cleanup is reported once, never retried as an application failure.
    client.close();

    return applied;
  },
} as const;
