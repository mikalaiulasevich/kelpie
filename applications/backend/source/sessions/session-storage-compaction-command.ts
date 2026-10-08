import { isUndefined } from 'es-toolkit/predicate';
import { ApplicationCommand } from '../application/application-command.js';
import { ApplicationFactory } from '../application/create-application.js';
import { ApplicationEnvironmentReader } from '../environment/read-application-environment.js';
import { DatabaseService } from '../database/database.service.js';
import { SessionStorageCompaction } from './session-storage-compaction.js';
import { SessionStorageCompactionPolicy } from './session-storage-compaction-policy.js';
import { SessionStorageCompactionMessages } from './session-storage-compaction-messages.js';
import type { SessionStorageCompactionOptions } from './session-storage-compaction-types.js';

export const SessionStorageCompactionCommand = {
  options(argumentsList: ReadonlyList<string>): SessionStorageCompactionOptions {
    const values = new Map<string, string>();

    for (const argument of argumentsList) {
      const separator = argument.indexOf('=');
      const key = separator < 0 ? argument : argument.slice(0, separator);
      const value = separator < 0 ? '' : argument.slice(separator + 1);

      if (
        values.has(key) ||
        ![
          '--apply',
          '--batch-size',
          '--maximum-records',
          '--after-session',
          '--after-operation-session',
          '--after-operation',
        ].includes(key) ||
        (key === '--apply' && separator >= 0) ||
        (key !== '--apply' && value === '')
      ) {
        throw new Error(SessionStorageCompactionMessages.InvalidOptions);
      }

      values.set(key, value);
    }

    const operationSession = values.get('--after-operation-session');
    const operationIdentifier = values.get('--after-operation');

    if (isUndefined(operationSession) !== isUndefined(operationIdentifier)) {
      throw new Error(SessionStorageCompactionMessages.InvalidOptions);
    }

    const options: SessionStorageCompactionOptions = {
      apply: values.has('--apply'),
      batchSize: Number(
        values.get('--batch-size') ?? SessionStorageCompactionPolicy.DefaultBatchSize,
      ),
      maximumRecords: Number(
        values.get('--maximum-records') ?? SessionStorageCompactionPolicy.DefaultMaximumRecords,
      ),
      sessionCursor: values.get('--after-session'),
      operationCursor:
        isUndefined(operationSession) || isUndefined(operationIdentifier)
          ? undefined
          : { sessionIdentifier: operationSession, operationIdentifier },
    };
    SessionStorageCompaction.validate(options);

    return options;
  },

  async run(
    argumentsList: ReadonlyList<string> = process.argv.slice(2),
    environment: NodeJS.ProcessEnv = process.env,
  ): Promise<void> {
    const options = SessionStorageCompactionCommand.options(argumentsList);
    const application = await ApplicationFactory.create(
      ApplicationEnvironmentReader.read(environment),
    );
    const result = await ApplicationCommand.run(
      application,
      () => SessionStorageCompaction.run(application.get(DatabaseService).client, options),
      SessionStorageCompactionMessages,
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
  },
} as const;
