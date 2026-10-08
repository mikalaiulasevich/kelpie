import { isError, isNull } from 'es-toolkit/predicate';
import { createClient } from '@libsql/client';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import {
  chmod,
  constants,
  copyFile,
  link,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  stat,
} from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { applicationDirectory } from '../application/application-directory.js';
import { MigrationHistory } from './migration-history.js';
import { DatabaseBackupMessages } from './database-backup-messages.js';
import { DatabaseBackupPolicy } from './database-backup-policy.js';
import type { DatabaseBackupReport, DatabaseBackupRequest } from './database-backup-types.js';

const BackupFiles = {
  async source(path: string): Promise<void> {
    if (!isAbsolute(path) || !(await lstat(path)).isFile()) {
      throw new Error(DatabaseBackupMessages.InvalidSource);
    }
  },

  async destination(path: string): Promise<void> {
    if (!isAbsolute(path)) {
      throw new Error(DatabaseBackupMessages.InvalidArguments);
    }

    try {
      await lstat(path);
    } catch (error) {
      if (isError(error) && 'code' in error && error.code === 'ENOENT') {
        return;
      }

      throw error;
    }

    throw new Error(DatabaseBackupMessages.ExistingDestination);
  },

  async checksum(path: string): Promise<string> {
    const checksum = createHash(DatabaseBackupPolicy.ChecksumAlgorithm);

    for await (const chunk of createReadStream(path)) {
      checksum.update(chunk);
    }

    return checksum.digest('hex');
  },
} as const;

export const DatabaseBackups = {
  async validate(path: string): Promise<DatabaseBackupReport> {
    await BackupFiles.source(path);
    const client = createClient({ url: pathToFileURL(path).href, intMode: 'bigint' });

    try {
      const integrity = await client.execute(DatabaseBackupPolicy.Integrity);
      const foreignKeys = await client.execute(DatabaseBackupPolicy.ForeignKeys);
      const ledger = await client.execute(DatabaseBackupPolicy.Ledger);
      const migrations = [...(await MigrationHistory.expected())].sort();

      if (
        integrity.rows.length !== 1 ||
        integrity.rows[0]?.[0] !== 'ok' ||
        foreignKeys.rows.length !== 0 ||
        ledger.rows.length !== migrations.length
      ) {
        throw new Error(DatabaseBackupMessages.InvalidDatabase);
      }

      for (const name of migrations) {
        const document = await readFile(
          resolve(applicationDirectory, 'prisma/migrations', name, 'migration.sql'),
        );
        const checksum = createHash(DatabaseBackupPolicy.ChecksumAlgorithm)
          .update(document)
          .digest('hex');
        const records = ledger.rows.filter((row) => row.migration_name === name);

        if (
          records.length !== 1 ||
          records[0]?.checksum !== checksum ||
          isNull(records[0]?.finished_at) ||
          !isNull(records[0]?.rolled_back_at)
        ) {
          throw new Error(DatabaseBackupMessages.InvalidDatabase);
        }
      }

      const schema = await client.execute(DatabaseBackupPolicy.Tables);
      const names = schema.rows.map((row) => String(row.name));

      if (
        names.length !== DatabaseBackupPolicy.ExpectedTables.length ||
        DatabaseBackupPolicy.ExpectedTables.some((name) => !names.includes(name))
      ) {
        throw new Error(DatabaseBackupMessages.InvalidDatabase);
      }

      const tables = [];

      for (const row of schema.rows) {
        const name = String(row.name);
        const quoted = name.replaceAll('"', '""');
        const counts = await client.execute(`SELECT COUNT(*) FROM "${quoted}"`);
        tables.push({ name, rows: String(counts.rows[0]?.[0]) });
      }

      return {
        bytes: (await stat(path)).size,
        sha256: await BackupFiles.checksum(path),
        migrations,
        tables,
      };
    } finally {
      client.close();
    }
  },

  async create(request: DatabaseBackupRequest): Promise<DatabaseBackupReport> {
    return this.transfer(request, true);
  },

  async restore(request: DatabaseBackupRequest): Promise<DatabaseBackupReport> {
    return this.transfer(request, false);
  },

  async transfer(request: DatabaseBackupRequest, snapshot: boolean): Promise<DatabaseBackupReport> {
    await BackupFiles.source(request.sourcePath);
    await BackupFiles.destination(request.destinationPath);
    await mkdir(dirname(request.destinationPath), {
      recursive: true,
      mode: DatabaseBackupPolicy.DirectoryPermissions,
    });
    const directory = await mkdtemp(
      join(dirname(request.destinationPath), DatabaseBackupPolicy.TemporaryPrefix),
    );
    const temporaryPath = join(directory, DatabaseBackupPolicy.SnapshotFilename);

    try {
      if (snapshot) {
        const source = createClient({ url: pathToFileURL(request.sourcePath).href });

        try {
          await source.execute({ sql: 'VACUUM INTO ?', args: [temporaryPath] });
        } finally {
          source.close();
        }
      } else {
        await this.validate(request.sourcePath);
        await copyFile(request.sourcePath, temporaryPath, constants.COPYFILE_EXCL);
      }

      await chmod(temporaryPath, DatabaseBackupPolicy.FilePermissions);
      const output = await open(temporaryPath, 'r');

      try {
        await output.sync();
      } finally {
        await output.close();
      }

      const report = await this.validate(temporaryPath);
      // The private directory protects secrets before publication. EXCL handles destination races.
      await link(temporaryPath, request.destinationPath);
      await rm(directory, { recursive: true, force: true });

      return report;
    } catch (error) {
      try {
        await rm(directory, { recursive: true, force: true });
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], DatabaseBackupMessages.CleanupFailed, {
          cause: cleanupError,
        });
      }

      throw error;
    }
  },
} as const;
