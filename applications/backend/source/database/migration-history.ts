import { isSubset } from 'es-toolkit/array';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applicationDirectory } from '../application/application-directory.js';
import { DatabasePaths } from './database-paths.js';
import { DatabaseMessages } from './database-messages.js';

import type { MigrationSummary } from './database-types.js';

export const MigrationHistory = {
  async expected(): Promise<ReadonlyList<string>> {
    const entries = await readdir(resolve(applicationDirectory, DatabasePaths.Migrations), {
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

    const successful = migrations
      .filter((migration) => migration.successful > 0n)
      .map((migration) => migration.migration_name);

    return isSubset(successful, expected);
  },
} as const;
