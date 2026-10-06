import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applicationDirectory } from '../application-directory.js';
import { DatabaseMessages } from './database-messages.js';

export interface MigrationSummary {
  readonly migration_name: string;
  readonly successful: bigint;
  readonly unresolved: bigint;
}

export const MigrationHistory = {
  summaryQuery: `
    SELECT
      "migration_name",
      SUM(CASE
        WHEN "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL THEN 1
        ELSE 0
      END) AS "successful",
      SUM(CASE
        WHEN "finished_at" IS NULL AND "rolled_back_at" IS NULL THEN 1
        ELSE 0
      END) AS "unresolved"
    FROM "_prisma_migrations"
    GROUP BY "migration_name"
  `,

  async expected(): Promise<ReadonlyList<string>> {
    const entries = await readdir(resolve(applicationDirectory, 'prisma/migrations'), {
      withFileTypes: true,
    });
    const migrations = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    if (migrations.length === 0) {
      throw new Error(DatabaseMessages.MigrationHistoryUnavailable);
    }

    return migrations;
  },

  isComplete(expected: ReadonlyList<string>, migrations: ReadonlyList<MigrationSummary>): boolean {
    if (migrations.some((migration) => migration.unresolved > 0n)) {
      return false;
    }

    const successful = new Set(
      migrations
        .filter((migration) => migration.successful > 0n)
        .map((migration) => migration.migration_name),
    );

    return expected.every((migration) => successful.has(migration));
  },
} as const;
