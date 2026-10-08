export const RemoteMigrationStatements = {
  CreateLedger: `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`,
  ReadLedger:
    'SELECT "migration_name", "checksum", "finished_at", "rolled_back_at" FROM "_prisma_migrations"',
  DeferForeignKeys: 'PRAGMA defer_foreign_keys = ON',
  CheckForeignKeys: 'PRAGMA foreign_key_check',
  RecordMigration: `INSERT INTO "_prisma_migrations"
    ("id", "checksum", "migration_name", "finished_at", "applied_steps_count")
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)`,
} as const;
