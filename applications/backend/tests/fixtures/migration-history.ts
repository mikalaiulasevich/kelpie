import type { DatabaseService } from '../../source/database/database.service.js';

export const MigrationFixtures = {
  async insertFailedAttempt(database: DatabaseService['client']): Promise<void> {
    await database.$executeRaw`
      INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name")
      VALUES ('failed-migration', 'test-checksum', 'failed_migration')
    `;
  },

  async removeFailedAttempt(database: DatabaseService['client']): Promise<void> {
    await database.$executeRaw`DELETE FROM "_prisma_migrations" WHERE "id" = 'failed-migration'`;
  },

  async clearHistory(database: DatabaseService['client']): Promise<void> {
    await database.$executeRaw`DELETE FROM "_prisma_migrations"`;
  },

  completed: {
    migration_name: 'initial',
    successful: 1n,
    unresolved: 0n,
  },
} as const;
