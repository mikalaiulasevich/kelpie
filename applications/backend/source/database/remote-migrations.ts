import { isNull } from 'es-toolkit/predicate';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Client, Transaction } from '@libsql/client';
import { applicationDirectory } from '../application/application-directory.js';
import { DatabasePaths } from './database-paths.js';
import { DatabaseMessages } from './database-messages.js';
import { MigrationHistory } from './migration-history.js';
import { RemoteMigrationPolicy } from './remote-migration-policy.js';
import { RemoteMigrationStatements } from './remote-migration-statements.js';
import type { RemoteMigrationDocument } from './database-types.js';

const RemoteMigrationDocuments = {
  async read(name: string): Promise<RemoteMigrationDocument> {
    const sql = await readFile(
      resolve(
        applicationDirectory,
        DatabasePaths.Migrations,
        name,
        RemoteMigrationPolicy.MigrationFilename,
      ),
      'utf8',
    );
    const checksum = createHash(RemoteMigrationPolicy.ChecksumAlgorithm)
      .update(sql)
      .digest(RemoteMigrationPolicy.ChecksumEncoding);
    const statement = sql.replace(RemoteMigrationPolicy.TransactionWrapper, '');
    // Fail closed if a later migration introduces unsupported transaction control.
    const uncommented = statement.replace(/--[^\n]*/g, '');

    if (RemoteMigrationPolicy.ForbiddenControl.test(uncommented)) {
      throw new Error(DatabaseMessages.UnsupportedMigrationControl);
    }

    return { name, checksum, statement };
  },
} as const;

const RemoteMigrationTransaction = {
  async apply(
    transaction: Transaction,
    migration: RemoteMigrationDocument,
    expected: ReadonlyMap<string, RemoteMigrationDocument>,
  ): Promise<boolean> {
    const history = await transaction.execute(RemoteMigrationStatements.ReadLedger);

    const completed = new Set<string>();

    for (const row of history.rows) {
      const name = String(row.migration_name);
      const document = expected.get(name);

      if (!document) {
        throw new Error(DatabaseMessages.UnknownRemoteMigration);
      }

      if (!isNull(row.rolled_back_at)) {
        continue;
      }

      if (completed.has(name) || row.checksum !== document.checksum || isNull(row.finished_at)) {
        throw new Error(DatabaseMessages.RemoteMigrationMismatch);
      }

      completed.add(name);
    }

    const appliedNames = [...expected.keys()].slice(0, completed.size);

    if (appliedNames.some((name) => !completed.has(name))) {
      throw new Error(DatabaseMessages.RemoteMigrationMismatch);
    }

    if (completed.has(migration.name)) {
      return false;
    }

    await transaction.execute(RemoteMigrationStatements.DeferForeignKeys);

    if (migration.statement.trim()) {
      await transaction.executeMultiple(migration.statement);
    }

    const violations = await transaction.execute(RemoteMigrationStatements.CheckForeignKeys);

    if (violations.rows.length > 0) {
      throw new Error(DatabaseMessages.RemoteMigrationForeignKeys);
    }

    await transaction.execute({
      sql: RemoteMigrationStatements.RecordMigration,
      args: [randomUUID(), migration.checksum, migration.name],
    });

    return true;
  },

  async run(
    client: Client,
    migration: RemoteMigrationDocument,
    expected: ReadonlyMap<string, RemoteMigrationDocument>,
  ): Promise<boolean> {
    const transaction = await client.transaction('write');

    try {
      const applied = await RemoteMigrationTransaction.apply(transaction, migration, expected);
      await transaction.commit();

      return applied;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          DatabaseMessages.RemoteMigrationCleanupFailed,
          { cause: cleanupError },
        );
      }

      throw error;
    } finally {
      transaction.close();
    }
  },
} as const;

export const RemoteMigrations = {
  async apply(client: Client): Promise<number> {
    const names = [...(await MigrationHistory.expected())].sort();
    // Validate all checked-in scripts before modifying any database schema.
    const migrations = await Promise.all(names.map((name) => RemoteMigrationDocuments.read(name)));
    const expected = new Map(migrations.map((migration) => [migration.name, migration]));
    await client.execute(RemoteMigrationStatements.CreateLedger);
    let applied = 0;

    for (const migration of migrations) {
      if (await RemoteMigrationTransaction.run(client, migration, expected)) {
        applied += 1;
      }
    }

    return applied;
  },
} as const;
