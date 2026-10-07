import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ApplicationEnvironmentReader } from '../environment/read-application-environment.js';
import { ApplicationFactory } from '../application/create-application.js';
import { DatabaseService } from '../database/database.service.js';
import { AdministrationService } from './administration.service.js';
import { AdministrationCommandMessages } from './administration-command-messages.js';
import { AdministrationCommandPolicy } from './administration-command-policy.js';
import type { AdministratorIdentity } from './administration-types.js';

const ProvisioningApplication = {
  async execute(
    application: NestFastifyApplication,
    username: string,
    password: string,
  ): Promise<AdministratorIdentity> {
    try {
      await application.init();
      if (!(await application.get(DatabaseService).checkReadiness())) {
        throw new Error(AdministrationCommandMessages.DatabaseNotReady);
      }

      return await application.get(AdministrationService).provision(username, password);
    } catch (error) {
      try {
        await application.close();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          AdministrationCommandMessages.CleanupFailed,
          { cause: cleanupError },
        );
      }

      throw error;
    }
  },
} as const;

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
    const identity = await ProvisioningApplication.execute(application, username, password);
    await application.close();
    process.stdout.write(`${JSON.stringify(identity)}\n`);
  },
} as const;
