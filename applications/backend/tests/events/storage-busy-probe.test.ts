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
    database.exec('BEGIN IMMEDIATE');
    try {
      await backend.database.applicationSecret.create({ data: { identifier: 'probe', value: 'probe' } });
    } catch (error) {
      console.log(inspect(error, { depth: 10, showHidden: true }));
    }
  } finally {
    database.exec('ROLLBACK');
    database.close();
    await backend.close();
  }
});
