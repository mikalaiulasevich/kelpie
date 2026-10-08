import { isUndefined } from 'es-toolkit/predicate';
import { isAbsolute } from 'node:path';
import { DatabaseBackups } from './database-backups.js';
import { DatabaseBackupMessages } from './database-backup-messages.js';

export const DatabaseBackupCommand = {
  async run(argumentsList: ReadonlyList<string>, restore: boolean): Promise<void> {
    const source = argumentsList
      .find((value) => value.startsWith('--source='))
      ?.slice('--source='.length);
    const destination = argumentsList
      .find((value) => value.startsWith('--destination='))
      ?.slice('--destination='.length);

    if (
      argumentsList.length !== 2 ||
      isUndefined(source) ||
      isUndefined(destination) ||
      !isAbsolute(source) ||
      !isAbsolute(destination)
    ) {
      throw new Error(DatabaseBackupMessages.InvalidArguments);
    }

    const request = { sourcePath: source, destinationPath: destination };
    const report = restore
      ? await DatabaseBackups.restore(request)
      : await DatabaseBackups.create(request);
    process.stdout.write(`${JSON.stringify(report)}\n`);
  },
} as const;
