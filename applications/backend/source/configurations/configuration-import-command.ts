import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { isUndefined } from 'es-toolkit/predicate';
import { ApplicationFactory } from '../application/create-application.js';
import { DatabaseService } from '../database/database.service.js';
import { ConfigurationFile } from './configuration-file.js';
import { ConfigurationCommandMessages } from './configuration-command-messages.js';
import { ConfigurationImportService } from './configuration-import.service.js';

const ConfigurationApplicationImport = {
  async execute(application: NestFastifyApplication, document: unknown) {
    try {
      await application.init();

      if (!(await application.get(DatabaseService).checkReadiness())) {
        throw new Error(ConfigurationCommandMessages.DatabaseNotReady);
      }

      return await application.get(ConfigurationImportService).import(document);
    } catch (error) {
      try {
        await application.close();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          ConfigurationCommandMessages.CleanupFailed,
          {
            cause: cleanupError,
          },
        );
      }

      throw error;
    }
  },
} as const;

export const ConfigurationImportCommand = {
  async run(argumentsList: ReadonlyList<string>): Promise<void> {
    const [path] = argumentsList;

    if (argumentsList.length !== 1 || isUndefined(path)) {
      throw new Error(ConfigurationCommandMessages.Usage);
    }

    const document = await ConfigurationFile.read(path);
    const application = await ApplicationFactory.create();

    const result = await ConfigurationApplicationImport.execute(application, document);
    await application.close();
    console.info(JSON.stringify(result));
  },
} as const;
