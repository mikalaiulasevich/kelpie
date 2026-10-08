import { describe, expect, it } from 'vitest';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../../generated/prisma/client.js';
import { RemoteMigrations } from '../../source/database/remote-migrations.js';
import { RemoteMigrationDatabase } from '../fixtures/remote-migration-database.js';

describe('Remote migration SQL and ledger contract with real libSQL', () => {
  it('applies all historical migrations atomically and resumes without duplicates', async () => {
    const database = await RemoteMigrationDatabase.create();

    try {
      expect(await RemoteMigrations.apply(database.client)).toBe(9);
      expect(await RemoteMigrations.apply(database.client)).toBe(0);
      const history = await database.client.execute(
        'SELECT count(*) AS total FROM _prisma_migrations',
      );
      expect(history.rows[0]?.total).toBe(9);
      const client = new PrismaClient({ adapter: new PrismaLibSql({ url: database.url }) });

      try {
        await client.applicationSecret.create({
          data: { identifier: 'round-trip', value: 'test' },
        });
        expect(await client.applicationSecret.count()).toBe(1);
      } finally {
        await client.$disconnect();
      }
    } finally {
      await database.close();
    }
  });

  it('fails closed on changed checksums and unknown migrations', async () => {
    const database = await RemoteMigrationDatabase.create();

    try {
      await RemoteMigrations.apply(database.client);
      await database.client.execute(
        "UPDATE _prisma_migrations SET checksum = 'tampered' WHERE migration_name = '20261006000100_initial_foundation'",
      );
      await expect(RemoteMigrations.apply(database.client)).rejects.toThrow('checksum differs');
      await database.client.execute(
        "UPDATE _prisma_migrations SET migration_name = 'future_migration'",
      );
      await expect(RemoteMigrations.apply(database.client)).rejects.toThrow(
        'absent from this release',
      );
    } finally {
      await database.close();
    }
  });

  it('rolls back an entire failing migration and leaves no success ledger record', async () => {
    const database = await RemoteMigrationDatabase.create();

    try {
      // Conflict late in the first migration: preceding CREATE TABLE statements must roll back.
      await database.client.execute('CREATE TABLE Administrator (identifier TEXT PRIMARY KEY)');
      await expect(RemoteMigrations.apply(database.client)).rejects.toThrow();
      const tables = await database.client.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Funnel'",
      );
      expect(tables.rows).toHaveLength(0);
      const history = await database.client.execute('SELECT * FROM _prisma_migrations');
      expect(history.rows).toHaveLength(0);
      await database.client.execute('DROP TABLE Administrator');
      expect(await RemoteMigrations.apply(database.client)).toBe(9);
    } finally {
      await database.close();
    }
  });

  it('rejects unfinished or noncontiguous migration history before changing schema', async () => {
    const database = await RemoteMigrationDatabase.create();

    try {
      await RemoteMigrations.apply(database.client);
      await database.client.execute(
        "UPDATE _prisma_migrations SET finished_at = NULL WHERE migration_name = '20261006000100_initial_foundation'",
      );
      await expect(RemoteMigrations.apply(database.client)).rejects.toThrow('checksum differs');
      await database.client.execute(
        "DELETE FROM _prisma_migrations WHERE migration_name = '20261006000100_initial_foundation'",
      );
      await expect(RemoteMigrations.apply(database.client)).rejects.toThrow('checksum differs');
      const history = await database.client.execute('SELECT * FROM _prisma_migrations');
      expect(history.rows).toHaveLength(8);
    } finally {
      await database.close();
    }
  });

  it('rolls back pending schema changes when existing data violates foreign keys', async () => {
    const database = await RemoteMigrationDatabase.create();

    try {
      await RemoteMigrations.apply(database.client);
      await database.client.execute('ALTER TABLE ExperimentPlan DROP COLUMN conversionWindowHours');
      await database.client.execute(
        "DELETE FROM _prisma_migrations WHERE migration_name = '20261008000400_experiment_conversion_window'",
      );
      await database.client.execute('PRAGMA foreign_keys = OFF');
      await database.client.execute(
        "INSERT INTO AdministratorSession (identifier, accessTokenHash, administratorIdentifier, expiresAt) VALUES ('orphan', 'hash', 'missing', 0)",
      );
      await database.client.execute('PRAGMA foreign_keys = ON');
      await expect(RemoteMigrations.apply(database.client)).rejects.toThrow(
        'foreign key violations',
      );
      const columns = await database.client.execute('PRAGMA table_info(ExperimentPlan)');
      expect(columns.rows.map((row) => row.name)).not.toContain('conversionWindowHours');
      const history = await database.client.execute('SELECT * FROM _prisma_migrations');
      expect(history.rows).toHaveLength(8);
      await database.client.execute("DELETE FROM AdministratorSession WHERE identifier = 'orphan'");
      expect(await RemoteMigrations.apply(database.client)).toBe(1);
    } finally {
      await database.close();
    }
  });
});
