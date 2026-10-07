import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { isUndefined } from 'es-toolkit/predicate';

import type { DatabaseAdapter } from './database-types.js';
import { SQLitePolicy } from './sqlite-policy.js';

export const DatabaseAdapters = {
  create(url: string): DatabaseAdapter {
    if (isUndefined(process.versions.bun)) {
      return new PrismaBetterSqlite3({ url });
    }

    return new PrismaLibSql({ url, timeout: SQLitePolicy.BusyTimeoutMilliseconds });
  },
} as const;
