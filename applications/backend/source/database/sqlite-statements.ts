import { SQLitePolicy } from './sqlite-policy.js';

// Only trusted application policy is interpolated into connection statements.
export const SQLiteStatements = {
  EnableWriteAheadLogging: 'PRAGMA journal_mode = WAL',
  ConfigureBusyTimeout: `PRAGMA busy_timeout = ${SQLitePolicy.BusyTimeoutMilliseconds}`,
  EnableForeignKeys: 'PRAGMA foreign_keys = ON',
  ReadForeignKeys: 'PRAGMA foreign_keys',
} as const;
