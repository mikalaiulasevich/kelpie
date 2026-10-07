import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { SQLiteStatements } from '../../source/database/sqlite-statements.js';
import { BackendTestPolicy } from './backend-test-policy.js';
import { ApplicationEnvironmentService } from '../../source/environment/application-environment.js';
import type { BackendApplicationFixture } from './backend-application.js';

const WriterLockMessages = {
  NotReady: 'The database writer process exited before acquiring the lock.',
} as const;

const WriterLockPolicy = {
  Script: `import { DatabaseSync } from 'node:sqlite';
const database = new DatabaseSync(process.argv[1]);
database.exec('BEGIN IMMEDIATE');
process.stdout.write('ready');
process.stdin.resume();
process.stdin.on('end', () => { database.exec('ROLLBACK'); database.close(); });`,
  ShortBusyTimeout: 'PRAGMA busy_timeout=1',
  FilePrefixLength: 'file:'.length,
} as const;

export const DatabaseWriterLock = {
  async run<Result>(
    backend: BackendApplicationFixture,
    operation: () => Promise<Result>,
  ): Promise<Result> {
    const url = backend.getService(ApplicationEnvironmentService).values.databaseUrl;
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        WriterLockPolicy.Script,
        url.slice(WriterLockPolicy.FilePrefixLength),
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const exited = once(child, 'exit');

    try {
      await Promise.race([
        once(child.stdout, 'data', {
          signal: AbortSignal.timeout(BackendTestPolicy.TimeoutMilliseconds),
        }),
        exited.then(() => {
          throw new Error(WriterLockMessages.NotReady);
        }),
      ]);
      await backend.database.$queryRawUnsafe(WriterLockPolicy.ShortBusyTimeout);

      return await operation();
    } finally {
      child.stdin.end();
      await exited;
      await backend.database.$queryRawUnsafe(SQLiteStatements.ConfigureBusyTimeout);
    }
  },
} as const;
