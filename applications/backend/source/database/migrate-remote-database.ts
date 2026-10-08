import 'dotenv/config';
import { isUndefined } from 'es-toolkit/predicate';
import { createClient } from '@libsql/client';
import { ApplicationEnvironmentReader } from '../environment/read-application-environment.js';
import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../diagnostics/diagnostic-policy.js';
import { ErrorDiagnostics } from '../diagnostics/error-diagnostics.js';
import { ApplicationPolicy } from '../application/application-policy.js';
import { DatabaseMessages } from './database-messages.js';
import { RemoteDatabaseRequests } from './remote-database-requests.js';
import { RemoteMigrationExecution } from './remote-migration-execution.js';
import { SQLitePolicy } from './sqlite-policy.js';

const RemoteMigrationCommand = {
  async run(): Promise<void> {
    const environment = ApplicationEnvironmentReader.read(process.env);

    if (!environment.databaseUrl.startsWith(SQLitePolicy.RemoteUrlPrefix)) {
      throw new Error(DatabaseMessages.RemoteMigrationRequired);
    }

    const client = createClient({
      url: environment.databaseUrl,
      fetch: RemoteDatabaseRequests.fetchMigration,
      ...(isUndefined(environment.databaseAuthToken)
        ? {}
        : { authToken: environment.databaseAuthToken }),
    });

    const applied = await RemoteMigrationExecution.run(client);
    process.stdout.write(`${JSON.stringify({ appliedMigrations: applied })}\n`);
  },
} as const;

try {
  await RemoteMigrationCommand.run();
} catch (error) {
  Diagnostics.write({
    event: DiagnosticEvents.ApplicationFailed,
    message: DatabaseMessages.RemoteMigrationFailed,
    error: ErrorDiagnostics.describe(error),
  });
  process.exitCode = ApplicationPolicy.FailureExitCode;
}
