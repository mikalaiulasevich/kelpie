import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { ApplicationEnvironmentService } from '../../source/environment/application-environment.js';
import type { BackendApplicationFixture } from './backend-application.js';

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
      await once(child.stdout, 'data');
      await backend.database.$queryRawUnsafe(WriterLockPolicy.ShortBusyTimeout);

      return await operation();
    } finally {
      child.stdin.end();
      await exited;
    }
  },
} as const;
