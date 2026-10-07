import { ApplicationEnvironmentReader } from '../environment/read-application-environment.js';
import { ApplicationFactory } from '../application/create-application.js';
import { ApplicationCommand } from '../application/application-command.js';
import { AdministrationService } from './administration.service.js';
import { AdministrationCommandMessages } from './administration-command-messages.js';
import { AdministrationCommandPolicy } from './administration-command-policy.js';

export const AdministrationProvisionCommand = {
  async run(environment: NodeJS.ProcessEnv = process.env): Promise<void> {
    const username = environment[AdministrationCommandPolicy.UsernameEnvironmentField];
    const password = environment[AdministrationCommandPolicy.PasswordEnvironmentField];

    if (!username || !password) {
      throw new Error(AdministrationCommandMessages.CredentialsRequired);
    }

    const application = await ApplicationFactory.create(
      ApplicationEnvironmentReader.read(environment),
    );
    const identity = await ApplicationCommand.run(
      application,
      () => application.get(AdministrationService).provision(username, password),
      AdministrationCommandMessages,
    );
    process.stdout.write(`${JSON.stringify(identity)}\n`);
  },
} as const;
