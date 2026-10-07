import { writeFileSync } from 'node:fs';
import { inspect } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { it } from 'vitest';
import { BackendApplicationFixture } from '../fixtures/backend-application.js';
import { ApplicationEnvironmentService } from '../../source/environment/application-environment.js';

it('probe', async () => {
  const backend = await BackendApplicationFixture.create();
  const url = backend.getService(ApplicationEnvironmentService).values.databaseUrl;
  const database = new DatabaseSync(url.slice(5));
  try {
    await backend.database.$queryRawUnsafe('PRAGMA busy_timeout=1');
    writeFileSync('/tmp/kelpie-busy-path.txt', inspect([url, database.prepare('PRAGMA database_list').all(), await backend.database.$queryRawUnsafe('PRAGMA database_list')]));
    database.exec('BEGIN IMMEDIATE');
    try {
      const record = await backend.database.applicationSecret.create({ data: { identifier: 'probe', value: 'probe' } });
      writeFileSync('/tmp/kelpie-busy-success.txt', inspect(record));
    } catch (error) {
      writeFileSync('/tmp/kelpie-busy-error.txt', inspect(error, { depth: 10, showHidden: true }));
    }
  } finally {
    database.exec('ROLLBACK');
    database.close();
    await backend.close();
  }
});
