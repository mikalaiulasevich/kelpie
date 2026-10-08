export const DatabaseBackupStatements = {
  Integrity: 'PRAGMA integrity_check',
  ForeignKeys: 'PRAGMA foreign_key_check',
  Tables: `SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  Ledger: 'SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations',
  Schema: `SELECT type, name, tbl_name, sql FROM sqlite_schema
    WHERE name NOT LIKE 'sqlite_%' AND tbl_name != '_prisma_migrations' ORDER BY type, name`,
  Snapshot: 'VACUUM INTO ?',

  count(name: string): string {
    const quoted = name.replaceAll('"', '""');

    return `SELECT COUNT(*) FROM "${quoted}"`;
  },
} as const;
