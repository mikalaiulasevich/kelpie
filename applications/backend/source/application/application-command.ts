import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DatabaseService } from '../database/database.service.js';
import type { ApplicationCommandMessages } from './application-command-types.js';

const ApplicationCommandExecution = {
  async execute<Result>(
    application: NestFastifyApplication,
    operation: () => Promise<Result>,
    messages: ApplicationCommandMessages,
  ): Promise<Result> {
    try {
      await application.init();

      if (!(await application.get(DatabaseService).checkReadiness())) {
        throw new Error(messages.DatabaseNotReady);
      }

      return await operation();
    } catch (error) {
      try {
        await application.close();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], messages.CleanupFailed, {
          cause: cleanupError,
        });
      }

      throw error;
    }
  },
} as const;

export const ApplicationCommand = {
  async run<Result>(
    application: NestFastifyApplication,
    operation: () => Promise<Result>,
    messages: ApplicationCommandMessages,
  ): Promise<Result> {
    const result = await ApplicationCommandExecution.execute(application, operation, messages);

    // A failed close must not be retried or reported as a failed operation.
    await application.close();

    return result;
  },
} as const;
