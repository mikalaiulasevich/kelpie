import { ApplicationEnvironmentReader } from '../environment/read-application-environment.js';
import { ApplicationFactory } from '../application/create-application.js';
import { ApplicationCommand } from '../application/application-command.js';
import { AdministrationBootstrapService } from './administration-bootstrap.service.js';
import { AdministrationBootstrapMessages } from './administration-bootstrap-messages.js';
import { AdministrationCommandPolicy } from './administration-command-policy.js';

export const AdministrationBootstrapCommand = {
  async run(environment: NodeJS.ProcessEnv = process.env): Promise<void> {
    const application = await ApplicationFactory.create(
      ApplicationEnvironmentReader.read(environment),
    );
    const result = await ApplicationCommand.run(
      application,
      () =>
        application
          .get(AdministrationBootstrapService)
          .initialize(
            environment[AdministrationCommandPolicy.UsernameEnvironmentField],
            environment[AdministrationCommandPolicy.PasswordEnvironmentField],
          ),
      AdministrationBootstrapMessages,
    );
    process.stdout.write(`${JSON.stringify(result)}\n`);
  },
} as const;
