import { SQLitePolicy } from './sqlite-policy.js';

// Only trusted application policy is interpolated into connection statements.
export const SQLiteStatements = {
  MigrationSummary: `
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
  EnableWriteAheadLogging: 'PRAGMA journal_mode = WAL',
  ConfigureBusyTimeout: `PRAGMA busy_timeout = ${SQLitePolicy.BusyTimeoutMilliseconds}`,
  EnableForeignKeys: 'PRAGMA foreign_keys = ON',
  ReadForeignKeys: 'PRAGMA foreign_keys',
} as const;
