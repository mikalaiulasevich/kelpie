import { isUndefined } from 'es-toolkit/predicate';
import { ApplicationFactory } from '../application/create-application.js';
import { ApplicationCommand } from '../application/application-command.js';
import { ConfigurationFile } from './configuration-file.js';
import { ConfigurationCommandMessages } from './configuration-command-messages.js';
import { ConfigurationImportService } from './configuration-import.service.js';

export const ConfigurationImportCommand = {
  async run(argumentsList: ReadonlyList<string>): Promise<void> {
    const [path] = argumentsList;

    if (argumentsList.length !== 1 || isUndefined(path)) {
      throw new Error(ConfigurationCommandMessages.Usage);
    }

    const document = await ConfigurationFile.read(path);
    const application = await ApplicationFactory.create();

    const result = await ApplicationCommand.run(
      application,
      () => application.get(ConfigurationImportService).import(document),
      ConfigurationCommandMessages,
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
  },
} as const;
