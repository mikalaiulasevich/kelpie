import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { isUndefined } from 'es-toolkit/predicate';

import type { DatabaseAdapter } from './database-types.js';
import { RemoteDatabaseRequests } from './remote-database-requests.js';
import { SQLitePolicy } from './sqlite-policy.js';

export const DatabaseAdapters = {
  create(url: string, authToken?: string): DatabaseAdapter {
    if (!url.startsWith(SQLitePolicy.RemoteUrlPrefix) && isUndefined(process.versions.bun)) {
      return new PrismaBetterSqlite3({ url });
    }

    return new PrismaLibSql({
      url,
      ...(url.startsWith(SQLitePolicy.RemoteUrlPrefix)
        ? { fetch: RemoteDatabaseRequests.fetch }
        : {}),
      ...(isUndefined(authToken) ? {} : { authToken }),
      timeout: SQLitePolicy.BusyTimeoutMilliseconds,
    });
  },
} as const;
